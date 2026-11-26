import React, { useEffect, useMemo, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Text, TextInput } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { collectFee, schoolError, studentFees, type SchoolSettings, type SchoolStudent, type StudentFees } from "../../api/school";
import { useSchoolAuth } from "../../context/SchoolAuthContext";
import { useAppTheme } from "../../hooks/useAppTheme";
import { Notice, PillButton } from "../../components/ui/AuthUi";
import { loadSchoolBasics } from "./AttendanceScreen";
import { Chips, Row, SCHOOL_GREEN, Section, day, inr, shareReceiptPdf, ui, type ReceiptInfo } from "./schoolUi";

/** Office: find the child, take the fee, share the receipt PDF on WhatsApp. */
export default function CollectFeeScreen() {
  const { school } = useSchoolAuth();
  const sid = school?.user.schoolId ?? "";
  const { theme } = useAppTheme();
  const c = theme.colors;

  const [settings, setSettings] = useState<SchoolSettings | null>(null);
  const [students, setStudents] = useState<SchoolStudent[]>([]);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<SchoolStudent | null>(null);
  const [detail, setDetail] = useState<StudentFees | null>(null);
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<string | null>(null);
  const [head, setHead] = useState("Fee payment");
  const [ref, setRef] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ kind: "info" | "error" | "success"; text: string } | null>(null);
  const [done, setDone] = useState<ReceiptInfo | null>(null);

  useEffect(() => {
    void loadSchoolBasics(sid)
      .then((b) => {
        setSettings(b.settings);
        setStudents(b.students.filter((s) => s.status === "Active"));
        setMode(b.settings.paymentModes[0] ?? null);
      })
      .catch((e) => setNote({ kind: "error", text: schoolError(e, "Could not load students.") }))
      .finally(() => setLoading(false));
  }, [sid]);

  const found = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (t.length < 2) return [];
    return students
      .filter((s) => s.name.toLowerCase().includes(t) || s.admissionNo.toLowerCase().includes(t) || (s.parentPhone ?? "").includes(t))
      .slice(0, 20);
  }, [q, students]);

  const choose = async (s: SchoolStudent) => {
    setSel(s);
    setDetail(null);
    setDone(null);
    setNote(null);
    setQ("");
    try {
      const d = await studentFees(sid, s.id);
      setDetail(d);
      if (d.fees.balance > 0) setAmount(String(d.fees.balance));
    } catch {
      /* No "students.view" permission: collect without showing the balance. */
    }
  };

  const collect = async () => {
    if (!sel || !mode) return;
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) return setNote({ kind: "error", text: "Enter the amount." });
    setBusy(true);
    setNote(null);
    try {
      const r = await collectFee(sid, { studentId: sel.id, amount: n, mode, head: head.trim() || "Fee payment", reference: ref.trim() });
      const info: ReceiptInfo = {
        schoolName: school?.schoolName ?? sid,
        receiptNo: r.item.receiptNo,
        date: day(r.item.date),
        studentName: sel.name,
        className: sel.className,
        section: sel.section,
        admissionNo: sel.admissionNo,
        academicYear: settings?.academicYear,
        head: r.item.head,
        amount: r.item.amount,
        mode: r.item.mode,
        reference: r.item.reference,
        collectedBy: school?.user.name,
        balance: r.fees.balance,
      };
      setDone(info);
      setDetail((d) => (d ? { ...d, fees: r.fees, payments: [r.item, ...d.payments] } : d));
      setAmount("");
      setRef("");
    } catch (e) {
      setNote({ kind: "error", text: schoolError(e, "Could not save the payment. Check the network and try again.") });
    } finally {
      setBusy(false);
    }
  };

  const whatsappParent = () => {
    if (!done || !sel?.parentPhone) return;
    const msg = `${done.schoolName}\nFee receipt ${done.receiptNo}\n${done.studentName} (${done.className} ${done.section ?? ""})\n${done.head}: ${inr(done.amount)} by ${done.mode} on ${done.date}${done.balance != null ? `\nBalance: ${inr(done.balance)}` : ""}\nThank you!`;
    const phone = sel.parentPhone.replace(/\D/g, "").slice(-10);
    void Linking.openURL(`https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`);
  };

  if (loading) {
    return (
      <View style={[ui.center, { backgroundColor: c.background }]}>
        <ActivityIndicator color={SCHOOL_GREEN} />
      </View>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={ui.wrap} keyboardShouldPersistTaps="handled">
      {note ? <Notice kind={note.kind} text={note.text} /> : null}
      <TextInput
        mode="outlined"
        label="Find student: name, admission no or parent mobile"
        value={q}
        onChangeText={setQ}
        left={<TextInput.Icon icon="magnify" />}
        activeOutlineColor={SCHOOL_GREEN}
        autoCorrect={false}
      />
      {found.map((s) => (
        <Pressable key={s.id} onPress={() => void choose(s)} style={[styles.hit, { borderColor: c.border, backgroundColor: c.surface }]}>
          <Text style={{ color: c.text, fontWeight: "700" }}>{s.name}</Text>
          <Text style={{ color: c.textMuted, fontSize: 12 }}>
            {s.className} {s.section ?? ""} · {s.admissionNo} · {s.parentPhone ?? ""}
          </Text>
        </Pressable>
      ))}

      {sel ? (
        <View style={{ marginTop: 16 }}>
          <Section icon="account-school-outline" title={`${sel.name} · ${sel.className} ${sel.section ?? ""}`}>
            {detail ? (
              <>
                <Row left="Total" right={inr(detail.fees.total)} />
                <Row left="Paid" right={inr(detail.fees.paid)} />
                <Row left="Balance" right={inr(detail.fees.balance)} bold bad={detail.fees.balance > 0} />
              </>
            ) : (
              <Text style={{ color: c.textMuted }}>{sel.admissionNo}</Text>
            )}
          </Section>

          {done ? (
            <Section icon="check-circle" title={`Saved · receipt ${done.receiptNo}`}>
              <Text style={{ color: c.text }}>
                {inr(done.amount)} by {done.mode}. Balance now {inr(done.balance ?? 0)}. The parent gets a notification in the app.
              </Text>
              <PillButton label="Share receipt PDF" icon="file-pdf-box" color={SCHOOL_GREEN} onPress={() => void shareReceiptPdf(done).catch(() => setNote({ kind: "error", text: "Could not make the PDF." }))} style={{ marginTop: 8 }} />
              {sel.parentPhone ? <PillButton label="WhatsApp the parent" icon="whatsapp" variant="soft" color={SCHOOL_GREEN} onPress={whatsappParent} style={{ marginTop: 8 }} /> : null}
            </Section>
          ) : null}

          <TextInput mode="outlined" label="Amount (₹)" value={amount} onChangeText={(v) => setAmount(v.replace(/[^0-9.]/g, ""))} keyboardType="decimal-pad" activeOutlineColor={SCHOOL_GREEN} />
          <Text style={[ui.label, { color: c.text }]}>Paid by</Text>
          <Chips items={settings?.paymentModes ?? []} value={mode} onChange={setMode} color={SCHOOL_GREEN} />
          <TextInput mode="outlined" label="For" value={head} onChangeText={setHead} style={{ marginTop: 10 }} activeOutlineColor={SCHOOL_GREEN} />
          {mode && mode !== "Cash" ? <TextInput mode="outlined" label="UPI / cheque / transaction no (optional)" value={ref} onChangeText={setRef} style={{ marginTop: 10 }} activeOutlineColor={SCHOOL_GREEN} /> : null}
          <PillButton label="Collect fee" icon="cash-check" color={SCHOOL_GREEN} onPress={() => void collect()} loading={busy} disabled={busy} style={{ marginTop: 16 }} />

          {detail?.payments.length ? (
            <Section icon="receipt" title="Earlier receipts">
              {detail.payments.slice(0, 10).map((p) => (
                <Pressable
                  key={p.id}
                  style={styles.receipt}
                  onPress={() =>
                    void shareReceiptPdf({
                      schoolName: school?.schoolName ?? sid,
                      receiptNo: p.receiptNo,
                      date: day(p.date),
                      studentName: sel.name,
                      className: sel.className,
                      section: sel.section,
                      admissionNo: sel.admissionNo,
                      head: p.head,
                      amount: p.amount,
                      mode: p.mode,
                      reference: p.reference,
                    })
                  }
                >
                  <Text style={{ color: c.text, flex: 1 }}>
                    {p.receiptNo} · {day(p.date)} · {p.mode}
                  </Text>
                  <Text style={{ color: c.text, fontWeight: "700" }}>{inr(p.amount)}</Text>
                  <MaterialCommunityIcons name="share-variant" size={18} color={SCHOOL_GREEN} />
                </Pressable>
              ))}
            </Section>
          ) : null}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hit: { borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 8 },
  receipt: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8 },
});
