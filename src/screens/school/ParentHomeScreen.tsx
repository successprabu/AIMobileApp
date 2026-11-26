import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Linking, Pressable, RefreshControl, ScrollView, Share, StyleSheet, View } from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import {
  circularFileUrl,
  markCircularRead,
  parentCampus,
  parentChildren,
  parentCirculars,
  schoolError,
  SCHOOL_SITE,
  type Circular,
  type ParentCampus,
  type ParentChild,
} from "../../api/school";
import { useSchoolAuth } from "../../context/SchoolAuthContext";
import { useAppTheme } from "../../hooks/useAppTheme";
import { Notice, Rise } from "../../components/ui/AuthUi";

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
const day = (iso: string) => {
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};
const KIND: Record<Circular["type"], { label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; color: string }> = {
  homework: { label: "Homework", icon: "book-open-variant", color: "#16a34a" },
  exam: { label: "Exam timetable", icon: "calendar-text", color: "#d97706" },
  circular: { label: "Circular", icon: "bullhorn-outline", color: "#4f46e5" },
};

/** School → Parent home: each child's attendance, fees, marks, notices & homework, bus and library. */
export default function ParentHomeScreen() {
  const { school } = useSchoolAuth();
  const { theme } = useAppTheme();
  const c = theme.colors;
  const styles = useMemo(() => makeStyles(c), [c]);

  const [children, setChildren] = useState<ParentChild[]>([]);
  const [posts, setPosts] = useState<{ schoolId: string; studentId: string; items: Circular[] }[]>([]);
  const [campus, setCampus] = useState<ParentCampus[]>([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError("");
    try {
      const [ch, ps, cp] = await Promise.all([parentChildren(), parentCirculars().catch(() => []), parentCampus().catch(() => [])]);
      setChildren(ch);
      setPosts(ps);
      setCampus(cp);
    } catch (e) {
      setError(schoolError(e, "Could not load your child's details. Pull down to try again."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const child = children[idx];
  const items = posts.find((p) => p.studentId === child?.student.id)?.items ?? [];
  const unread = items.filter((p) => !p.read).length;
  const cc = campus.find((x) => x.studentId === child?.student.id);
  const lastExam = child?.marks[child.marks.length - 1];
  const att = child?.attendanceSummary.percent;

  const togglePost = (p: Circular) => {
    setOpen(open === p.id ? null : p.id);
    if (!p.read && child) {
      void markCircularRead(child.school.id, p.id).catch(() => undefined);
      setPosts((all) => all.map((x) => (x.studentId === child.student.id ? { ...x, items: x.items.map((i) => (i.id === p.id ? { ...i, read: true } : i)) } : x)));
    }
  };

  const openAttachment = async (p: Circular) => {
    if (!child || !p.attachment || !school) return;
    try {
      const target = `${FileSystem.cacheDirectory ?? ""}${p.attachment.fileId}`;
      const r = await FileSystem.downloadAsync(circularFileUrl(child.school.id, p.id), target, { headers: { Authorization: `Bearer ${school.token}` } });
      if (r.status !== 200) throw new Error();
      await Sharing.shareAsync(r.uri, { dialogTitle: p.attachment.name });
    } catch {
      Alert.alert("Could not open", "Please try again, or open it in the Parent Portal on the school website.");
    }
  };

  const shareReceipt = (p: ParentChild["payments"][number]) => {
    if (!child) return;
    void Share.share({
      message: `${child.school.label} – Fee receipt ${p.receiptNo}\n${child.student.name} (${child.student.className} ${child.student.section ?? ""})\n${p.head}: ${inr(p.amount)} by ${p.mode} on ${day(p.date)}${p.reference ? `\nRef: ${p.reference}` : ""}`,
    });
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator color={c.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: c.background }}
      contentContainerStyle={styles.wrap}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} />}
    >
      {error ? <Notice kind="error" text={error} /> : null}
      {!child && !error ? <Notice kind="info" text="No children are linked to this mobile number yet. Please ask the school office." /> : null}

      {children.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 12 }}>
          {children.map((ch, i) => (
            <Pressable key={ch.student.id} onPress={() => setIdx(i)} style={[styles.chip, i === idx && { backgroundColor: c.primary, borderColor: c.primary }]}>
              <Text style={{ color: i === idx ? "#fff" : c.text, fontWeight: "700" }}>{ch.student.name.split(" ")[0]}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      {child ? (
        <>
          <Rise>
            <View style={styles.hello}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{child.student.name.charAt(0)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{child.student.name}</Text>
                <Text style={styles.muted}>
                  Class {child.student.className} {child.student.section ?? ""} · {child.student.admissionNo} · {child.settings.academicYear}
                </Text>
              </View>
            </View>
          </Rise>

          <View style={styles.tiles}>
            <Tile c={c} icon="calendar-check" label="Attendance" value={att == null ? "—" : `${att}%`} bad={att != null && att < child.settings.attendanceAlertPercent} />
            <Tile c={c} icon="cash" label={child.fees.balance > 0 ? "Fee balance" : "Fees"} value={child.fees.balance > 0 ? inr(child.fees.balance) : "Paid"} bad={child.fees.balance > 0} />
            <Tile c={c} icon="school-outline" label={lastExam?.exam ?? "Results"} value={lastExam?.percent != null ? `${lastExam.percent}%` : "—"} />
          </View>

          {cc?.bus.alerts.map((a) => (
            <View key={a.id} style={styles.alert}>
              <MaterialCommunityIcons name="bus-alert" size={22} color="#92400e" />
              <Text style={{ color: "#78350f", flex: 1 }}>
                <Text style={{ fontWeight: "800", color: "#78350f" }}>{a.routeName}: </Text>
                {a.text}
              </Text>
            </View>
          ))}

          <Section c={c} icon="bullhorn-outline" title={`Notices & homework${unread ? ` (${unread} new)` : ""}`}>
            {items.length ? (
              items.slice(0, 30).map((p) => (
                <View key={p.id} style={[styles.post, !p.read && { borderColor: c.primary }]}>
                  <Pressable onPress={() => togglePost(p)} style={styles.postHead}>
                    <MaterialCommunityIcons name={KIND[p.type].icon} size={22} color={KIND[p.type].color} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: c.text, fontWeight: "700" }}>{p.title}</Text>
                      <Text style={styles.small}>
                        {KIND[p.type].label} · {day(p.date)}
                        {p.dueDate ? ` · submit by ${day(p.dueDate)}` : ""}
                      </Text>
                    </View>
                    {!p.read ? <Text style={styles.newDot}>New</Text> : null}
                  </Pressable>
                  {open === p.id ? (
                    <View style={styles.postBody}>
                      {p.text ? <Text style={{ color: c.text }}>{p.text}</Text> : null}
                      {p.attachment ? (
                        <Pressable onPress={() => void openAttachment(p)} style={styles.attach}>
                          <MaterialCommunityIcons name="paperclip" size={18} color={c.primary} />
                          <Text style={{ color: c.primary, fontWeight: "700" }}>{p.attachment.name}</Text>
                        </Pressable>
                      ) : null}
                      <Text style={styles.small}>— {p.createdBy}</Text>
                    </View>
                  ) : null}
                </View>
              ))
            ) : (
              <Text style={styles.muted}>No notices or homework yet.</Text>
            )}
          </Section>

          <Section c={c} icon="cash-multiple" title="Fees">
            <Row c={c} left={`Total for ${child.settings.academicYear}`} right={inr(child.fees.total)} />
            <Row c={c} left="Paid" right={inr(child.fees.paid)} />
            <Row c={c} left="Balance" right={inr(child.fees.balance)} bold bad={child.fees.balance > 0} />
            {child.payments.slice(0, 10).map((p) => (
              <Pressable key={p.id} onPress={() => shareReceipt(p)} style={styles.receipt}>
                <MaterialCommunityIcons name="receipt" size={20} color={c.textMuted} />
                <Text style={{ flex: 1, color: c.text }}>
                  {p.receiptNo} · {day(p.date)} · {p.mode}
                </Text>
                <Text style={{ color: c.text, fontWeight: "700" }}>{inr(p.amount)}</Text>
                <MaterialCommunityIcons name="share-variant" size={18} color={c.primary} />
              </Pressable>
            ))}
            {child.fees.balance > 0 ? (
              <Pressable onPress={() => void Linking.openURL(`${SCHOOL_SITE}/login`)} style={styles.link}>
                <Text style={{ color: c.primary, fontWeight: "700" }}>Pay online in the Parent Portal (website) →</Text>
              </Pressable>
            ) : null}
          </Section>

          <Section c={c} icon="bus-school" title="Bus">
            {cc?.bus.name ? (
              <>
                <Text style={{ color: c.text, fontWeight: "700" }}>
                  {cc.bus.name} · {cc.bus.vehicleNo}
                </Text>
                <Text style={{ color: c.text }}>
                  Stop: {cc.bus.stop || "—"}
                  {cc.bus.stopTimes ? ` · pick-up ${cc.bus.stopTimes.morning || "—"} · drop ${cc.bus.stopTimes.evening || "—"}` : ""}
                </Text>
                {cc.bus.driverPhone ? (
                  <Pressable onPress={() => void Linking.openURL(`tel:${cc.bus.driverPhone}`)} style={styles.attach}>
                    <MaterialCommunityIcons name="phone" size={18} color={c.primary} />
                    <Text style={{ color: c.primary, fontWeight: "700" }}>
                      Driver {cc.bus.driverName ?? ""} · {cc.bus.driverPhone}
                    </Text>
                  </Pressable>
                ) : null}
              </>
            ) : (
              <Text style={styles.muted}>{child.student.name.split(" ")[0]} does not use the school bus.</Text>
            )}
          </Section>

          <Section c={c} icon="clipboard-text-outline" title="Report card">
            {child.marks.length ? (
              child.marks.map((m) => (
                <View key={m.examId} style={{ marginBottom: 10 }}>
                  <Row c={c} left={m.exam} right={m.percent != null ? `${m.percent}%` : "—"} bold />
                  <Text style={styles.small}>{m.subjects.filter((s) => s.mark != null).map((s) => `${s.subject} ${s.mark}/${m.maxMarks}`).join(" · ")}</Text>
                  {m.remark ? <Text style={[styles.small, { fontStyle: "italic" }]}>“{m.remark}”</Text> : null}
                </View>
              ))
            ) : (
              <Text style={styles.muted}>No marks yet.</Text>
            )}
          </Section>

          <Section c={c} icon="library-shelves" title="Library books">
            {cc?.books.length ? (
              cc.books.map((b) => <Row key={b.id} c={c} left={b.title} right={`return by ${day(b.dueDate)}`} bad={b.dueDate < new Date().toISOString().slice(0, 10)} />)
            ) : (
              <Text style={styles.muted}>No library books now.</Text>
            )}
          </Section>
        </>
      ) : null}
    </ScrollView>
  );
}

type Colors = ReturnType<typeof useAppTheme>["theme"]["colors"];

function Tile({ c, icon, label, value, bad }: { c: Colors; icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; value: string; bad?: boolean }) {
  return (
    <View style={[tileStyles.tile, { backgroundColor: c.surface, borderColor: c.border }]}>
      <MaterialCommunityIcons name={icon} size={22} color={c.primary} />
      <Text style={{ color: bad ? c.danger : c.text, fontWeight: "800", fontSize: 18, marginTop: 4 }}>{value}</Text>
      <Text style={{ color: c.textMuted, fontSize: 12 }} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function Section({ c, icon, title, children }: { c: Colors; icon: keyof typeof MaterialCommunityIcons.glyphMap; title: string; children: React.ReactNode }) {
  return (
    <View style={[tileStyles.section, { backgroundColor: c.surface, borderColor: c.border }]}>
      <View style={tileStyles.sectionHead}>
        <MaterialCommunityIcons name={icon} size={20} color={c.primary} />
        <Text style={{ color: c.text, fontWeight: "800", fontSize: 16 }}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function Row({ c, left, right, bold, bad }: { c: Colors; left: string; right: string; bold?: boolean; bad?: boolean }) {
  return (
    <View style={tileStyles.row}>
      <Text style={{ color: c.text, flex: 1, fontWeight: bold ? "700" : "400" }}>{left}</Text>
      <Text style={{ color: bad ? c.danger : c.text, fontWeight: bold ? "800" : "600" }}>{right}</Text>
    </View>
  );
}

const tileStyles = StyleSheet.create({
  tile: { flex: 1, padding: 12, borderRadius: 16, borderWidth: 1, alignItems: "flex-start" },
  section: { padding: 14, borderRadius: 18, borderWidth: 1, marginBottom: 14, gap: 6 },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 3 },
});

function makeStyles(c: Colors) {
  return StyleSheet.create({
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    wrap: { padding: 16, paddingBottom: 40 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface },
    hello: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
    avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: c.primary, alignItems: "center", justifyContent: "center" },
    avatarText: { color: "#fff", fontSize: 22, fontWeight: "800" },
    name: { color: c.text, fontSize: 20, fontWeight: "800" },
    muted: { color: c.textMuted },
    small: { color: c.textMuted, fontSize: 12 },
    tiles: { flexDirection: "row", gap: 10, marginBottom: 14 },
    alert: { flexDirection: "row", gap: 8, alignItems: "flex-start", backgroundColor: "#fef3c7", padding: 12, borderRadius: 14, marginBottom: 12 },
    post: { borderWidth: 1, borderColor: c.border, borderRadius: 14, marginBottom: 8, overflow: "hidden" },
    postHead: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12 },
    postBody: { paddingHorizontal: 12, paddingBottom: 12, paddingLeft: 44, gap: 6 },
    newDot: { backgroundColor: "#fbbf24", color: "#1f1300", fontSize: 11, fontWeight: "800", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, overflow: "hidden" },
    attach: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 4 },
    receipt: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8, borderTopWidth: 1, borderTopColor: c.border },
    link: { paddingTop: 8 },
  });
}
