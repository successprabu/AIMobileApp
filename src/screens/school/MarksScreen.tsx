import React, { useEffect, useMemo, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { ActivityIndicator, Text, TextInput } from "react-native-paper";
import { getMarks, putMarks, schoolError, type MarksData, type SchoolSettings, type SchoolStudent } from "../../api/school";
import { useSchoolAuth } from "../../context/SchoolAuthContext";
import { useAppTheme } from "../../hooks/useAppTheme";
import { Notice, PillButton } from "../../components/ui/AuthUi";
import { loadSchoolBasics } from "./AttendanceScreen";
import { Chips, SCHOOL_GREEN, ui } from "./schoolUi";

/** Teacher: enter one subject's marks for a class and exam. */
export default function MarksScreen() {
  const { school } = useSchoolAuth();
  const sid = school?.user.schoolId ?? "";
  const { theme } = useAppTheme();
  const c = theme.colors;

  const [settings, setSettings] = useState<SchoolSettings | null>(null);
  const [students, setStudents] = useState<SchoolStudent[]>([]);
  const [data, setData] = useState<MarksData>({ marks: {}, remarks: {} });
  const [examId, setExamId] = useState<string | null>(null);
  const [cls, setCls] = useState<string | null>(null);
  const [subject, setSubject] = useState<string | null>(null);
  const [typed, setTyped] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<{ kind: "info" | "error" | "success"; text: string } | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [b, m] = await Promise.all([loadSchoolBasics(sid), getMarks(sid)]);
        setSettings(b.settings);
        const active = b.students.filter((s) => s.status === "Active");
        setStudents(active);
        setData(m);
        setExamId(b.settings.exams[0]?.id ?? null);
        setCls(b.settings.classes.find((k) => active.some((s) => s.className === k)) ?? null);
        setSubject(b.settings.subjects[0] ?? null);
      } catch (e) {
        setNote({ kind: "error", text: schoolError(e, "Could not load marks. Check the network and try again.") });
      } finally {
        setLoading(false);
      }
    })();
  }, [sid]);

  const exam = settings?.exams.find((e) => e.id === examId);
  const list = useMemo(
    () => students.filter((s) => s.className === cls).sort((a, b) => (a.section ?? "").localeCompare(b.section ?? "") || (Number(a.rollNo) || 9999) - (Number(b.rollNo) || 9999) || a.name.localeCompare(b.name)),
    [students, cls],
  );

  // Fill the boxes with what is saved for this exam + subject.
  useEffect(() => {
    if (!examId || !subject) return;
    const saved = data.marks[examId] ?? {};
    setTyped(Object.fromEntries(list.map((s) => [s.id, saved[s.id]?.[subject] != null ? String(saved[s.id][subject]) : ""])));
  }, [examId, subject, list, data]);

  const save = async () => {
    if (!examId || !subject || !exam) return;
    const records: Record<string, Record<string, number | null>> = {};
    for (const s of list) {
      const t = (typed[s.id] ?? "").trim();
      const n = t === "" ? null : Number(t);
      if (n != null && (!Number.isFinite(n) || n < 0 || n > exam.maxMarks)) {
        return setNote({ kind: "error", text: `${s.name}: enter 0 to ${exam.maxMarks}, or leave it empty.` });
      }
      records[s.id] = { [subject]: n };
    }
    setSaving(true);
    setNote(null);
    try {
      const errors = await putMarks(sid, examId, records);
      setData((d) => {
        const marks = { ...d.marks, [examId]: { ...(d.marks[examId] ?? {}) } };
        for (const [id, row] of Object.entries(records)) {
          const v = row[subject];
          const cur = { ...(marks[examId][id] ?? {}) };
          if (v == null) delete cur[subject];
          else cur[subject] = v;
          marks[examId][id] = cur;
        }
        return { ...d, marks };
      });
      setNote(errors.length ? { kind: "error", text: errors.join("\n") } : { kind: "success", text: `📝 ${subject} marks saved for ${cls} · ${exam.name}.` });
    } catch (e) {
      setNote({ kind: "error", text: schoolError(e, "Could not save. Check the network and try again.") });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[ui.center, { backgroundColor: c.background }]}>
        <ActivityIndicator color={SCHOOL_GREEN} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <FlatList
        data={list}
        keyExtractor={(s) => s.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        ListHeaderComponent={
          <View style={{ gap: 6, marginBottom: 8 }}>
            {note ? <Notice kind={note.kind} text={note.text} /> : null}
            <Text style={[ui.label, { color: c.text }]}>Exam</Text>
            <Chips items={settings?.exams.map((e) => e.id) ?? []} value={examId} onChange={setExamId} label={(id) => settings?.exams.find((e) => e.id === id)?.name ?? id} color={SCHOOL_GREEN} />
            <Text style={[ui.label, { color: c.text }]}>Class</Text>
            <Chips items={settings?.classes.filter((k) => students.some((s) => s.className === k)) ?? []} value={cls} onChange={setCls} color={SCHOOL_GREEN} />
            <Text style={[ui.label, { color: c.text }]}>Subject</Text>
            <Chips items={settings?.subjects ?? []} value={subject} onChange={setSubject} color={SCHOOL_GREEN} />
            {exam ? <Text style={{ color: c.textMuted, marginTop: 6 }}>Out of {exam.maxMarks}. Leave empty if absent.</Text> : null}
          </View>
        }
        ListEmptyComponent={<Text style={{ color: c.textMuted, textAlign: "center", marginTop: 24 }}>No children in this class.</Text>}
        renderItem={({ item: s }) => (
          <View style={[styles.child, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.text, fontWeight: "700" }}>{s.name}</Text>
              <Text style={{ color: c.textMuted, fontSize: 12 }}>
                {s.className} {s.section ?? ""} {s.rollNo ? `· Roll ${s.rollNo}` : ""}
              </Text>
            </View>
            <TextInput
              mode="outlined"
              dense
              value={typed[s.id] ?? ""}
              onChangeText={(v) => setTyped((t) => ({ ...t, [s.id]: v.replace(/[^0-9.]/g, "") }))}
              keyboardType="decimal-pad"
              style={styles.box}
              activeOutlineColor={SCHOOL_GREEN}
              accessibilityLabel={`${s.name} marks`}
            />
          </View>
        )}
      />
      <View style={[styles.bar, { backgroundColor: c.surface, borderTopColor: c.border }]}>
        <PillButton label="Save marks" icon="content-save-outline" color={SCHOOL_GREEN} onPress={() => void save()} loading={saving} disabled={saving || !list.length} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  child: { flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: 14, borderWidth: 1, marginBottom: 8 },
  box: { width: 84, textAlign: "center" },
  bar: { position: "absolute", left: 0, right: 0, bottom: 0, padding: 12, paddingBottom: 20, borderTopWidth: 1 },
});
