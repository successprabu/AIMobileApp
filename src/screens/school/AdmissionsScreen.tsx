import React, { useCallback, useEffect, useState } from "react";
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Text, TextInput } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { applications, enquiries, schoolError, setApplicationStatus, setEnquiryStatus, type Application, type Enquiry } from "../../api/school";
import { admitApplication, applicationFileToShare, getSettings, updateApplication } from "../../api/schoolErp";
import type { Application as FullApplication } from "../../school/erp";
import * as Sharing from "expo-sharing";
import { PillButton } from "../../components/ui/AuthUi";
import { useSchoolAuth } from "../../context/SchoolAuthContext";
import { useAppTheme } from "../../hooks/useAppTheme";
import { Notice } from "../../components/ui/AuthUi";
import Sheet from "../../components/ui/Sheet";
import { Chips, SCHOOL_GREEN, day, ui } from "./schoolUi";

type Tab = "Enquiries" | "Applications";
type Pick = { kind: "enquiry"; item: Enquiry } | { kind: "application"; item: Application };

const tone = (s: string) =>
  /new|submitted/i.test(s) ? "#4f46e5" : /admitted|approved/i.test(s) ? "#16a34a" : /closed|rejected/i.test(s) ? "#64748b" : "#d97706";

/** Office: website enquiries and admission applications, with call / WhatsApp and status changes. */
export default function AdmissionsScreen() {
  const { school } = useSchoolAuth();
  const sid = school?.user.schoolId ?? "";
  const { theme } = useAppTheme();
  const c = theme.colors;

  const [tab, setTab] = useState<Tab>("Enquiries");
  const [enq, setEnq] = useState<{ items: Enquiry[]; statuses: string[] }>({ items: [], statuses: [] });
  const [apps, setApps] = useState<{ items: Application[]; statuses: string[] }>({ items: [], statuses: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [pick, setPick] = useState<Pick | null>(null);
  const [admit, setAdmit] = useState<Application | null>(null);
  const [admitCls, setAdmitCls] = useState("");
  const [admitSec, setAdmitSec] = useState("");
  const [admitBusy, setAdmitBusy] = useState(false);
  const [classes, setClasses] = useState<string[]>([]);
  const [sections, setSections] = useState<string[]>([]);
  const [done, setDone] = useState("");
  // Managing one application: status, a note for the office, a message the parent sees, and the history.
  const [manage, setManage] = useState<FullApplication | null>(null);
  const [mStatus, setMStatus] = useState("");
  const [mNote, setMNote] = useState("");
  const [mPublic, setMPublic] = useState("");
  const [mBusy, setMBusy] = useState(false);
  const openManage = (a: Application) => {
    const full = a as unknown as FullApplication;
    setManage(full);
    setMStatus(full.status);
    setMNote("");
    setMPublic(full.publicNote ?? "");
  };
  const saveManage = async () => {
    if (!manage) return;
    setMBusy(true);
    try {
      const item = await updateApplication(sid, manage.id, {
        ...(mStatus !== manage.status ? { status: mStatus } : {}),
        ...(mNote.trim() ? { note: mNote.trim() } : {}),
        publicNote: mPublic.trim(),
      });
      setApps((x) => ({ ...x, items: x.items.map((i) => (i.id === item.id ? (item as unknown as Application) : i)) }));
      setManage(null);
      setDone(mStatus !== manage.status ? `✅ Status is now ${mStatus}. The parent is emailed.` : "✅ Saved.");
    } catch (e) {
      setError(schoolError(e, "Could not save."));
    } finally {
      setMBusy(false);
    }
  };
  const canAdmit = school?.user.role === "superadmin" || !!school?.permissions.includes("students.manage");
  useEffect(() => {
    void getSettings(sid)
      .then((r) => {
        setClasses(r.settings.classes);
        setSections(r.settings.sections);
      })
      .catch(() => undefined);
  }, [sid]);

  const doAdmit = async () => {
    if (!admit || !admitCls) return;
    setAdmitBusy(true);
    try {
      const r = await admitApplication(sid, admit.id, { className: admitCls, section: admitSec });
      setApps((x) => ({ ...x, items: x.items.map((i) => (i.id === admit.id ? { ...i, status: "Admitted" } : i)) }));
      setDone(`🎉 ${admit.student.name} admitted. Admission no ${r.student.admissionNo}. The parent login is ready.`);
      setAdmit(null);
    } catch (e) {
      setError(schoolError(e, "Could not admit."));
    } finally {
      setAdmitBusy(false);
    }
  };

  const openDoc = async (a: Application & { documents?: { label: string; fileId: string }[] }, fileId: string) => {
    try {
      const uri = await applicationFileToShare(sid, a.id, fileId, school?.token ?? "");
      await Sharing.shareAsync(uri);
    } catch {
      setError("Could not open the document.");
    }
  };

  const load = useCallback(async () => {
    setError("");
    try {
      const [e, a] = await Promise.all([enquiries(sid), applications(sid).catch(() => ({ items: [], statuses: [] }))]);
      setEnq(e);
      setApps(a);
    } catch (err) {
      setError(schoolError(err, "Could not load enquiries. Pull down to try again."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [sid]);

  useEffect(() => {
    void load();
  }, [load]);

  const change = async (status: string) => {
    if (!pick) return;
    const p = pick;
    setPick(null);
    try {
      if (p.kind === "enquiry") {
        await setEnquiryStatus(p.item.schoolId || sid, p.item.id, status);
        setEnq((x) => ({ ...x, items: x.items.map((i) => (i.id === p.item.id ? { ...i, status } : i)) }));
      } else {
        await setApplicationStatus(sid, p.item.id, status);
        setApps((x) => ({ ...x, items: x.items.map((i) => (i.id === p.item.id ? { ...i, status } : i)) }));
      }
    } catch (e) {
      setError(schoolError(e, "Could not change the status."));
    }
  };

  const contact = (phone: string, name: string) => (
    <View style={styles.actions}>
      <Pressable onPress={() => void Linking.openURL(`tel:${phone}`)} style={styles.act} hitSlop={6}>
        <MaterialCommunityIcons name="phone" size={18} color={SCHOOL_GREEN} />
        <Text style={{ color: SCHOOL_GREEN, fontWeight: "700" }}>Call</Text>
      </Pressable>
      <Pressable
        onPress={() => void Linking.openURL(`https://wa.me/91${phone.replace(/\D/g, "").slice(-10)}?text=${encodeURIComponent(`Hello ${name}, this is ${school?.schoolName ?? "the school"} office.`)}`)}
        style={styles.act}
        hitSlop={6}
      >
        <MaterialCommunityIcons name="whatsapp" size={18} color={SCHOOL_GREEN} />
        <Text style={{ color: SCHOOL_GREEN, fontWeight: "700" }}>WhatsApp</Text>
      </Pressable>
    </View>
  );

  const badge = (s: string, onPress: () => void) => (
    <Pressable onPress={onPress} style={[styles.badge, { backgroundColor: `${tone(s)}1f` }]} accessibilityRole="button" accessibilityLabel={`Status ${s}, change`}>
      <Text style={{ color: tone(s), fontWeight: "800", fontSize: 12 }}>{s} ▾</Text>
    </Pressable>
  );

  if (loading) {
    return (
      <View style={[ui.center, { backgroundColor: c.background }]}>
        <ActivityIndicator color={SCHOOL_GREEN} />
      </View>
    );
  }

  const newEnq = enq.items.filter((e) => e.status === "New").length;
  const newApps = apps.items.filter((a) => a.status === "Submitted").length;

  return (
    <>
      <ScrollView
        style={{ backgroundColor: c.background }}
        contentContainerStyle={ui.wrap}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} />}
      >
        {error ? <Notice kind="error" text={error} /> : null}
        {done ? <Notice kind="success" text={done} /> : null}
        <Chips<Tab> items={["Enquiries", "Applications"]} value={tab} onChange={setTab} label={(t) => (t === "Enquiries" ? `Enquiries${newEnq ? ` (${newEnq} new)` : ""}` : `Applications${newApps ? ` (${newApps} new)` : ""}`)} color={SCHOOL_GREEN} />
        <View style={{ height: 10 }} />
        {tab === "Enquiries"
          ? enq.items.slice(0, 100).map((e) => (
              <View key={e.id} style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
                <View style={styles.head}>
                  <Text style={{ color: c.text, fontWeight: "800", flex: 1 }}>{e.parentName}</Text>
                  {badge(e.status, () => setPick({ kind: "enquiry", item: e }))}
                </View>
                <Text style={{ color: c.textMuted, fontSize: 12 }}>
                  {e.type === "admission" ? "Admission" : e.type === "alumni" ? "Alumni" : "Message"} · {day(e.createdAt)}
                  {e.studentName ? ` · ${e.studentName}` : ""}
                  {e.grade ? ` · ${e.grade}` : ""}
                </Text>
                {e.message ? <Text style={{ color: c.text, marginTop: 4 }}>{e.message}</Text> : null}
                {contact(e.phone, e.parentName)}
              </View>
            ))
          : apps.items.slice(0, 100).map((a) => (
              <View key={a.id} style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
                <View style={styles.head}>
                  <Text style={{ color: c.text, fontWeight: "800", flex: 1 }}>
                    {a.student.name} · {a.student.className}
                  </Text>
                  {badge(a.status, () => openManage(a))}
                </View>
                <Text style={{ color: c.textMuted, fontSize: 12 }}>
                  {a.applicationNo} · {day(a.createdAt)} · {a.parent.name}
                </Text>
                {((a as Application & { documents?: { label: string; fileId: string }[] }).documents ?? []).map((doc) => (
                  <Pressable key={doc.fileId} onPress={() => void openDoc(a, doc.fileId)} style={styles.act}>
                    <MaterialCommunityIcons name="paperclip" size={16} color={SCHOOL_GREEN} />
                    <Text style={{ color: SCHOOL_GREEN, fontWeight: "700" }}>{doc.label}</Text>
                  </Pressable>
                ))}
                {contact(a.parent.phone, a.parent.name)}
                {canAdmit && a.status !== "Admitted" && a.status !== "Rejected" ? (
                  <PillButton
                    label="Admit student"
                    icon="account-check"
                    color={SCHOOL_GREEN}
                    onPress={() => {
                      setAdmit(a);
                      setAdmitCls(classes.includes(a.student.className) ? a.student.className : "");
                      setAdmitSec("");
                    }}
                    style={{ marginTop: 8 }}
                  />
                ) : null}
              </View>
            ))}
        {(tab === "Enquiries" ? enq.items : apps.items).length === 0 ? <Text style={{ color: c.textMuted, textAlign: "center", marginTop: 20 }}>Nothing here yet.</Text> : null}

      </ScrollView>

      <Sheet visible={!!admit} title={`Admit ${admit?.student.name ?? ""}`} onClose={() => setAdmit(null)}>
        <Text style={{ color: c.textMuted }}>This registers the student and creates the parent login (password = mobile number).</Text>
        <Text style={{ color: c.text, fontWeight: "700", marginTop: 12 }}>Class</Text>
        <Chips items={classes} value={admitCls} onChange={setAdmitCls} color={SCHOOL_GREEN} />
        <Text style={{ color: c.text, fontWeight: "700", marginTop: 12 }}>Section</Text>
        <Chips items={["", ...sections]} value={admitSec} onChange={setAdmitSec} label={(v) => v || "—"} color={SCHOOL_GREEN} />
        <PillButton label="Admit" icon="account-check" color={SCHOOL_GREEN} onPress={() => void doAdmit()} loading={admitBusy} disabled={admitBusy || !admitCls} style={{ marginTop: 16 }} />
      </Sheet>
      <Sheet visible={!!manage} title={`${manage?.applicationNo ?? ""} · ${manage?.student.name ?? ""}`} onClose={() => setManage(null)}>
        {manage ? (
          <>
            <Text style={{ color: c.text, fontWeight: "700" }}>Status</Text>
            <Chips items={apps.statuses.filter((x) => x !== "Admitted" || manage.status === "Admitted")} value={mStatus} onChange={setMStatus} color={SCHOOL_GREEN} />
            <TextInput mode="outlined" label="Message the parent sees (status check, email)" value={mPublic} onChangeText={setMPublic} multiline maxLength={300} style={{ marginTop: 10 }} activeOutlineColor={SCHOOL_GREEN} />
            <TextInput mode="outlined" label="Office note (only staff see this)" value={mNote} onChangeText={setMNote} multiline maxLength={300} style={{ marginTop: 10 }} activeOutlineColor={SCHOOL_GREEN} />
            <PillButton label="Save" icon="content-save-outline" color={SCHOOL_GREEN} onPress={() => void saveManage()} loading={mBusy} disabled={mBusy} style={{ marginTop: 14 }} />
            <Text style={{ color: c.text, fontWeight: "700", marginTop: 18 }}>🕘 History</Text>
            {[...(manage.history ?? [])].reverse().map((h, i) => (
              <View key={i} style={[styles.option, { borderColor: c.border, paddingVertical: 8, alignItems: "flex-start" }]}>
                <View style={[styles.dot, { backgroundColor: tone(h.status), marginTop: 5 }]} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.text, fontWeight: "700" }}>{h.status}</Text>
                  <Text style={{ color: c.textMuted, fontSize: 12 }}>
                    {day(h.at)} · {h.by}
                  </Text>
                  {h.note ? <Text style={{ color: c.text, fontSize: 13 }}>{h.note}</Text> : null}
                </View>
              </View>
            ))}
            {manage.message ? (
              <>
                <Text style={{ color: c.text, fontWeight: "700", marginTop: 14 }}>✉️ Parent's message</Text>
                <Text style={{ color: c.text }}>{manage.message}</Text>
              </>
            ) : null}
          </>
        ) : null}
      </Sheet>
      <Sheet visible={!!pick} title="Change status" onClose={() => setPick(null)}>
        {(pick?.kind === "enquiry" ? enq.statuses : apps.statuses.filter((s) => s !== "Admitted")).map((s) => (
          <Pressable key={s} onPress={() => void change(s)} style={[styles.option, { borderColor: c.border }]}>
            <View style={[styles.dot, { backgroundColor: tone(s) }]} />
            <Text style={{ color: c.text, fontWeight: pick?.item.status === s ? "800" : "500", flex: 1 }}>{s}</Text>
            {pick?.item.status === s ? <MaterialCommunityIcons name="check" size={18} color={SCHOOL_GREEN} /> : null}
          </Pressable>
        ))}
        {pick?.kind === "application" ? <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 8 }}>The parent is emailed about the new status.</Text> : null}
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: 12, marginBottom: 10, gap: 2 },
  head: { flexDirection: "row", alignItems: "center", gap: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  actions: { flexDirection: "row", gap: 18, marginTop: 8 },
  act: { flexDirection: "row", alignItems: "center", gap: 4 },
  option: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 14, borderBottomWidth: 1 },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
