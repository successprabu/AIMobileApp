import React, { useCallback, useMemo, useState } from "react";
import { FlatList, Linking, Pressable, RefreshControl, Share, StyleSheet, View } from "react-native";
import { ActivityIndicator, FAB, Text } from "react-native-paper";
import { useFocusEffect } from "@react-navigation/native";
import { schoolError } from "../../api/school";
import { getSettings, payments as getPayments, schoolAi, studentList } from "../../api/schoolErp";
import { useSchoolAuth } from "../../context/SchoolAuthContext";
import { useAppTheme } from "../../hooks/useAppTheme";
import { Notice, PillButton } from "../../components/ui/AuthUi";
import type { Payment, SchoolSettings, Student } from "../../school/erp";
import { feeTotalFor } from "../../school/reportCalc";
import { pushSchoolScreen } from "../../school/schoolMenu";
import { Chips, SCHOOL_GREEN, day, inr, shareReceiptPdf, todayIso, ui } from "./schoolUi";

type Tab = "Dues" | "Payments";

/** Fees: who still owes (with an AI-drafted WhatsApp reminder), every receipt, and the fee counter. */
export default function FeesScreen() {
  const { school } = useSchoolAuth();
  const sid = school?.user.schoolId ?? "";
  const canCollect = school?.user.role === "superadmin" || !!school?.permissions.includes("fees.collect");
  const { theme } = useAppTheme();
  const c = theme.colors;
  const [tab, setTab] = useState<Tab>("Dues");
  const [settings, setSettings] = useState<SchoolSettings | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [pays, setPays] = useState<Payment[]>([]);
  const [cls, setCls] = useState("All");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [reminder, setReminder] = useState<{ id: string; text: string } | null>(null);
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const [st, l, p] = await Promise.all([getSettings(sid), studentList(sid), getPayments(sid)]);
      setSettings(st.settings);
      setStudents(l);
      setPays(p);
    } catch (e) {
      setError(schoolError(e, "Could not load fees. Pull down to try again."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [sid]);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const dues = useMemo(() => {
    if (!settings) return [];
    const paid = new Map<string, number>();
    for (const p of pays) if (p.academicYear === settings.academicYear) paid.set(p.studentId, (paid.get(p.studentId) ?? 0) + p.amount);
    return students
      .filter((s) => s.status === "Active" && (cls === "All" || s.className === cls))
      .map((s) => {
        const total = feeTotalFor(settings, s);
        const p = paid.get(s.id) ?? 0;
        return { s, total, paid: p, balance: Math.max(0, total - p) };
      })
      .filter((x) => x.balance > 0)
      .sort((a, b) => b.balance - a.balance);
  }, [settings, students, pays, cls]);
  const duesTotal = dues.reduce((t, x) => t + x.balance, 0);
  const today = todayIso();
  const todayTotal = pays.filter((p) => p.date === today).reduce((t, p) => t + p.amount, 0);
  const monthTotal = pays.filter((p) => p.date.startsWith(today.slice(0, 7))).reduce((t, p) => t + p.amount, 0);

  const draft = async (s: Student) => {
    setBusy(s.id);
    try {
      setReminder({ id: s.id, text: (await schoolAi({ task: "fee-reminder", schoolId: sid, studentId: s.id })).text });
    } catch (e) {
      setError(schoolError(e, "Could not draft the reminder."));
    } finally {
      setBusy("");
    }
  };

  if (loading) {
    return (
      <View style={[ui.center, { backgroundColor: c.background }]}>
        <ActivityIndicator color={SCHOOL_GREEN} />
      </View>
    );
  }

  const header = (
    <View style={{ gap: 8, marginBottom: 8 }}>
      {error ? <Notice kind="error" text={error} /> : null}
      <View style={styles.kpis}>
        <View style={[styles.kpi, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={{ fontSize: 18 }}>💵</Text>
          <Text style={{ color: c.text, fontWeight: "800" }}>{inr(todayTotal)}</Text>
          <Text style={{ color: c.textMuted, fontSize: 11 }}>Today · {inr(monthTotal)} month</Text>
        </View>
        <View style={[styles.kpi, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={{ fontSize: 18 }}>⏳</Text>
          <Text style={{ color: c.danger, fontWeight: "800" }}>{inr(duesTotal)}</Text>
          <Text style={{ color: c.textMuted, fontSize: 11 }}>Due · {dues.length} students</Text>
        </View>
      </View>
      <Chips<Tab> items={["Dues", "Payments"]} value={tab} onChange={setTab} color={SCHOOL_GREEN} />
      {tab === "Dues" ? <Chips items={["All", ...(settings?.classes ?? [])]} value={cls} onChange={setCls} color={SCHOOL_GREEN} /> : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      {tab === "Dues" ? (
        <FlatList
          data={dues}
          keyExtractor={(x) => x.s.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 96 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} />}
          ListHeaderComponent={header}
          ListEmptyComponent={<Text style={{ color: c.textMuted, textAlign: "center", marginTop: 24 }}>🎉 No dues here.</Text>}
          renderItem={({ item: x }) => (
            <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Pressable onPress={() => pushSchoolScreen("SchoolStudent", { id: x.s.id })} style={styles.line}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.text, fontWeight: "700" }}>{x.s.name}</Text>
                  <Text style={{ color: c.textMuted, fontSize: 12 }}>
                    {x.s.className} {x.s.section ?? ""} · paid {inr(x.paid)} of {inr(x.total)}
                  </Text>
                </View>
                <Text style={{ color: c.danger, fontWeight: "800" }}>{inr(x.balance)}</Text>
              </Pressable>
              <View style={styles.btns}>
                {canCollect ? <PillButton label="Collect" icon="cash-check" variant="soft" color={SCHOOL_GREEN} onPress={() => pushSchoolScreen("SchoolCollectFee", { studentId: x.s.id })} style={{ flex: 1 }} /> : null}
                <PillButton label="AI reminder" icon="creation" variant="soft" color={SCHOOL_GREEN} onPress={() => void draft(x.s)} loading={busy === x.s.id} disabled={!!busy} style={{ flex: 1 }} />
              </View>
              {reminder?.id === x.s.id ? (
                <View style={[styles.reminder, { borderColor: c.border }]}>
                  <Text style={{ color: c.text, lineHeight: 20 }}>{reminder.text}</Text>
                  <View style={styles.btns}>
                    <PillButton label="WhatsApp" icon="whatsapp" color={SCHOOL_GREEN} onPress={() => void Linking.openURL(`https://wa.me/91${x.s.parentPhone.replace(/\D/g, "").slice(-10)}?text=${encodeURIComponent(reminder.text)}`)} style={{ flex: 1 }} />
                    <PillButton label="Share" icon="share-variant" variant="outline" color={SCHOOL_GREEN} onPress={() => void Share.share({ message: reminder.text })} style={{ flex: 1 }} />
                  </View>
                </View>
              ) : null}
            </View>
          )}
        />
      ) : (
        <FlatList
          data={pays.slice(0, 300)}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 96 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} />}
          ListHeaderComponent={header}
          ListEmptyComponent={<Text style={{ color: c.textMuted, textAlign: "center", marginTop: 24 }}>No payments yet.</Text>}
          renderItem={({ item: p }) => (
            <Pressable
              onPress={() =>
                void shareReceiptPdf({ schoolName: school?.schoolName ?? sid, receiptNo: p.receiptNo, date: day(p.date), studentName: p.studentName, className: p.className, section: p.section, admissionNo: p.admissionNo, academicYear: p.academicYear, head: p.head, amount: p.amount, mode: p.mode, reference: p.reference, collectedBy: p.collectedBy })
              }
              style={[styles.card, styles.line, { backgroundColor: c.surface, borderColor: c.border }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ color: c.text, fontWeight: "700" }}>
                  🧾 {p.studentName} · {p.className} {p.section}
                </Text>
                <Text style={{ color: c.textMuted, fontSize: 12 }}>
                  {p.receiptNo} · {day(p.date)} · {p.mode} · {p.collectedBy}
                </Text>
              </View>
              <Text style={{ color: c.text, fontWeight: "800" }}>{inr(p.amount)}</Text>
            </Pressable>
          )}
        />
      )}
      {canCollect ? <FAB icon="cash-plus" label="Collect fee" color="#fff" style={styles.fab} onPress={() => pushSchoolScreen("SchoolCollectFee", {})} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  kpis: { flexDirection: "row", gap: 10 },
  kpi: { flex: 1, borderWidth: 1, borderRadius: 16, padding: 12 },
  card: { borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 8 },
  line: { flexDirection: "row", alignItems: "center", gap: 8 },
  btns: { flexDirection: "row", gap: 8, marginTop: 8 },
  reminder: { borderTopWidth: 1, marginTop: 10, paddingTop: 10 },
  fab: { position: "absolute", right: 16, bottom: 16, backgroundColor: SCHOOL_GREEN },
});
