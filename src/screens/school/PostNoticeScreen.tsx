import React, { useCallback, useEffect, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text, TextInput } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { postCircular, schoolError, staffCirculars, uploadCircularFile, type Circular } from "../../api/school";
import { useSchoolAuth } from "../../context/SchoolAuthContext";
import { useAppTheme } from "../../hooks/useAppTheme";
import { Notice, PillButton } from "../../components/ui/AuthUi";
import { loadSchoolBasics } from "./AttendanceScreen";
import { Chips, SCHOOL_GREEN, day, ui } from "./schoolUi";

const TYPES: Circular["type"][] = ["homework", "circular", "exam"];
const TYPE_LABEL: Record<Circular["type"], string> = { homework: "Homework", circular: "Circular", exam: "Exam timetable" };

/** JPEG under the server's 1 MB limit. */
async function shrinkToDataUrl(a: ImagePicker.ImagePickerAsset): Promise<string> {
  for (const [max, q] of [[1600, 0.7], [1200, 0.6], [900, 0.5]] as const) {
    const scale = Math.min(1, max / Math.max(a.width || max, a.height || max));
    const img = await ImageManipulator.manipulateAsync(a.uri, scale < 1 ? [{ resize: { width: Math.round((a.width || max) * scale) } }] : [], {
      compress: q,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    });
    if (img.base64 && img.base64.length * 0.75 < 950 * 1024) return `data:image/jpeg;base64,${img.base64}`;
  }
  throw new Error("too-large");
}

/** Teacher / office: post homework (with a photo of the board or book), a circular or an exam timetable. */
export default function PostNoticeScreen() {
  const { school } = useSchoolAuth();
  const sid = school?.user.schoolId ?? "";
  const { theme } = useAppTheme();
  const c = theme.colors;

  const [classes, setClasses] = useState<string[]>([]);
  const [type, setType] = useState<Circular["type"]>("homework");
  const [picked, setPicked] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [due, setDue] = useState("");
  const [picking, setPicking] = useState(false);
  const [photo, setPhoto] = useState<{ uri: string; dataUrl: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ kind: "info" | "error" | "success"; text: string } | null>(null);
  const [recent, setRecent] = useState<Awaited<ReturnType<typeof staffCirculars>>>([]);

  const loadRecent = useCallback(async () => {
    try {
      setRecent((await staffCirculars(sid)).slice(0, 15));
    } catch {
      /* list is optional */
    }
  }, [sid]);

  useEffect(() => {
    void loadSchoolBasics(sid)
      .then((b) => setClasses(b.settings.classes.filter((k) => b.students.some((s) => s.className === k && s.status === "Active"))))
      .catch(() => undefined);
    void loadRecent();
  }, [sid, loadRecent]);

  const toggle = (k: string) => setPicked((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));

  const addPhoto = async (camera: boolean) => {
    const perm = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return setNote({ kind: "error", text: "Please allow the camera / photos for this app in your phone settings." });
    const res = camera ? await ImagePicker.launchCameraAsync({ quality: 0.9 }) : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.9 });
    if (res.canceled || !res.assets[0]) return;
    try {
      setPhoto({ uri: res.assets[0].uri, dataUrl: await shrinkToDataUrl(res.assets[0]) });
    } catch {
      setNote({ kind: "error", text: "This photo is too large. Please try another one." });
    }
  };

  const onDue = (e: DateTimePickerEvent, d?: Date) => {
    setPicking(false);
    if (e.type === "set" && d) setDue(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  };

  const send = async () => {
    if (title.trim().length < 2) return setNote({ kind: "error", text: "Please add a title." });
    if (type === "homework" && !picked.length) return setNote({ kind: "error", text: "Choose the class for this homework." });
    setBusy(true);
    setNote(null);
    try {
      const attachment = photo ? { fileId: await uploadCircularFile(sid, photo.dataUrl), name: `${TYPE_LABEL[type]} photo.jpg` } : null;
      await postCircular(sid, { type, title: title.trim(), text: text.trim(), classes: picked, dueDate: type === "homework" ? due : "", attachment });
      setNote({ kind: "success", text: `📣 Posted. Parents of ${picked.length ? picked.join(", ") : "all classes"} see it in the app and get a notification.` });
      setTitle("");
      setText("");
      setDue("");
      setPhoto(null);
      void loadRecent();
    } catch (e) {
      setNote({ kind: "error", text: schoolError(e, "Could not post. Check the network and try again.") });
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={ui.wrap} keyboardShouldPersistTaps="handled">
      {note ? <Notice kind={note.kind} text={note.text} /> : null}
      <Chips items={TYPES} value={type} onChange={setType} label={(t) => TYPE_LABEL[t]} color={SCHOOL_GREEN} />

      <Text style={[ui.label, { color: c.text }]}>For classes {picked.length ? "" : "(none chosen = all classes)"}</Text>
      <View style={styles.wrapRow}>
        {classes.map((k) => {
          const on = picked.includes(k);
          return (
            <Pressable key={k} onPress={() => toggle(k)} style={[ui.chip, { borderColor: on ? SCHOOL_GREEN : c.border, backgroundColor: on ? SCHOOL_GREEN : c.surface }]}>
              <Text style={{ color: on ? "#fff" : c.text, fontWeight: "700" }}>{k}</Text>
            </Pressable>
          );
        })}
      </View>

      <TextInput label="Title" mode="outlined" value={title} onChangeText={setTitle} style={styles.field} activeOutlineColor={SCHOOL_GREEN} placeholder={type === "homework" ? "Maths: exercise 4.2, sums 1–10" : ""} />
      <TextInput label="Details (optional)" mode="outlined" value={text} onChangeText={setText} multiline numberOfLines={4} style={styles.field} activeOutlineColor={SCHOOL_GREEN} />

      {type === "homework" ? (
        <Pressable onPress={() => setPicking(true)} style={[styles.pick, { borderColor: c.border, backgroundColor: c.surface }]}>
          <MaterialCommunityIcons name="calendar" size={20} color={SCHOOL_GREEN} />
          <Text style={{ color: c.text, flex: 1 }}>{due ? `Submit by ${day(due)}` : "Submit by (optional)"}</Text>
          {due ? <MaterialCommunityIcons name="close" size={18} color={c.textMuted} onPress={() => setDue("")} /> : null}
        </Pressable>
      ) : null}
      {picking ? <DateTimePicker value={new Date()} mode="date" minimumDate={new Date()} onChange={onDue} /> : null}

      <View style={styles.photoRow}>
        <PillButton label="Camera" icon="camera" variant="soft" color={SCHOOL_GREEN} onPress={() => void addPhoto(true)} style={{ flex: 1 }} />
        <PillButton label="Gallery" icon="image-outline" variant="soft" color={SCHOOL_GREEN} onPress={() => void addPhoto(false)} style={{ flex: 1 }} />
      </View>
      {photo ? (
        <View style={{ marginTop: 10 }}>
          <Image source={{ uri: photo.uri }} style={styles.preview} resizeMode="cover" />
          <Pressable onPress={() => setPhoto(null)} hitSlop={8}>
            <Text style={{ color: c.danger, fontWeight: "700", marginTop: 6 }}>Remove photo</Text>
          </Pressable>
        </View>
      ) : null}

      <PillButton label="Post to parents" icon="send" color={SCHOOL_GREEN} onPress={() => void send()} loading={busy} disabled={busy} style={{ marginTop: 16 }} />

      {recent.length ? (
        <>
          <Text style={[ui.label, { color: c.text, marginTop: 24 }]}>Recently posted</Text>
          {recent.map((p) => (
            <View key={p.id} style={[styles.post, { borderColor: c.border, backgroundColor: c.surface }]}>
              <Text style={{ color: c.text, fontWeight: "700" }}>{p.title}</Text>
              <Text style={{ color: c.textMuted, fontSize: 12 }}>
                {TYPE_LABEL[p.type]} · {day(p.date)} · {p.classes?.length ? p.classes.join(", ") : "All classes"} · read by {p.readCount} of {p.audience}
              </Text>
            </View>
          ))}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrapRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  field: { marginTop: 12 },
  pick: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 12, padding: 14, marginTop: 12 },
  photoRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  preview: { width: "100%", height: 200, borderRadius: 14 },
  post: { borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 8 },
});
