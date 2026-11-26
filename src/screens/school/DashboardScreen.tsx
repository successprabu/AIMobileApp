import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";
import { schoolError } from "../../api/school";
import { schoolAi, schoolData } from "../../api/schoolErp";
import { useSchoolAuth } from "../../context/SchoolAuthContext";
import { useAppTheme } from "../../hooks/useAppTheme";
import { Notice, PillButton } from "../../components/ui/AuthUi";
import type { SchoolData } from "../../school/erp";
import { computeStudentStats } from "../../school/reportCalc";
import { openSchoolScreen, pushSchoolScreen } from "../../school/schoolMenu";
import { SCHOOL_GREEN, Section, inr, ui } from "./schoolUi";

/** Dashboard: today's attendance, staff present, fees collected and due, enquiries, class strength, who needs attention. */
export default function DashboardScreen() {
  const { school } = useSchoolAuth();
  const sid = school?.user.schoolId ?? "";
  const { theme } = useAppTheme();
  const c = theme.colors;
  const [d, setD] = useState<SchoolData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [ai, setAi] = useState("");
  const [aiBusy, setAiBusy] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      setD(await schoolData(sid));
    } catch (e) {
      setError(schoolError(e, "Could not load the dashboard. Pull down to try again."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [sid]);
  useEffect(() => {
    void load();
  }, [load]);

  const st = useMemo(() => (d ? computeStudentStats(d) : null), [d]);
  const k = useMemo(() => {
    if (!d || !st) return null;
    const month = d.today.slice(0, 7);
    const att = d.attendanceStudents[d.today] ?? {};
    const marked = Object.keys(att).length;
    const present = Object.values(att).filter((v) => v === "P" || v === "H").length;
    const staffToday = d.attendanceStaff[d.today] ?? {};
    return {
      students: st.active.length,
      girls: st.active.filter((s) => s.gender === "Female").length,
      boys: st.active.filter((s) => s.gender === "Male").length,
      attPct: marked ? Math.round((present / marked) * 100) : null,
      marked,
      staffPresent: Object.values(staffToday).filter((v) => v === "P" || v === "H").length,
      staffTotal: d.staff.filter((x) => x.active !== false).length,
      today: d.payments.filter((p) => p.date === d.today).reduce((t, p) => t + p.amount, 0),
      month: d.payments.filter((p) => p.date.startsWith(month)).reduce((t, p) => t + p.amount, 0),
      year: st.paidTotal,
      dues: st.duesTotal,
      feeTotal: st.feeTotal,
      newEnq: d.enquiries.filter((e) => e.status === "New").length,
      admissions: st.active.filter((s) => (s.admissionDate ?? "").startsWith(month)).length,
    };
  }, [d, st]);
  const bars = useMemo(() => {
    if (!d || !st) return [];
    const rows = d.settings.classes.map((cl) => ({ cl, n: st.active.filter((s) => s.className === cl).length })).filter((x) => x.n);
    const max = Math.max(1, ...rows.map((r) => r.n));
    return rows.map((r) => ({ ...r, pct: r.n / max }));
  }, [d, st]);

  const summarise = async () => {
    setAiBusy(true);
    try {
      setAi((await schoolAi({ task: "school-summary", schoolId: sid })).text);
    } catch (e) {
      setAi(schoolError(e, "The assistant is not available right now."));
    } finally {
      setAiBusy(false);
    }
  };

  if (loading) {
    return (
      <View style={[ui.center, { backgroundColor: c.background }]}>
        <ActivityIndicator color={SCHOOL_GREEN} />
      </View>
    );
  }

  const tile = (emoji: string, value: string, label: string, sub?: string, onPress?: () => void, bad?: boolean) => (
    <Pressable key={label} onPress={onPress} disabled={!onPress} style={[styles.tile, { backgroundColor: c.surface, borderColor: c.border }]}>
      <Text style={{ fontSize: 22 }}>{emoji}</Text>
      <Text style={{ color: bad ? c.danger : c.text, fontWeight: "800", fontSize: 18, marginTop: 4 }} numberOfLines={1}>
        {value}
      </Text>
      <Text style={{ color: c.text, fontWeight: "600", fontSize: 12 }}>{label}</Text>
      {sub ? <Text style={{ color: c.textMuted, fontSize: 11 }}>{sub}</Text> : null}
    </Pressable>
  );

  return (
    <ScrollView
      style={{ backgroundColor: c.background }}
      contentContainerStyle={ui.wrap}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} />}
    >
      {error ? <Notice kind="error" text={error} /> : null}
      {k ? (
        <>
          <View style={styles.tiles}>
            {tile("🧑‍🎓", String(k.students), "Students", `${k.boys} boys · ${k.girls} girls`, () => openSchoolScreen("SchoolStudents"))}
            {tile("✅", k.attPct == null ? "—" : `${k.attPct}%`, "Present today", k.marked ? `${k.marked} marked` : "Not marked yet", () => openSchoolScreen("SchoolAttendance"))}
            {tile("👩‍🏫", `${k.staffPresent}/${k.staffTotal}`, "Staff present")}
            {tile("💵", inr(k.today), "Fees today", `${inr(k.month)} this month`, () => openSchoolScreen("SchoolFees"))}
            {tile("⏳", inr(k.dues), "Fees due", `${inr(k.year)} of ${inr(k.feeTotal)} paid`, () => openSchoolScreen("SchoolFees"), k.dues > 0)}
            {tile("📥", String(k.newEnq), "New enquiries", `${k.admissions} admitted this month`, () => openSchoolScreen("SchoolAdmissions"))}
          </View>

          <Section icon="robot-happy-outline" title="✨ AI summary">
            {ai ? <Text style={{ color: c.text, lineHeight: 21 }}>{ai}</Text> : <Text style={{ color: c.textMuted }}>A short summary of the school with this week's priorities.</Text>}
            <PillButton label={ai ? "Summarise again" : "Summarise my school"} icon="creation" variant="soft" color={SCHOOL_GREEN} onPress={() => void summarise()} loading={aiBusy} disabled={aiBusy} style={{ marginTop: 8 }} />
          </Section>

          <Section icon="chart-bar" title="🏫 Students by class">
            {bars.map((b) => (
              <View key={b.cl} style={styles.barRow}>
                <Text style={{ color: c.text, width: 56 }}>{b.cl}</Text>
                <View style={[styles.barTrack, { backgroundColor: c.chipBg }]}>
                  <View style={[styles.barFill, { width: `${Math.max(4, b.pct * 100)}%` }]} />
                </View>
                <Text style={{ color: c.text, width: 34, textAlign: "right", fontWeight: "700" }}>{b.n}</Text>
              </View>
            ))}
          </Section>

          {st?.defaulters.length ? (
            <Section icon="cash" title={`⏳ Highest dues (${st.defaulters.length})`}>
              {st.defaulters.slice(0, 6).map((x) => (
                <Pressable key={x.s.id} onPress={() => pushSchoolScreen("SchoolStudent", { id: x.s.id })} style={styles.listRow}>
                  <Text style={{ color: c.text, flex: 1 }}>
                    {x.s.name} · {x.s.className} {x.s.section ?? ""}
                  </Text>
                  <Text style={{ color: c.danger, fontWeight: "700" }}>{inr(x.balance)}</Text>
                </Pressable>
              ))}
            </Section>
          ) : null}
          {st?.lowAttendance.length ? (
            <Section icon="calendar-alert" title={`📉 Low attendance (${st.lowAttendance.length})`}>
              {st.lowAttendance.slice(0, 6).map((x) => (
                <Pressable key={x.s.id} onPress={() => pushSchoolScreen("SchoolStudent", { id: x.s.id })} style={styles.listRow}>
                  <Text style={{ color: c.text, flex: 1 }}>
                    {x.s.name} · {x.s.className} {x.s.section ?? ""}
                  </Text>
                  <Text style={{ color: c.danger, fontWeight: "700" }}>{x.pct}%</Text>
                </Pressable>
              ))}
            </Section>
          ) : null}
          {st?.belowPass.length ? (
            <Section icon="alert-circle-outline" title={`📝 Below pass mark · ${st.lastExam?.name ?? ""} (${st.belowPass.length})`}>
              {st.belowPass.slice(0, 6).map((x) => (
                <Pressable key={x.s.id} onPress={() => pushSchoolScreen("SchoolStudent", { id: x.s.id })} style={styles.listRow}>
                  <Text style={{ color: c.text, flex: 1 }}>
                    {x.s.name} · {x.s.className}
                  </Text>
                  <Text style={{ color: c.textMuted, fontSize: 12 }}>{x.subjects.join(", ")}</Text>
                </Pressable>
              ))}
            </Section>
          ) : null}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 14 },
  tile: { width: "48%", flexGrow: 1, padding: 12, borderRadius: 16, borderWidth: 1 },
  barRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 3 },
  barTrack: { flex: 1, height: 12, borderRadius: 6, overflow: "hidden" },
  barFill: { height: 12, borderRadius: 6, backgroundColor: SCHOOL_GREEN },
  listRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 7 },
});
