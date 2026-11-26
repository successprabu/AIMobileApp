import React, { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { ActivityIndicator, Text, TextInput } from "react-native-paper";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { schoolError } from "../../api/school";
import { createStudent, getSettings, studentDetail, updateStudent } from "../../api/schoolErp";
import { useSchoolAuth } from "../../context/SchoolAuthContext";
import { useAppTheme } from "../../hooks/useAppTheme";
import { Notice, PillButton } from "../../components/ui/AuthUi";
import type { SchoolSettings, Student, StudentField } from "../../school/erp";
import { Chips, SCHOOL_GREEN, ui } from "./schoolUi";

type Params = { SchoolStudentForm: { id?: string } };
type Form = Record<string, string>;

const CHOICES: Record<string, string[]> = {
  gender: ["Male", "Female", "Other"],
  relation: ["Father", "Mother", "Guardian"],
  bloodGroup: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
};
const KEYBOARD: Record<string, "phone-pad" | "email-address" | "number-pad"> = {
  parentPhone: "phone-pad",
  altPhone: "phone-pad",
  parentEmail: "email-address",
  aadhaarNo: "number-pad",
  rollNo: "number-pad",
};
const HINT: Record<string, string> = { dob: "YYYY-MM-DD", admissionDate: "YYYY-MM-DD" };

/** Add or edit a student: the same fields and required fields as the website's form. */
export default function StudentFormScreen() {
  const route = useRoute<RouteProp<Params, "SchoolStudentForm">>();
  const navigation = useNavigation();
  const id = route.params?.id;
  const { school } = useSchoolAuth();
  const sid = school?.user.schoolId ?? "";
  const { theme } = useAppTheme();
  const c = theme.colors;
  const [settings, setSettings] = useState<SchoolSettings | null>(null);
  const [fields, setFields] = useState<StudentField[]>([]);
  const [f, setF] = useState<Form>({});
  const [status, setStatus] = useState<Student["status"]>("Active");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<{ kind: "error" | "success"; text: string } | null>(null);

  useEffect(() => {
    navigation.setOptions({ title: id ? "Edit student" : "New student" });
    void (async () => {
      try {
        const st = await getSettings(sid);
        setSettings(st.settings);
        setFields(st.studentFields);
        if (id) {
          const d = await studentDetail(sid, id);
          const s = d.student as unknown as Record<string, unknown>;
          setF(Object.fromEntries([...st.studentFields.map((x) => x.key), "concession"].map((k) => [k, s[k] == null ? "" : String(s[k])])));
          setStatus(d.student.status);
        } else {
          setF({ className: st.settings.classes[0] ?? "", admissionDate: new Date().toISOString().slice(0, 10) });
        }
      } catch (e) {
        setNote({ kind: "error", text: schoolError(e, "Could not load the form.") });
      } finally {
        setLoading(false);
      }
    })();
  }, [sid, id, navigation]);

  const set = (k: string, v: string) => setF((x) => ({ ...x, [k]: v }));
  const required = new Set(settings?.requiredStudentFields ?? []);

  const save = async () => {
    const missing = fields.filter((x) => required.has(x.key) && !(f[x.key] ?? "").trim()).map((x) => x.label);
    if (missing.length) return setNote({ kind: "error", text: `Please fill: ${missing.join(", ")}.` });
    const body: Record<string, unknown> = {};
    for (const x of fields) body[x.key] = (f[x.key] ?? "").trim();
    body.concession = Number(f.concession) || 0;
    if (id) body.status = status;
    setSaving(true);
    setNote(null);
    try {
      const r = id ? await updateStudent(sid, id, body as Partial<Student>) : await createStudent(sid, body as Partial<Student>);
      const login = r.parentLogin ? ` Parent login: ${r.parentLogin.username}${r.parentLogin.created ? " (password = mobile number)" : ""}.` : "";
      setNote({ kind: "success", text: id ? `✅ Saved.${login}` : `🎉 Admitted: ${r.item.admissionNo}.${login}` });
      if (!id) setF({ className: f.className, admissionDate: f.admissionDate });
      else setTimeout(() => navigation.goBack(), 900);
    } catch (e) {
      setNote({ kind: "error", text: schoolError(e, "Could not save. Please check and try again.") });
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
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={ui.wrap} keyboardShouldPersistTaps="handled">
      {note ? <Notice kind={note.kind} text={note.text} /> : null}
      {fields.map((x) => {
        const label = `${x.label}${required.has(x.key) ? " *" : ""}`;
        if (x.key === "className" || x.key === "section" || CHOICES[x.key]) {
          const items = x.key === "className" ? settings?.classes ?? [] : x.key === "section" ? ["", ...(settings?.sections ?? [])] : ["", ...CHOICES[x.key]];
          return (
            <View key={x.key}>
              <Text style={[ui.label, { color: c.text }]}>{label}</Text>
              <Chips items={items} value={f[x.key] ?? ""} onChange={(v) => set(x.key, v)} label={(v) => v || "—"} color={SCHOOL_GREEN} />
            </View>
          );
        }
        return (
          <TextInput
            key={x.key}
            mode="outlined"
            label={label}
            placeholder={HINT[x.key]}
            value={f[x.key] ?? ""}
            onChangeText={(v) => set(x.key, v)}
            keyboardType={KEYBOARD[x.key] ?? "default"}
            multiline={x.key === "address" || x.key === "medicalNotes"}
            autoCapitalize={x.key === "parentEmail" ? "none" : "words"}
            style={{ marginTop: 10 }}
            activeOutlineColor={SCHOOL_GREEN}
          />
        );
      })}
      <TextInput mode="outlined" label="Fee concession (₹ per year)" value={f.concession ?? ""} onChangeText={(v) => set("concession", v.replace(/[^0-9]/g, ""))} keyboardType="number-pad" style={{ marginTop: 10 }} activeOutlineColor={SCHOOL_GREEN} />
      {id ? (
        <>
          <Text style={[ui.label, { color: c.text }]}>Status</Text>
          <Chips items={["Active", "Left", "Alumni"] as Student["status"][]} value={status} onChange={setStatus} color={SCHOOL_GREEN} />
        </>
      ) : (
        <Text style={{ color: c.textMuted, marginTop: 10, fontSize: 12 }}>The admission number is given automatically. A parent login is made with the parent mobile number.</Text>
      )}
      <PillButton label={id ? "Save changes" : "Admit student"} icon="content-save-outline" color={SCHOOL_GREEN} onPress={() => void save()} loading={saving} disabled={saving} style={{ marginTop: 18 }} />
    </ScrollView>
  );
}
