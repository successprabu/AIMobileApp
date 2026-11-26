import React, { useCallback, useEffect, useState } from "react";
import { Alert, Image, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";
import { useFocusEffect, useRoute, type RouteProp } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { schoolError } from "../../api/school";
import { resetParentPassword, schoolAi, studentDetail, studentPhotoDataUrl, uploadStudentPhoto } from "../../api/schoolErp";
import { useSchoolAuth } from "../../context/SchoolAuthContext";
import { useAppTheme } from "../../hooks/useAppTheme";
import { Notice, PillButton } from "../../components/ui/AuthUi";
import { gradeFor, type StudentDetail } from "../../school/erp";
import { pushSchoolScreen } from "../../school/schoolMenu";
import { Row, SCHOOL_GREEN, Section, day, inr, shareReceiptPdf, ui } from "./schoolUi";

type Params = { SchoolStudent: { id: string } };

const PROFILE: [keyof StudentDetail["student"], string][] = [
  ["gender", "Gender"],
  ["dob", "Date of birth"],
  ["rollNo", "Roll no"],
  ["admissionDate", "Admitted on"],
  ["parentName", "Parent"],
  ["relation", "Relation"],
  ["parentPhone", "Mobile"],
  ["altPhone", "Other phone"],
  ["parentEmail", "Email"],
  ["parentOccupation", "Occupation"],
  ["address", "Address"],
  ["bloodGroup", "Blood group"],
  ["transportRoute", "Bus route"],
  ["previousSchool", "Previous school"],
  ["medicalNotes", "Medical notes"],
];

/** One student: profile, fees and receipts, attendance, marks, AI insight, parent login. */
export default function StudentDetailScreen() {
  const route = useRoute<RouteProp<Params, "SchoolStudent">>();
  const id = route.params.id;
  const { school } = useSchoolAuth();
  const sid = school?.user.schoolId ?? "";
  const can = (p: string) => school?.user.role === "superadmin" || !!school?.permissions.includes(p);
  const { theme } = useAppTheme();
  const c = theme.colors;
  const [d, setD] = useState<StudentDetail | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [insight, setInsight] = useState("");
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const x = await studentDetail(sid, id);
      setD(x);
      if (x.student.hasPhoto && school) setPhoto(await studentPhotoDataUrl(sid, id, school.token));
    } catch (e) {
      setError(schoolError(e, "Could not load this student."));
    } finally {
      setLoading(false);
    }
  }, [sid, id, school]);
  useEffect(() => {
    void load();
  }, [load]);
  useFocusEffect(
    useCallback(() => {
      if (d) void load();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  if (loading || !d) {
    return (
      <View style={[ui.center, { backgroundColor: c.background }]}>
        {error ? <Notice kind="error" text={error} /> : <ActivityIndicator color={SCHOOL_GREEN} />}
      </View>
    );
  }
  const s = d.student;

  const getInsight = async () => {
    setBusy("ai");
    try {
      setInsight((await schoolAi({ task: "student-insight", schoolId: sid, studentId: s.id })).text);
    } catch (e) {
      setInsight(schoolError(e, "The assistant is not available right now."));
    } finally {
      setBusy("");
    }
  };

  const changePhoto = async (camera: boolean) => {
    const perm = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = camera ? await ImagePicker.launchCameraAsync({ quality: 0.9, allowsEditing: true, aspect: [3, 4] }) : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.9, allowsEditing: true, aspect: [3, 4] });
    if (res.canceled || !res.assets[0]) return;
    setBusy("photo");
    try {
      const img = await ImageManipulator.manipulateAsync(res.assets[0].uri, [{ resize: { width: 480 } }], { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG, base64: true });
      const url = `data:image/jpeg;base64,${img.base64}`;
      await uploadStudentPhoto(sid, s.id, url);
      setPhoto(url);
      setNote("📸 Photo saved. It is used on the ID card.");
    } catch (e) {
      setNote(schoolError(e, "Could not save the photo."));
    } finally {
      setBusy("");
    }
  };

  const resetParent = () => {
    if (!d.parentAccount) return;
    Alert.alert("Reset parent password?", `${d.parentAccount.username} will log in with the mobile number as the password and must change it.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reset",
        onPress: () =>
          void resetParentPassword(d.parentAccount!.id)
            .then(() => setNote("🔑 Done. The parent can log in with the mobile number as password."))
            .catch((e) => setNote(schoolError(e, "Could not reset."))),
      },
    ]);
  };

  const phone = s.parentPhone.replace(/\D/g, "").slice(-10);

  return (
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={ui.wrap} refreshControl={<RefreshControl refreshing={false} onRefresh={() => void load()} />}>
      {note ? <Notice kind="info" text={note} /> : null}
      <View style={[styles.head, { backgroundColor: SCHOOL_GREEN }]}>
        <Pressable onPress={() => can("students.manage") && Alert.alert("Student photo", undefined, [{ text: "Camera", onPress: () => void changePhoto(true) }, { text: "Gallery", onPress: () => void changePhoto(false) }, { text: "Cancel", style: "cancel" }])}>
          {photo ? <Image source={{ uri: photo }} style={styles.photo} /> : <View style={[styles.photo, styles.noPhoto]}><Text style={{ fontSize: 34 }}>🧒</Text></View>}
          {can("students.manage") ? <Text style={styles.photoHint}>{busy === "photo" ? "Saving…" : "📷 Change"}</Text> : null}
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{s.name}</Text>
          <Text style={styles.sub}>
            {s.className} {s.section ?? ""} · {s.admissionNo}
          </Text>
          <Text style={styles.sub}>{s.status}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <PillButton label="Call" icon="phone" variant="soft" color={SCHOOL_GREEN} onPress={() => void Linking.openURL(`tel:${s.parentPhone}`)} style={{ flex: 1 }} />
        <PillButton label="WhatsApp" icon="whatsapp" variant="soft" color={SCHOOL_GREEN} onPress={() => void Linking.openURL(`https://wa.me/91${phone}`)} style={{ flex: 1 }} />
        {can("students.manage") ? <PillButton label="Edit" icon="pencil" variant="soft" color={SCHOOL_GREEN} onPress={() => pushSchoolScreen("SchoolStudentForm", { id: s.id })} style={{ flex: 1 }} /> : null}
      </View>

      <Section icon="cash" title="💰 Fees">
        <Row left="Total" right={inr(d.fees.total)} />
        {d.fees.concession ? <Row left="Concession" right={inr(d.fees.concession)} /> : null}
        <Row left="Paid" right={inr(d.fees.paid)} />
        <Row left="Balance" right={inr(d.fees.balance)} bold bad={d.fees.balance > 0} />
        {can("fees.collect") ? <PillButton label="Collect fee" icon="cash-check" color={SCHOOL_GREEN} onPress={() => pushSchoolScreen("SchoolCollectFee", { studentId: s.id })} style={{ marginTop: 6 }} /> : null}
        {d.payments.slice(0, 8).map((p) => (
          <Pressable
            key={p.id}
            style={styles.line}
            onPress={() =>
              void shareReceiptPdf({ schoolName: school?.schoolName ?? sid, receiptNo: p.receiptNo, date: day(p.date), studentName: s.name, className: s.className, section: s.section, admissionNo: s.admissionNo, academicYear: p.academicYear, head: p.head, amount: p.amount, mode: p.mode, reference: p.reference, collectedBy: p.collectedBy })
            }
          >
            <Text style={{ color: c.text, flex: 1 }}>
              🧾 {p.receiptNo} · {day(p.date)} · {p.mode}
            </Text>
            <Text style={{ color: c.text, fontWeight: "700" }}>{inr(p.amount)}</Text>
          </Pressable>
        ))}
      </Section>

      <Section icon="calendar-check" title="📅 Attendance">
        <Row left="Days marked" right={String(d.attendance.days)} />
        <Row left="Attendance" right={d.attendance.percent == null ? "—" : `${d.attendance.percent}%`} bold />
        {d.attendance.absences.length ? <Text style={{ color: c.textMuted, fontSize: 12 }}>Recent: {d.attendance.absences.slice(0, 5).map((a) => `${day(a.date)} ${a.status}`).join(", ")}</Text> : null}
      </Section>

      <Section icon="clipboard-text-outline" title="🏆 Marks">
        {d.marks.length ? (
          d.marks.map((m) => (
            <View key={m.examId} style={{ marginBottom: 8 }}>
              <Row left={m.exam} right={m.percent != null ? `${m.percent}% · ${gradeFor(m.percent)}` : "—"} bold />
              <Text style={{ color: c.textMuted, fontSize: 12 }}>{m.subjects.filter((x) => x.mark != null).map((x) => `${x.subject} ${x.mark}`).join(" · ")}</Text>
              {m.failed.length ? <Text style={{ color: c.danger, fontSize: 12 }}>Below pass: {m.failed.join(", ")}</Text> : null}
            </View>
          ))
        ) : (
          <Text style={{ color: c.textMuted }}>📝 No marks yet.</Text>
        )}
      </Section>

      <Section icon="robot-happy-outline" title="✨ AI insight">
        {insight ? <Text style={{ color: c.text, lineHeight: 21 }}>{insight}</Text> : <Text style={{ color: c.textMuted }}>Strengths, concerns and next steps from attendance, fees and marks.</Text>}
        <PillButton label="Get AI insight" icon="creation" variant="soft" color={SCHOOL_GREEN} onPress={() => void getInsight()} loading={busy === "ai"} disabled={busy === "ai"} style={{ marginTop: 6 }} />
      </Section>

      <Section icon="account-details" title="👪 Profile">
        {PROFILE.filter(([k]) => s[k]).map(([k, label]) => (
          <Row key={k} left={label} right={String(s[k])} />
        ))}
        {d.parentAccount ? (
          <>
            <Row left="Parent login" right={d.parentAccount.username} />
            <Row left="Last login" right={d.parentAccount.lastLoginAt ? day(d.parentAccount.lastLoginAt) : "Never"} />
            {can("users.manage") || can("students.manage") ? <PillButton label="Reset parent password" icon="key-variant" variant="outline" color={SCHOOL_GREEN} onPress={resetParent} style={{ marginTop: 6 }} /> : null}
          </>
        ) : null}
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 20, marginBottom: 12 },
  photo: { width: 72, height: 90, borderRadius: 12, backgroundColor: "#ffffff33" },
  noPhoto: { alignItems: "center", justifyContent: "center" },
  photoHint: { color: "#fff", fontSize: 11, textAlign: "center", marginTop: 4 },
  name: { color: "#fff", fontSize: 20, fontWeight: "800" },
  sub: { color: "#ffffffd9", marginTop: 2 },
  actions: { flexDirection: "row", gap: 8, marginBottom: 14 },
  line: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 7 },
});
