import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AppState, FlatList, Pressable, StyleSheet, View } from "react-native";
import { ActivityIndicator, IconButton, Text } from "react-native-paper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getAttendance, putAttendance, schoolError, schoolSettings, schoolStudents, type AttStatus, type SchoolSettings, type SchoolStudent } from "../../api/school";
import { useSchoolAuth } from "../../context/SchoolAuthContext";
import { useAppTheme } from "../../hooks/useAppTheme";
import { Notice, PillButton } from "../../components/ui/AuthUi";
import { flushAttendance, isOffline, pendingAttendance, queueAttendance } from "../../school/attendanceQueue";
import { Chips, SCHOOL_GREEN, day, shiftDay, todayIso, ui } from "./schoolUi";

const STATUS: { k: AttStatus; label: string; color: string }[] = [
  { k: "P", label: "P", color: "#16a34a" },
  { k: "A", label: "A", color: "#dc2626" },
  { k: "L", label: "L", color: "#d97706" },
  { k: "H", label: "½", color: "#2563eb" },
];

/** Class list and settings kept on the phone, so attendance can be marked without network. */
export async function loadSchoolBasics(sid: string): Promise<{ settings: SchoolSettings; students: SchoolStudent[]; cached: boolean }> {
  const key = `schoolBasics:${sid}`;
  try {
    const [settings, students] = await Promise.all([schoolSettings(sid), schoolStudents(sid)]);
    void AsyncStorage.setItem(key, JSON.stringify({ settings, students }));
    return { settings, students, cached: false };
  } catch (e) {
    const raw = isOffline(e) ? await AsyncStorage.getItem(key) : null;
    if (!raw) throw e;
    return { ...(JSON.parse(raw) as { settings: SchoolSettings; students: SchoolStudent[] }), cached: true };
  }
}

/** Teacher: mark today's attendance for one class, one tap per child. Works offline. */
export default function AttendanceScreen() {
  const { school } = useSchoolAuth();
  const sid = school?.user.schoolId ?? "";
  const { theme } = useAppTheme();
  const c = theme.colors;

  const [settings, setSettings] = useState<SchoolSettings | null>(null);
  const [students, setStudents] = useState<SchoolStudent[]>([]);
  const [cls, setCls] = useState<string | null>(null);
  const [sec, setSec] = useState<string>("All");
  const [date, setDate] = useState(todayIso());
  const [marks, setMarks] = useState<Record<string, AttStatus>>({});
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<{ kind: "info" | "error" | "success"; text: string } | null>(null);
  const [pending, setPending] = useState(0);

  const refreshPending = useCallback(async () => setPending((await pendingAttendance()).length), []);

  const sendWaiting = useCallback(async () => {
    const n = await flushAttendance();
    await refreshPending();
    if (n) setNote({ kind: "success", text: `Sent attendance saved on the phone (${n} day${n > 1 ? "s" : ""}).` });
  }, [refreshPending]);

  useEffect(() => {
    void (async () => {
      try {
        const b = await loadSchoolBasics(sid);
        setSettings(b.settings);
        setStudents(b.students.filter((s) => s.status === "Active"));
        const used = b.settings.classes.filter((k) => b.students.some((s) => s.className === k));
        setCls(used[0] ?? b.settings.classes[0] ?? null);
        if (b.cached) setNote({ kind: "info", text: "No network: using the class list saved on this phone." });
      } catch (e) {
        setNote({ kind: "error", text: schoolError(e, "Could not load the classes. Check the network and try again.") });
      } finally {
        setLoading(false);
      }
      await sendWaiting();
    })();
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") void sendWaiting();
    });
    return () => sub.remove();
  }, [sid, sendWaiting]);

  // Saved marks for the chosen day (server first, then what waits on the phone).
  useEffect(() => {
    if (!sid) return;
    let gone = false;
    void (async () => {
      let rec: Record<string, AttStatus> = {};
      try {
        rec = await getAttendance(sid, date);
      } catch {
        /* offline: start empty */
      }
      const waiting = (await pendingAttendance()).find((p) => p.sid === sid && p.date === date);
      for (const [id, st] of Object.entries(waiting?.records ?? {})) {
        if (st) rec[id] = st;
        else delete rec[id];
      }
      if (!gone) {
        setMarks(rec);
        setDirty(false);
      }
    })();
    return () => {
      gone = true;
    };
  }, [sid, date]);

  const sections = useMemo(() => {
    const s = [...new Set(students.filter((x) => x.className === cls).map((x) => x.section || ""))].filter(Boolean).sort();
    return s.length > 1 ? ["All", ...s] : [];
  }, [students, cls]);

  const list = useMemo(
    () =>
      students
        .filter((s) => s.className === cls && (sec === "All" || !sections.length || (s.section || "") === sec))
        .sort((a, b) => (Number(a.rollNo) || 9999) - (Number(b.rollNo) || 9999) || a.name.localeCompare(b.name)),
    [students, cls, sec, sections.length],
  );

  const set = (id: string, st: AttStatus) => {
    setMarks((m) => ({ ...m, [id]: st }));
    setDirty(true);
  };
  const allPresent = () => {
    setMarks((m) => {
      const next = { ...m };
      for (const s of list) if (!next[s.id]) next[s.id] = "P";
      return next;
    });
    setDirty(true);
  };

  const counts = list.reduce((t, s) => ((t[marks[s.id] ?? "-"] = (t[marks[s.id] ?? "-"] ?? 0) + 1), t), {} as Record<string, number>);

  const save = async () => {
    const records: Record<string, AttStatus> = {};
    for (const s of list) if (marks[s.id]) records[s.id] = marks[s.id];
    if (!Object.keys(records).length) return setNote({ kind: "error", text: "Mark at least one child." });
    setSaving(true);
    setNote(null);
    try {
      const n = await putAttendance(sid, date, records);
      setNote({ kind: "success", text: `✅ Saved ${n} for ${cls}${sec !== "All" && sections.length ? ` ${sec}` : ""} on ${day(date)}.` });
      setDirty(false);
    } catch (e) {
      if (isOffline(e)) {
        await queueAttendance(sid, date, records);
        await refreshPending();
        setNote({ kind: "info", text: "No network. Saved on this phone; it is sent automatically when you are online." });
        setDirty(false);
      } else setNote({ kind: "error", text: schoolError(e, "Could not save. Please try again.") });
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
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        ListHeaderComponent={
          <View style={{ gap: 8, marginBottom: 8 }}>
            {pending ? (
              <Pressable onPress={() => void sendWaiting()}>
                <Notice kind="info" text={`${pending} day${pending > 1 ? "s" : ""} of attendance waiting on this phone. Tap to send now.`} />
              </Pressable>
            ) : null}
            {note ? <Notice kind={note.kind} text={note.text} /> : null}
            <View style={styles.dateRow}>
              <IconButton icon="chevron-left" onPress={() => setDate(shiftDay(date, -1))} accessibilityLabel="Previous day" />
              <Text style={{ color: c.text, fontWeight: "800", fontSize: 16, flex: 1, textAlign: "center" }}>
                {date === todayIso() ? "Today · " : ""}
                {new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
              </Text>
              <IconButton icon="chevron-right" disabled={date >= todayIso()} onPress={() => setDate(shiftDay(date, 1))} accessibilityLabel="Next day" />
            </View>
            <Chips items={settings?.classes.filter((k) => students.some((s) => s.className === k)) ?? []} value={cls} onChange={(v) => { setCls(v); setSec("All"); }} color={SCHOOL_GREEN} />
            {sections.length ? <Chips items={sections} value={sec} onChange={setSec} color={SCHOOL_GREEN} /> : null}
            <View style={styles.summary}>
              <Text style={{ color: c.textMuted, flex: 1 }}>
                {list.length} children · P {counts.P ?? 0} · A {counts.A ?? 0} · L {counts.L ?? 0} · ½ {counts.H ?? 0}
                {counts["-"] ? ` · ${counts["-"]} not marked` : ""}
              </Text>
              <Pressable onPress={allPresent} hitSlop={8}>
                <Text style={{ color: SCHOOL_GREEN, fontWeight: "800" }}>Rest present</Text>
              </Pressable>
            </View>
          </View>
        }
        ListEmptyComponent={<Text style={{ color: c.textMuted, textAlign: "center", marginTop: 24 }}>No children in this class.</Text>}
        renderItem={({ item: s }) => (
          <View style={[styles.child, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.text, fontWeight: "700" }}>
                {s.rollNo ? `${s.rollNo}. ` : ""}
                {s.name}
              </Text>
              <Text style={{ color: c.textMuted, fontSize: 12 }}>
                {s.className} {s.section ?? ""} · {s.admissionNo}
              </Text>
            </View>
            {STATUS.map((o) => {
              const on = marks[s.id] === o.k;
              return (
                <Pressable
                  key={o.k}
                  onPress={() => set(s.id, o.k)}
                  accessibilityRole="button"
                  accessibilityLabel={`${s.name} ${{ P: "present", A: "absent", L: "leave", H: "half day" }[o.k]}`}
                  accessibilityState={{ selected: on }}
                  style={[styles.st, { borderColor: o.color, backgroundColor: on ? o.color : "transparent" }]}
                >
                  <Text style={{ color: on ? "#fff" : o.color, fontWeight: "800" }}>{o.label}</Text>
                </Pressable>
              );
            })}
          </View>
        )}
      />
      <View style={[styles.bar, { backgroundColor: c.surface, borderTopColor: c.border }]}>
        <PillButton label={dirty ? "Save attendance" : "Saved"} icon="content-save-outline" color={SCHOOL_GREEN} onPress={() => void save()} loading={saving} disabled={saving || !list.length} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dateRow: { flexDirection: "row", alignItems: "center" },
  summary: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  child: { flexDirection: "row", alignItems: "center", gap: 6, padding: 10, borderRadius: 14, borderWidth: 1, marginBottom: 8 },
  st: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  bar: { position: "absolute", left: 0, right: 0, bottom: 0, padding: 12, paddingBottom: 20, borderTopWidth: 1 },
});
