import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Text, TextInput } from "react-native-paper";
import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { schoolError } from "../../api/school";
import { schoolData } from "../../api/schoolErp";
import { useSchoolAuth } from "../../context/SchoolAuthContext";
import { useAppTheme } from "../../hooks/useAppTheme";
import { Notice, PillButton } from "../../components/ui/AuthUi";
import { gradeFor, type SchoolData } from "../../school/erp";
import { REPORTS, attendancePct, examResult, feeTotalFor, type Cell, type ReportFilters } from "../../school/reportCalc";
import { Chips, Row, SCHOOL_GREEN, Section, inr, shiftDay, todayIso, ui } from "./schoolUi";

const GROUPS: { g: string; emoji: string }[] = [
  { g: "Students", emoji: "🧑‍🎓" },
  { g: "Fees", emoji: "💰" },
  { g: "Attendance", emoji: "✅" },
  { g: "Exams", emoji: "📝" },
  { g: "Admin", emoji: "🗂️" },
];
const esc = (t: Cell) => String(t ?? "").replace(/[&<>"]/g, (x) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[x] ?? x);

/** All the website's reports (same calculations), with filters, a chart, and sharing as PDF or Excel (CSV). */
export default function ReportsScreen() {
  const { school } = useSchoolAuth();
  const sid = school?.user.schoolId ?? "";
  const { theme } = useAppTheme();
  const c = theme.colors;
  const [d, setD] = useState<SchoolData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sel, setSel] = useState<string | null>(null);
  const today = todayIso();
  const [f, setF] = useState<ReportFilters>({ className: "", section: "", examId: "", month: today.slice(0, 7), from: shiftDay(today, -30), to: today, date: today, studentId: "" });

  const load = useCallback(async () => {
    setError("");
    try {
      setD(await schoolData(sid));
    } catch (e) {
      setError(schoolError(e, "Could not load report data."));
    } finally {
      setLoading(false);
    }
  }, [sid]);
  useEffect(() => {
    void load();
  }, [load]);

  const can = (p?: string) => !p || school?.user.role === "superadmin" || !!school?.permissions.includes(p);
  const reports = REPORTS.filter((r) => can(r.needs));
  const def = sel && sel !== "report-card" ? reports.find((r) => r.id === sel) ?? null : null;
  const defaultExam = (x: SchoolData) => [...x.settings.exams].reverse().find((e) => Object.keys(x.marks.marks?.[e.id] ?? {}).length)?.id ?? x.settings.exams[0]?.id ?? "";
  const result = useMemo(() => {
    if (!d || !def) return null;
    try {
      return def.run(d, { ...f, examId: f.examId || defaultExam(d) });
    } catch {
      return null;
    }
  }, [d, def, f]);
  const maxBar = Math.max(1, ...(result?.bars ?? []).map((b) => b.value));
  const set = (k: keyof ReportFilters, v: string) => setF((x) => ({ ...x, [k]: v }));
  const has = (k: keyof ReportFilters) => !!def?.filters.includes(k);

  const card = useMemo(() => {
    const s = d?.students.find((x) => x.id === f.studentId);
    if (!d || !s) return null;
    const exams = d.settings.exams.map((ex) => ({ ex, r: examResult(d, ex.id, s), remark: d.marks.remarks?.[ex.id]?.[s.id] ?? "" })).filter((x) => x.r.entered || x.remark);
    const att = attendancePct(d.attendanceStudents, s.id);
    const paid = d.payments.filter((p) => p.studentId === s.id && p.academicYear === d.settings.academicYear).reduce((t, p) => t + p.amount, 0);
    const total = feeTotalFor(d.settings, s);
    return { s, exams, att, fee: { total, paid, balance: Math.max(0, total - paid) } };
  }, [d, f.studentId]);

  const title = sel === "report-card" ? "Report card" : def?.title ?? "";

  const sharePdf = async () => {
    let body = "";
    if (sel === "report-card" && card && d) {
      body = `<h1>${esc(school?.schoolName ?? "")} · Report card ${esc(d.settings.academicYear)}</h1>
        <p><b>${esc(card.s.name)}</b> · Class ${esc(`${card.s.className} ${card.s.section ?? ""}`)} · ${esc(card.s.admissionNo)}</p>
        ${card.exams
          .map(
            (x) => `<h3>${esc(x.ex?.name ?? "")}</h3><table><tr>${d.settings.subjects.map((s) => `<th>${esc(s)}</th>`).join("")}<th>Total</th><th>%</th><th>Grade</th></tr>
            <tr>${x.r.marks.map((m) => `<td>${m ?? "—"}</td>`).join("")}<td>${x.r.total}/${x.r.max}</td><td>${x.r.pct ?? "—"}</td><td>${gradeFor(x.r.pct)}</td></tr></table>${x.remark ? `<p><i>${esc(x.remark)}</i></p>` : ""}`,
          )
          .join("")}
        <p>Attendance: ${card.att.pct ?? "—"}% (${card.att.present} of ${card.att.days} days)</p>
        <br/><br/><p style="display:flex;justify-content:space-between"><span>Class teacher</span><span>Principal</span><span>Parent</span></p>`;
    } else if (result && def) {
      body = `<h1>${esc(school?.schoolName ?? "")} · ${esc(def.title)}</h1><p class="m">${esc(new Date().toLocaleDateString("en-IN"))}</p>
        ${result.summary?.length ? `<p>${result.summary.map((s) => `<b>${esc(s.label)}:</b> ${esc(s.value)}`).join(" &nbsp; ")}</p>` : ""}
        <table><tr>${result.columns.map((h) => `<th>${esc(h)}</th>`).join("")}</tr>${result.rows.map((r) => `<tr>${r.map((v) => `<td>${esc(v)}</td>`).join("")}</tr>`).join("")}</table>`;
    }
    if (!body) return;
    const html = `<html><head><meta charset="utf-8"><style>body{font-family:sans-serif;font-size:11px;color:#0f172a}h1{font-size:16px}.m{color:#64748b}table{border-collapse:collapse;width:100%;margin:6px 0}td,th{border:1px solid #cbd5e1;padding:4px;text-align:left}th{background:#f1f5f9}</style></head><body>${body}</body></html>`;
    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: title, UTI: "com.adobe.pdf" });
  };

  const shareCsv = async () => {
    if (!result || !def) return;
    const cell = (v: Cell) => {
      const t = v == null ? "" : String(v);
      return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
    };
    const csv = "﻿" + [result.columns, ...result.rows].map((r) => r.map(cell).join(",")).join("\r\n");
    const uri = `${FileSystem.cacheDirectory ?? ""}${sid}-${def.id}-${today}.csv`;
    await FileSystem.writeAsStringAsync(uri, csv);
    await Sharing.shareAsync(uri, { mimeType: "text/csv", dialogTitle: def.title });
  };

  if (loading) {
    return (
      <View style={[ui.center, { backgroundColor: c.background }]}>
        <ActivityIndicator color={SCHOOL_GREEN} />
      </View>
    );
  }

  if (!sel || !d) {
    return (
      <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={ui.wrap} refreshControl={<RefreshControl refreshing={false} onRefresh={() => void load()} />}>
        {error ? <Notice kind="error" text={error} /> : null}
        {GROUPS.map(({ g, emoji }) => {
          const items = reports.filter((r) => r.group === g);
          const extra = g === "Exams" ? [{ id: "report-card", title: "Report card", description: "One student's marks, grades, remarks and attendance, ready to print." }] : [];
          if (!items.length && !extra.length) return null;
          return (
            <Section key={g} icon="chart-box-outline" title={`${emoji} ${g}`}>
              {[...items, ...extra].map((r) => (
                <Pressable key={r.id} onPress={() => setSel(r.id)} style={[styles.rep, { borderColor: c.border }]}>
                  <Text style={{ color: c.text, fontWeight: "700" }}>{r.title}</Text>
                  <Text style={{ color: c.textMuted, fontSize: 12 }}>{r.description}</Text>
                </Pressable>
              ))}
            </Section>
          );
        })}
      </ScrollView>
    );
  }

  const classes = ["", ...d.settings.classes];
  return (
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={ui.wrap} keyboardShouldPersistTaps="handled">
      <Pressable onPress={() => setSel(null)} hitSlop={8}>
        <Text style={{ color: SCHOOL_GREEN, fontWeight: "800", marginBottom: 8 }}>← All reports</Text>
      </Pressable>
      <Text style={{ color: c.text, fontSize: 20, fontWeight: "800" }}>{title}</Text>
      {def ? <Text style={{ color: c.textMuted, marginBottom: 6 }}>{def.description}</Text> : null}

      {has("className") || sel === "report-card" ? <Chips items={classes} value={f.className} onChange={(v) => setF((x) => ({ ...x, className: v, section: "", studentId: "" }))} label={(v) => v || "All classes"} color={SCHOOL_GREEN} /> : null}
      {has("section") ? <Chips items={["", ...d.settings.sections]} value={f.section} onChange={(v) => set("section", v)} label={(v) => v || "All sections"} color={SCHOOL_GREEN} /> : null}
      {has("examId") ? <Chips items={d.settings.exams.map((e) => e.id)} value={f.examId || defaultExam(d)} onChange={(v) => set("examId", v)} label={(id) => d.settings.exams.find((e) => e.id === id)?.name ?? id} color={SCHOOL_GREEN} /> : null}
      <View style={styles.dates}>
        {has("month") ? <TextInput mode="outlined" dense label="Month (YYYY-MM)" value={f.month} onChangeText={(v) => set("month", v)} style={{ flex: 1 }} activeOutlineColor={SCHOOL_GREEN} /> : null}
        {has("date") ? <TextInput mode="outlined" dense label="Date" value={f.date} onChangeText={(v) => set("date", v)} style={{ flex: 1 }} activeOutlineColor={SCHOOL_GREEN} /> : null}
        {has("from") ? <TextInput mode="outlined" dense label="From" value={f.from} onChangeText={(v) => set("from", v)} style={{ flex: 1 }} activeOutlineColor={SCHOOL_GREEN} /> : null}
        {has("to") ? <TextInput mode="outlined" dense label="To" value={f.to} onChangeText={(v) => set("to", v)} style={{ flex: 1 }} activeOutlineColor={SCHOOL_GREEN} /> : null}
      </View>

      {sel === "report-card" ? (
        <>
          <Text style={[ui.label, { color: c.text }]}>Student</Text>
          <View style={styles.wrapRow}>
            {d.students
              .filter((s) => s.status === "Active" && (!f.className || s.className === f.className))
              .sort((a, b) => a.name.localeCompare(b.name))
              .slice(0, 80)
              .map((s) => (
                <Pressable key={s.id} onPress={() => set("studentId", s.id)} style={[ui.chip, { borderColor: f.studentId === s.id ? SCHOOL_GREEN : c.border, backgroundColor: f.studentId === s.id ? SCHOOL_GREEN : c.surface }]}>
                  <Text style={{ color: f.studentId === s.id ? "#fff" : c.text }}>{s.name}</Text>
                </Pressable>
              ))}
          </View>
          {card ? (
            <Section icon="certificate" title={`🏆 ${card.s.name} · ${card.s.className} ${card.s.section ?? ""}`}>
              {card.exams.length ? (
                card.exams.map((x) => (
                  <View key={x.ex?.id} style={{ marginBottom: 8 }}>
                    <Row left={x.ex?.name ?? ""} right={`${x.r.total}/${x.r.max} · ${x.r.pct ?? "—"}% · ${gradeFor(x.r.pct)}`} bold />
                    <Text style={{ color: c.textMuted, fontSize: 12 }}>{d.settings.subjects.map((s, i) => `${s} ${x.r.marks[i] ?? "—"}`).join(" · ")}</Text>
                    {x.remark ? <Text style={{ color: c.text, fontStyle: "italic", fontSize: 12 }}>“{x.remark}”</Text> : null}
                  </View>
                ))
              ) : (
                <Text style={{ color: c.textMuted }}>No marks yet.</Text>
              )}
              <Row left="Attendance" right={card.att.pct == null ? "—" : `${card.att.pct}%`} />
              <Row left="Fee balance" right={inr(card.fee.balance)} bad={card.fee.balance > 0} />
            </Section>
          ) : null}
        </>
      ) : result ? (
        <>
          {result.summary?.length ? (
            <View style={styles.sum}>
              {result.summary.map((s) => (
                <View key={s.label} style={[styles.sumBox, { backgroundColor: c.surface, borderColor: c.border }]}>
                  <Text style={{ color: c.text, fontWeight: "800" }}>{String(s.value)}</Text>
                  <Text style={{ color: c.textMuted, fontSize: 11 }}>{s.label}</Text>
                </View>
              ))}
            </View>
          ) : null}
          {result.bars?.length ? (
            <Section icon="chart-bar" title="📊 Chart">
              {result.bars.map((b) => (
                <View key={b.label} style={styles.barRow}>
                  <Text style={{ color: c.text, width: 74, fontSize: 12 }} numberOfLines={1}>
                    {b.label}
                  </Text>
                  <View style={[styles.track, { backgroundColor: c.chipBg }]}>
                    <View style={[styles.fill, { width: `${Math.max(3, (b.value / maxBar) * 100)}%` }]} />
                  </View>
                  <Text style={{ color: c.text, fontSize: 12, width: 64, textAlign: "right" }}>{b.display}</Text>
                </View>
              ))}
            </Section>
          ) : null}
          <Text style={{ color: c.textMuted, marginVertical: 6 }}>{result.rows.length} rows · scroll sideways to see all columns</Text>
          <ScrollView horizontal>
            <View style={[styles.table, { borderColor: c.border }]}>
              <View style={[styles.tr, { backgroundColor: c.chipBg }]}>
                {result.columns.map((h) => (
                  <Text key={h} style={[styles.td, { color: c.text, fontWeight: "800" }]}>
                    {h}
                  </Text>
                ))}
              </View>
              {result.rows.slice(0, 400).map((r, i) => (
                <View key={i} style={[styles.tr, { borderTopColor: c.border }]}>
                  {r.map((v, j) => (
                    <Text key={j} style={[styles.td, { color: c.text, textAlign: typeof v === "number" ? "right" : "left" }]}>
                      {v == null ? "—" : String(v)}
                    </Text>
                  ))}
                </View>
              ))}
            </View>
          </ScrollView>
        </>
      ) : (
        <Text style={{ color: c.textMuted, marginTop: 12 }}>No data for these filters.</Text>
      )}

      <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
        <PillButton label="Share PDF" icon="file-pdf-box" color={SCHOOL_GREEN} onPress={() => void sharePdf().catch(() => setError("Could not make the PDF."))} style={{ flex: 1 }} disabled={sel === "report-card" ? !card : !result} />
        {sel !== "report-card" ? <PillButton label="Excel (CSV)" icon="file-excel-outline" variant="soft" color={SCHOOL_GREEN} onPress={() => void shareCsv().catch(() => setError("Could not make the file."))} style={{ flex: 1 }} disabled={!result} /> : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  rep: { borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: 10 },
  dates: { flexDirection: "row", gap: 8, marginTop: 6 },
  wrapRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  sum: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginVertical: 8 },
  sumBox: { borderWidth: 1, borderRadius: 12, padding: 10, minWidth: "30%", flexGrow: 1 },
  barRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 2 },
  track: { flex: 1, height: 10, borderRadius: 5, overflow: "hidden" },
  fill: { height: 10, borderRadius: 5, backgroundColor: SCHOOL_GREEN },
  table: { borderWidth: 1, borderRadius: 10, overflow: "hidden" },
  tr: { flexDirection: "row", borderTopWidth: StyleSheet.hairlineWidth },
  td: { width: 118, padding: 6, fontSize: 12 },
});
