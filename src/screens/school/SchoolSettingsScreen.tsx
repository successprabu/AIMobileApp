import React, { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Checkbox, IconButton, Text, TextInput } from "react-native-paper";
import { schoolError } from "../../api/school";
import { demoData, getSettings, saveSettings } from "../../api/schoolErp";
import { useSchoolAuth } from "../../context/SchoolAuthContext";
import { useAppTheme } from "../../hooks/useAppTheme";
import { Notice, PillButton } from "../../components/ui/AuthUi";
import type { FeeItem, SchoolSettings, StudentField } from "../../school/erp";
import { Chips, SCHOOL_GREEN, Section, inr, ui } from "./schoolUi";

/** A list of words (classes, subjects, …): tap × to remove, type + Add. */
function WordList({ items, onChange, placeholder }: { items: string[]; onChange: (l: string[]) => void; placeholder: string }) {
  const { theme } = useAppTheme();
  const c = theme.colors;
  const [add, setAdd] = useState("");
  const push = () => {
    const v = add.trim();
    if (v && !items.includes(v)) onChange([...items, v]);
    setAdd("");
  };
  return (
    <View>
      <View style={styles.wrapRow}>
        {items.map((x) => (
          <Pressable key={x} onPress={() => onChange(items.filter((y) => y !== x))} style={[ui.chip, { borderColor: c.border, backgroundColor: c.surface }]}>
            <Text style={{ color: c.text }}>{x} ✕</Text>
          </Pressable>
        ))}
      </View>
      <TextInput mode="outlined" dense placeholder={placeholder} value={add} onChangeText={setAdd} onSubmitEditing={push} right={<TextInput.Icon icon="plus" onPress={push} />} style={{ marginTop: 6 }} activeOutlineColor={SCHOOL_GREEN} />
    </View>
  );
}

function FeeList({ items, onChange }: { items: FeeItem[]; onChange: (l: FeeItem[]) => void }) {
  const { theme } = useAppTheme();
  const c = theme.colors;
  return (
    <View>
      {items.map((f, i) => (
        <View key={i} style={styles.fee}>
          <TextInput mode="outlined" dense label="Fee head" value={f.head} onChangeText={(v) => onChange(items.map((x, j) => (j === i ? { ...x, head: v } : x)))} style={{ flex: 2 }} activeOutlineColor={SCHOOL_GREEN} />
          <TextInput mode="outlined" dense label="₹" value={f.amount ? String(f.amount) : ""} onChangeText={(v) => onChange(items.map((x, j) => (j === i ? { ...x, amount: Number(v.replace(/\D/g, "")) || 0 } : x)))} keyboardType="number-pad" style={{ flex: 1 }} activeOutlineColor={SCHOOL_GREEN} />
          <IconButton icon="close" size={16} onPress={() => onChange(items.filter((_, j) => j !== i))} />
        </View>
      ))}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ color: c.text, fontWeight: "700" }}>Total {inr(items.reduce((t, x) => t + (x.amount || 0), 0))}</Text>
        <PillButton label="Add fee head" icon="plus" variant="soft" color={SCHOOL_GREEN} onPress={() => onChange([...items, { head: "", amount: 0 }])} />
      </View>
    </View>
  );
}

/** School settings: year, classes, sections, subjects, exams, pass mark, fees (default and per class), payment modes, required student fields. */
export default function SchoolSettingsScreen() {
  const { school } = useSchoolAuth();
  const sid = school?.user.schoolId ?? "";
  const { theme } = useAppTheme();
  const c = theme.colors;
  const [s, setS] = useState<SchoolSettings | null>(null);
  const [fields, setFields] = useState<StudentField[]>([]);
  const [feeClass, setFeeClass] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [demoBusy, setDemoBusy] = useState(false);
  const [note, setNote] = useState<{ kind: "error" | "success"; text: string } | null>(null);

  useEffect(() => {
    void getSettings(sid)
      .then((r) => {
        setS(r.settings);
        setFields(r.studentFields);
      })
      .catch((e) => setNote({ kind: "error", text: schoolError(e, "Could not load settings.") }))
      .finally(() => setLoading(false));
  }, [sid]);

  if (loading || !s) {
    return (
      <View style={[ui.center, { backgroundColor: c.background }]}>
        {note ? <Notice kind={note.kind} text={note.text} /> : <ActivityIndicator color={SCHOOL_GREEN} />}
      </View>
    );
  }
  const up = (patch: Partial<SchoolSettings>) => setS({ ...s, ...patch });

  const save = async () => {
    setSaving(true);
    setNote(null);
    try {
      const clean = (l: FeeItem[]) => l.filter((x) => x.head.trim());
      const next = await saveSettings(sid, {
        ...s,
        defaultFees: clean(s.defaultFees),
        classFees: Object.fromEntries(Object.entries(s.classFees ?? {}).map(([k, v]) => [k, clean(v)]).filter(([, v]) => (v as FeeItem[]).length)),
        exams: s.exams.filter((e) => e.name.trim()),
      });
      setS(next);
      setNote({ kind: "success", text: "⚙️ Settings saved." });
    } catch (e) {
      setNote({ kind: "error", text: schoolError(e, "Could not save the settings.") });
    } finally {
      setSaving(false);
    }
  };

  /** Sample students, fees, attendance and marks to try the ERP; "remove" deletes only the sample ones. */
  const demo = (action: "load" | "remove") =>
    Alert.alert(
      action === "load" ? "Load demo data?" : "Remove demo data?",
      action === "load" ? "Adds sample students with fees, attendance and marks, marked as demo, so you can try every screen." : "Deletes only the demo students and their records. Your real students stay.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: action === "load" ? "Load" : "Remove",
          style: action === "remove" ? "destructive" : "default",
          onPress: () =>
            void (async () => {
              setDemoBusy(true);
              try {
                const r = await demoData(sid, action);
                setNote({ kind: "success", text: action === "load" ? `🧪 Demo data loaded${r.students ? `: ${r.students} students` : ""}.` : `🧹 Demo data removed${r.removedStudents != null ? `: ${r.removedStudents} students` : ""}.` });
              } catch (e) {
                setNote({ kind: "error", text: schoolError(e, "Could not change demo data.") });
              } finally {
                setDemoBusy(false);
              }
            })(),
        },
      ],
    );

  const classFee = feeClass ? s.classFees?.[feeClass] : undefined;

  return (
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={ui.wrap} keyboardShouldPersistTaps="handled">
      {note ? <Notice kind={note.kind} text={note.text} /> : null}
      <Section icon="calendar" title="📅 Academic year">
        <View style={styles.two}>
          <TextInput mode="outlined" dense label="Academic year" value={s.academicYear} onChangeText={(v) => up({ academicYear: v })} style={{ flex: 1 }} activeOutlineColor={SCHOOL_GREEN} />
          <TextInput mode="outlined" dense label="Admission no prefix" value={s.admissionPrefix} onChangeText={(v) => up({ admissionPrefix: v.toUpperCase() })} style={{ flex: 1 }} activeOutlineColor={SCHOOL_GREEN} autoCapitalize="characters" />
        </View>
      </Section>
      <Section icon="google-classroom" title="🏫 Classes & sections">
        <WordList items={s.classes} onChange={(l) => up({ classes: l })} placeholder="Add a class" />
        <Text style={[ui.label, { color: c.text }]}>Sections</Text>
        <WordList items={s.sections} onChange={(l) => up({ sections: l })} placeholder="Add a section" />
      </Section>
      <Section icon="book-open-variant" title="📚 Subjects & exams">
        <WordList items={s.subjects} onChange={(l) => up({ subjects: l })} placeholder="Add a subject" />
        <Text style={[ui.label, { color: c.text }]}>Exams (maximum marks)</Text>
        {s.exams.map((e, i) => (
          <View key={i} style={styles.fee}>
            <TextInput mode="outlined" dense label="Exam" value={e.name} onChangeText={(v) => up({ exams: s.exams.map((x, j) => (j === i ? { ...x, name: v } : x)) })} style={{ flex: 2 }} activeOutlineColor={SCHOOL_GREEN} />
            <TextInput mode="outlined" dense label="Max" value={String(e.maxMarks)} onChangeText={(v) => up({ exams: s.exams.map((x, j) => (j === i ? { ...x, maxMarks: Number(v.replace(/\D/g, "")) || 0 } : x)) })} keyboardType="number-pad" style={{ flex: 1 }} activeOutlineColor={SCHOOL_GREEN} />
            <IconButton icon="close" size={16} onPress={() => up({ exams: s.exams.filter((_, j) => j !== i) })} />
          </View>
        ))}
        <PillButton label="Add exam" icon="plus" variant="soft" color={SCHOOL_GREEN} onPress={() => up({ exams: [...s.exams, { id: "", name: "", maxMarks: 100 }] })} />
        <View style={[styles.two, { marginTop: 8 }]}>
          <TextInput mode="outlined" dense label="Pass mark %" value={String(s.passPercent)} onChangeText={(v) => up({ passPercent: Number(v.replace(/\D/g, "")) || 0 })} keyboardType="number-pad" style={{ flex: 1 }} activeOutlineColor={SCHOOL_GREEN} />
          <TextInput mode="outlined" dense label="Attendance alert %" value={String(s.attendanceAlertPercent)} onChangeText={(v) => up({ attendanceAlertPercent: Number(v.replace(/\D/g, "")) || 0 })} keyboardType="number-pad" style={{ flex: 1 }} activeOutlineColor={SCHOOL_GREEN} />
        </View>
      </Section>
      <Section icon="cash" title="💰 Fees for the year">
        <Text style={{ color: c.textMuted, fontSize: 12 }}>Default fees (for every class without its own fees)</Text>
        <FeeList items={s.defaultFees} onChange={(l) => up({ defaultFees: l })} />
        <Text style={[ui.label, { color: c.text }]}>Different fees for a class</Text>
        <Chips items={s.classes} value={feeClass} onChange={setFeeClass} label={(k) => `${k}${s.classFees?.[k]?.length ? " ✓" : ""}`} color={SCHOOL_GREEN} />
        {feeClass ? (
          classFee ? (
            <>
              <FeeList items={classFee} onChange={(l) => up({ classFees: { ...s.classFees, [feeClass]: l } })} />
              <PillButton
                label={`Use default fees for ${feeClass}`}
                icon="undo"
                variant="outline"
                color={SCHOOL_GREEN}
                onPress={() => {
                  const next = { ...s.classFees };
                  delete next[feeClass];
                  up({ classFees: next });
                }}
                style={{ marginTop: 6 }}
              />
            </>
          ) : (
            <PillButton label={`Set own fees for ${feeClass}`} icon="plus" variant="soft" color={SCHOOL_GREEN} onPress={() => up({ classFees: { ...s.classFees, [feeClass]: s.defaultFees.map((x) => ({ ...x })) } })} style={{ marginTop: 6 }} />
          )
        ) : null}
        <Text style={[ui.label, { color: c.text }]}>Payment modes</Text>
        <WordList items={s.paymentModes} onChange={(l) => up({ paymentModes: l })} placeholder="Add a payment mode" />
      </Section>
      <Section icon="account-group" title="👩‍🏫 Staff designations">
        <WordList items={s.staffDesignations} onChange={(l) => up({ staffDesignations: l })} placeholder="Add a designation" />
      </Section>
      <Section icon="form-select" title="🧾 Required in the student form">
        {fields.map((f) => {
          const on = s.requiredStudentFields.includes(f.key);
          return (
            <Pressable
              key={f.key}
              disabled={f.locked}
              onPress={() => up({ requiredStudentFields: on ? s.requiredStudentFields.filter((k) => k !== f.key) : [...s.requiredStudentFields, f.key] })}
              style={styles.check}
            >
              <Checkbox status={on || f.locked ? "checked" : "unchecked"} disabled={f.locked} color={SCHOOL_GREEN} />
              <Text style={{ color: c.text }}>
                {f.label}
                {f.locked ? " (always)" : ""}
              </Text>
            </Pressable>
          );
        })}
      </Section>
      <PillButton label="Save settings" icon="content-save-outline" color={SCHOOL_GREEN} onPress={() => void save()} loading={saving} disabled={saving} />
      <Section icon="flask-outline" title="🧪 Demo data">
        <Text style={{ color: c.textMuted }}>Try the ERP with sample students before adding real ones.</Text>
        <View style={[styles.two, { marginTop: 8 }]}>
          <PillButton label="Load demo" icon="database-plus" variant="soft" color={SCHOOL_GREEN} onPress={() => demo("load")} loading={demoBusy} disabled={demoBusy} style={{ flex: 1 }} />
          <PillButton label="Remove demo" icon="database-remove" variant="outline" color={c.danger} onPress={() => demo("remove")} disabled={demoBusy} style={{ flex: 1 }} />
        </View>
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrapRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  fee: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  two: { flexDirection: "row", gap: 8 },
  check: { flexDirection: "row", alignItems: "center" },
});
