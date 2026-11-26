import React, { useEffect, useMemo, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Checkbox, IconButton, Text, TextInput } from "react-native-paper";
import axios from "axios";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { SCHOOL_SITE, schoolError } from "../../api/school";
import { getSettings, studentList, studentPhotoDataUrl } from "../../api/schoolErp";
import { useSchoolAuth } from "../../context/SchoolAuthContext";
import { useAppTheme } from "../../hooks/useAppTheme";
import { Notice, PillButton } from "../../components/ui/AuthUi";
import type { SchoolSettings, Student } from "../../school/erp";
import { Chips, SCHOOL_GREEN, ui } from "./schoolUi";

type Look = { name: string; logo: string; primary: string; secondary: string; city: string; phone: string };
type Paper = { subject: string; date: string; time: string };
const esc = (t: string) => String(t ?? "").replace(/[&<>"]/g, (x) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[x] ?? x);
const dmy = (iso?: string) => (iso && iso.length >= 10 ? `${iso.slice(8, 10)}-${iso.slice(5, 7)}-${iso.slice(0, 4)}` : iso ?? "");

async function schoolLook(sid: string, fallback: string): Promise<Look> {
  try {
    const r = await axios.get(`${SCHOOL_SITE}/config/schools/${encodeURIComponent(sid)}.json`, { timeout: 10000 });
    const d = r.data as { name?: string; logo?: string; theme?: { primary?: string; secondary?: string }; contact?: { city?: string; phones?: string[] } };
    const logo = d.logo ? (d.logo.startsWith("http") || d.logo.startsWith("data:") ? d.logo : `${SCHOOL_SITE}${d.logo.startsWith("/") ? "" : "/"}${d.logo}`) : "";
    return { name: d.name ?? fallback, logo, primary: d.theme?.primary ?? SCHOOL_GREEN, secondary: d.theme?.secondary ?? "#0f766e", city: d.contact?.city ?? "", phone: d.contact?.phones?.[0] ?? "" };
  } catch {
    return { name: fallback, logo: "", primary: SCHOOL_GREEN, secondary: "#0f766e", city: "", phone: "" };
  }
}

/** ID cards (with photos) and exam hall tickets for a class, as a PDF to print or share. */
export default function IdCardsScreen() {
  const { school } = useSchoolAuth();
  const sid = school?.user.schoolId ?? "";
  const { theme } = useAppTheme();
  const c = theme.colors;
  const [mode, setMode] = useState<"ID cards" | "Hall tickets">("ID cards");
  const [settings, setSettings] = useState<SchoolSettings | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [cls, setCls] = useState("");
  const [sec, setSec] = useState("All");
  const [off, setOff] = useState<Record<string, boolean>>({});
  const [photos, setPhotos] = useState<Record<string, string | null>>({});
  const [validTill, setValidTill] = useState(`${new Date().getFullYear() + 1}-05-31`);
  const [examId, setExamId] = useState("");
  const [papers, setPapers] = useState<Paper[]>([{ subject: "", date: "", time: "10:00 AM" }]);
  const [instructions, setInstructions] = useState("Bring this hall ticket to every exam.\nReach the school 15 minutes before the exam.\nMobile phones and calculators are not allowed.");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const [st, l] = await Promise.all([getSettings(sid), studentList(sid)]);
        setSettings(st.settings);
        const active = l.filter((s) => s.status === "Active");
        setStudents(active);
        setCls(st.settings.classes.find((k) => active.some((s) => s.className === k)) ?? "");
        setExamId(st.settings.exams[st.settings.exams.length - 1]?.id ?? "");
        setPapers(st.settings.subjects.map((subject) => ({ subject, date: "", time: "10:00 AM" })));
      } catch (e) {
        setError(schoolError(e, "Could not load students."));
      } finally {
        setLoading(false);
      }
    })();
  }, [sid]);

  const list = useMemo(() => students.filter((s) => s.className === cls && (sec === "All" || (s.section ?? "") === sec)).sort((a, b) => (a.section ?? "").localeCompare(b.section ?? "") || a.name.localeCompare(b.name)), [students, cls, sec]);
  const chosen = list.filter((s) => !off[s.id]);

  // Photos for this class (only those that have one).
  useEffect(() => {
    if (!school) return;
    for (const s of list) {
      if (!s.hasPhoto || photos[s.id] !== undefined) continue;
      setPhotos((p) => ({ ...p, [s.id]: null }));
      void studentPhotoDataUrl(sid, s.id, school.token).then((u) => setPhotos((p) => ({ ...p, [s.id]: u })));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, school, sid]);

  const make = async () => {
    if (!chosen.length) return;
    setBusy(true);
    setError("");
    try {
      const look = await schoolLook(sid, school?.schoolName ?? sid);
      const head = `<div class="top">${look.logo ? `<img class="logo" src="${esc(look.logo)}"/>` : ""}<div><b>${esc(look.name)}</b><small>${esc([look.city, look.phone].filter(Boolean).join(" · "))}</small></div></div>`;
      const photo = (s: Student) => (photos[s.id] ? `<img class="ph" src="${photos[s.id]}"/>` : `<div class="ph blank">Photo</div>`);
      const exam = settings?.exams.find((e) => e.id === examId)?.name ?? "";
      const body =
        mode === "ID cards"
          ? chosen
              .map(
                (s) => `<div class="card">${head}<div class="in">${photo(s)}<div class="info"><b class="nm">${esc(s.name)}</b>
                <span>Class <b>${esc(`${s.className} ${s.section ?? ""}`)}</b>${s.rollNo ? ` · Roll ${esc(s.rollNo)}` : ""}</span>
                <span>Adm. No <b>${esc(s.admissionNo)}</b></span>
                ${s.dob ? `<span>DOB ${dmy(s.dob)}${s.bloodGroup ? ` · <b class="bg">${esc(s.bloodGroup)}</b>` : ""}</span>` : ""}
                <span>${esc(s.parentName)} · ${esc(s.parentPhone)}</span>
                ${s.transportRoute ? `<span>🚌 ${esc(s.transportRoute)}</span>` : ""}</div></div>
                <div class="foot">Valid till ${dmy(validTill)} · ${esc(settings?.academicYear ?? "")}</div></div>`,
              )
              .join("")
          : chosen
              .map(
                (s) => `<div class="ticket">${head}<h2>HALL TICKET · ${esc(exam)} · ${esc(settings?.academicYear ?? "")}</h2>
                <div class="in">${photo(s)}<div class="info"><b class="nm">${esc(s.name)}</b><span>Class <b>${esc(`${s.className} ${s.section ?? ""}`)}</b></span><span>Adm. No <b>${esc(s.admissionNo)}</b>${s.rollNo ? ` · Roll ${esc(s.rollNo)}` : ""}</span></div></div>
                <table><tr><th>Subject</th><th>Date</th><th>Time</th><th>Invigilator</th></tr>${papers
                  .filter((p) => p.subject.trim())
                  .map((p) => `<tr><td>${esc(p.subject)}</td><td>${dmy(p.date)}</td><td>${esc(p.time)}</td><td></td></tr>`)
                  .join("")}</table>
                <ul>${instructions.split("\n").filter(Boolean).map((l) => `<li>${esc(l)}</li>`).join("")}</ul>
                <div class="sign"><span>Class teacher</span><span>Principal</span></div></div>`,
              )
              .join("");
      const html = `<html><head><meta charset="utf-8"><style>
        @page { size: A4; margin: 10mm; } body{font-family:sans-serif;margin:0;color:#0f172a}
        .card{width:86mm;height:56mm;border:1px solid #cbd5e1;border-radius:3mm;overflow:hidden;display:inline-block;margin:2mm;vertical-align:top;position:relative;page-break-inside:avoid}
        .top{display:flex;gap:2mm;align-items:center;background:${look.primary};color:#fff;padding:1.6mm 2.4mm}
        .top b{display:block;font-size:3.4mm}.top small{font-size:2.3mm;opacity:.9}.logo{width:8mm;height:8mm;object-fit:contain;background:#fff;border-radius:1.5mm}
        .in{display:flex;gap:2.5mm;padding:2mm 2.5mm}.ph{width:19mm;height:24mm;object-fit:cover;border-radius:1.5mm;border:1px solid #e2e8f0}
        .blank{display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:2.6mm;background:#f8fafc}
        .info{display:flex;flex-direction:column;gap:.6mm;font-size:2.6mm}.nm{font-size:3.4mm;color:${look.primary}}.bg{color:#dc2626}
        .foot{position:absolute;bottom:0;left:0;right:0;background:${look.secondary};color:#fff;font-size:2.3mm;padding:1mm 2.4mm}
        .ticket{border:1px solid #94a3b8;border-radius:3mm;overflow:hidden;margin-bottom:6mm;page-break-inside:avoid;height:128mm}
        .ticket .top b{font-size:4.5mm}.ticket .logo{width:11mm;height:11mm}.ticket h2{font-size:4mm;text-align:center;margin:2.5mm 0;color:${look.primary}}
        .ticket .info{font-size:3.4mm}.ticket .nm{font-size:4.4mm}.ticket .ph{width:24mm;height:30mm}
        table{width:calc(100% - 6mm);margin:2mm 3mm;border-collapse:collapse;font-size:3.1mm}td,th{border:1px solid #cbd5e1;padding:1.3mm;text-align:left}th{background:#f1f5f9}
        ul{font-size:2.9mm;margin:2mm 3mm 2mm 8mm;padding:0}.sign{display:flex;justify-content:space-between;margin:7mm 8mm 0;font-size:3mm;color:#475569}
      </style></head><body>${body}</body></html>`;
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: mode, UTI: "com.adobe.pdf" });
    } catch (e) {
      setError(schoolError(e, "Could not make the PDF."));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <View style={[ui.center, { backgroundColor: c.background }]}>
        <ActivityIndicator color={SCHOOL_GREEN} />
      </View>
    );
  }

  const sections = [...new Set(students.filter((s) => s.className === cls).map((s) => s.section ?? ""))].filter(Boolean).sort();

  return (
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={ui.wrap} keyboardShouldPersistTaps="handled">
      {error ? <Notice kind="error" text={error} /> : null}
      <Chips<"ID cards" | "Hall tickets"> items={["ID cards", "Hall tickets"]} value={mode} onChange={setMode} label={(m) => (m === "ID cards" ? "🪪 ID cards" : "🎫 Hall tickets")} color={SCHOOL_GREEN} />
      <Text style={[ui.label, { color: c.text }]}>Class</Text>
      <Chips items={settings?.classes.filter((k) => students.some((s) => s.className === k)) ?? []} value={cls} onChange={(v) => { setCls(v); setSec("All"); }} color={SCHOOL_GREEN} />
      {sections.length > 1 ? <Chips items={["All", ...sections]} value={sec} onChange={setSec} color={SCHOOL_GREEN} /> : null}

      {mode === "ID cards" ? (
        <TextInput mode="outlined" label="Valid till (YYYY-MM-DD)" value={validTill} onChangeText={setValidTill} style={{ marginTop: 10 }} activeOutlineColor={SCHOOL_GREEN} />
      ) : (
        <>
          <Text style={[ui.label, { color: c.text }]}>Exam</Text>
          <Chips items={settings?.exams.map((e) => e.id) ?? []} value={examId} onChange={setExamId} label={(id) => settings?.exams.find((e) => e.id === id)?.name ?? id} color={SCHOOL_GREEN} />
          <Text style={[ui.label, { color: c.text }]}>Timetable on the ticket</Text>
          {papers.map((p, i) => (
            <View key={i} style={styles.paper}>
              <TextInput mode="outlined" dense label="Subject" value={p.subject} onChangeText={(v) => setPapers((x) => x.map((y, j) => (j === i ? { ...y, subject: v } : y)))} style={{ flex: 2 }} activeOutlineColor={SCHOOL_GREEN} />
              <TextInput mode="outlined" dense label="Date" placeholder="2026-12-10" value={p.date} onChangeText={(v) => setPapers((x) => x.map((y, j) => (j === i ? { ...y, date: v } : y)))} style={{ flex: 2 }} activeOutlineColor={SCHOOL_GREEN} />
              <TextInput mode="outlined" dense label="Time" value={p.time} onChangeText={(v) => setPapers((x) => x.map((y, j) => (j === i ? { ...y, time: v } : y)))} style={{ flex: 2 }} activeOutlineColor={SCHOOL_GREEN} />
              <IconButton icon="close" size={16} onPress={() => setPapers((x) => x.filter((_, j) => j !== i))} />
            </View>
          ))}
          <PillButton label="Add paper" icon="plus" variant="soft" color={SCHOOL_GREEN} onPress={() => setPapers((x) => [...x, { subject: "", date: "", time: "10:00 AM" }])} style={{ marginTop: 6 }} />
          <TextInput mode="outlined" label="Instructions" value={instructions} onChangeText={setInstructions} multiline style={{ marginTop: 10 }} activeOutlineColor={SCHOOL_GREEN} />
        </>
      )}

      <Text style={[ui.label, { color: c.text }]}>
        Students ({chosen.length} of {list.length}) · add photos in each student's profile
      </Text>
      {list.map((s) => (
        <Pressable key={s.id} onPress={() => setOff((o) => ({ ...o, [s.id]: !o[s.id] }))} style={[styles.kid, { borderColor: c.border, backgroundColor: c.surface }]}>
          <Checkbox status={off[s.id] ? "unchecked" : "checked"} color={SCHOOL_GREEN} />
          {photos[s.id] ? <Image source={{ uri: photos[s.id]! }} style={styles.thumb} /> : <Text style={{ fontSize: 22 }}>🧒</Text>}
          <Text style={{ color: c.text, flex: 1 }}>
            {s.name} <Text style={{ color: c.textMuted, fontSize: 12 }}>· {s.admissionNo}</Text>
          </Text>
        </Pressable>
      ))}
      <PillButton label={`Make PDF (${chosen.length})`} icon="file-pdf-box" color={SCHOOL_GREEN} onPress={() => void make()} loading={busy} disabled={busy || !chosen.length} style={{ marginTop: 16 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  paper: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
  kid: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 12, paddingRight: 10, marginTop: 6 },
  thumb: { width: 30, height: 38, borderRadius: 6 },
});
