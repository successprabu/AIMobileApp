import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, IconButton, Text, TextInput } from "react-native-paper";
import { schoolError } from "../../api/school";
import { deleteBusAlert, saveRoutes, studentList, transportData } from "../../api/schoolErp";
import { useSchoolAuth } from "../../context/SchoolAuthContext";
import { useAppTheme } from "../../hooks/useAppTheme";
import { Notice, PillButton } from "../../components/ui/AuthUi";
import Sheet from "../../components/ui/Sheet";
import type { BusRoute, Student } from "../../school/erp";
import { openSchoolScreen } from "../../school/schoolMenu";
import { Chips, Row, SCHOOL_GREEN, Section, day, inr, ui } from "./schoolUi";

const blank = (): BusRoute => ({ name: "", vehicleNo: "", driverName: "", driverPhone: "", attendantName: "", fee: 0, stops: [], students: {} });

/** Transport: bus routes (stops, times, driver, children on each stop) and recent bus alerts. */
export default function TransportScreen() {
  const { school } = useSchoolAuth();
  const sid = school?.user.schoolId ?? "";
  const canEdit = school?.user.role === "superadmin" || !!school?.permissions.includes("transport");
  const { theme } = useAppTheme();
  const c = theme.colors;
  const [routes, setRoutes] = useState<BusRoute[]>([]);
  const [alerts, setAlerts] = useState<Awaited<ReturnType<typeof transportData>>["alerts"]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [edit, setEdit] = useState<{ i: number; r: BusRoute } | null>(null);
  const [saving, setSaving] = useState(false);
  const [cls, setCls] = useState("");
  const [stopFor, setStopFor] = useState("");

  const load = useCallback(async () => {
    try {
      const [t, s] = await Promise.all([transportData(sid), studentList(sid).catch(() => [] as Student[])]);
      setRoutes(t.routes);
      setAlerts(t.alerts);
      setStudents(s.filter((x) => x.status === "Active"));
    } catch (e) {
      setNote({ kind: "error", text: schoolError(e, "Could not load transport.") });
    } finally {
      setLoading(false);
    }
  }, [sid]);
  useEffect(() => {
    void load();
  }, [load]);

  const byId = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);
  const classes = useMemo(() => [...new Set(students.map((s) => s.className))], [students]);

  const persist = async (next: BusRoute[]) => {
    setSaving(true);
    try {
      setRoutes(await saveRoutes(sid, next));
      setNote({ kind: "success", text: "🚌 Routes saved." });
      setEdit(null);
    } catch (e) {
      setNote({ kind: "error", text: schoolError(e, "Could not save the routes.") });
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = () => {
    if (!edit) return;
    if (edit.r.name.trim().length < 2) return Alert.alert("Route name", "Please type a name for the route.");
    const r = { ...edit.r, stops: edit.r.stops.filter((s) => s.name.trim()) };
    const next = [...routes];
    if (edit.i < 0) next.push(r);
    else next[edit.i] = r;
    void persist(next);
  };

  const removeRoute = (i: number) =>
    Alert.alert("Delete this route?", "Children on it will have no bus route.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => void persist(routes.filter((_, j) => j !== i)) },
    ]);

  const upd = (patch: Partial<BusRoute>) => setEdit((e) => (e ? { ...e, r: { ...e.r, ...patch } } : e));

  if (loading) {
    return (
      <View style={[ui.center, { backgroundColor: c.background }]}>
        <ActivityIndicator color={SCHOOL_GREEN} />
      </View>
    );
  }

  return (
    <>
      <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={ui.wrap} refreshControl={<RefreshControl refreshing={false} onRefresh={() => void load()} />}>
        {note ? <Notice kind={note.kind} text={note.text} /> : null}
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
          <PillButton label="Send bus alert" icon="bus-alert" color={SCHOOL_GREEN} onPress={() => openSchoolScreen("SchoolBusAlert")} style={{ flex: 1 }} />
          {canEdit ? <PillButton label="New route" icon="plus" variant="soft" color={SCHOOL_GREEN} onPress={() => setEdit({ i: -1, r: blank() })} style={{ flex: 1 }} /> : null}
        </View>
        {routes.length === 0 ? <Text style={{ color: c.textMuted, textAlign: "center", marginVertical: 20 }}>🚌 No bus routes yet.</Text> : null}
        {routes.map((r, i) => {
          const kids = Object.entries(r.students ?? {});
          return (
            <Section
              key={r.id ?? i}
              icon="bus-school"
              title={`🚌 ${r.name}`}
              right={
                canEdit ? (
                  <View style={{ flexDirection: "row" }}>
                    <IconButton icon="pencil" size={18} onPress={() => setEdit({ i, r: JSON.parse(JSON.stringify(r)) as BusRoute })} accessibilityLabel="Edit route" />
                    <IconButton icon="delete-outline" size={18} onPress={() => removeRoute(i)} accessibilityLabel="Delete route" />
                  </View>
                ) : null
              }
            >
              <Row left="Vehicle" right={r.vehicleNo || "—"} />
              {r.driverName ? (
                <Pressable onPress={() => r.driverPhone && void Linking.openURL(`tel:${r.driverPhone}`)}>
                  <Row left="Driver" right={`${r.driverName}${r.driverPhone ? ` · 📞 ${r.driverPhone}` : ""}`} />
                </Pressable>
              ) : null}
              {r.attendantName ? <Row left="Attendant" right={r.attendantName} /> : null}
              {r.fee ? <Row left="Bus fee" right={inr(r.fee)} /> : null}
              {r.stops.map((st) => (
                <Text key={st.name} style={{ color: c.text }}>
                  📍 {st.name} · 🌅 {st.morning || "—"} · 🌇 {st.evening || "—"} · {kids.filter(([, s]) => s === st.name).length} children
                </Text>
              ))}
              <Text style={{ color: c.textMuted, fontSize: 12 }}>{kids.length} children on this route</Text>
            </Section>
          );
        })}
        {alerts.length ? (
          <Section icon="bus-alert" title="📣 Recent alerts">
            {alerts.slice(0, 15).map((a) => (
              <View key={a.id} style={styles.alert}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.text }}>
                    <Text style={{ fontWeight: "800", color: c.text }}>{a.routeName}: </Text>
                    {a.text}
                  </Text>
                  <Text style={{ color: c.textMuted, fontSize: 12 }}>
                    {day(a.at)} · {a.by}
                  </Text>
                </View>
                {canEdit ? <IconButton icon="delete-outline" size={18} onPress={() => void deleteBusAlert(sid, a.id).then(() => setAlerts((x) => x.filter((y) => y.id !== a.id)))} accessibilityLabel="Delete alert" /> : null}
              </View>
            ))}
          </Section>
        ) : null}
      </ScrollView>

      <Sheet visible={!!edit} title={edit?.i === -1 ? "New route" : "Edit route"} onClose={() => setEdit(null)}>
        {edit ? (
          <>
            <TextInput mode="outlined" label="Route name *" value={edit.r.name} onChangeText={(v) => upd({ name: v })} activeOutlineColor={SCHOOL_GREEN} />
            <TextInput mode="outlined" label="Vehicle number" value={edit.r.vehicleNo} onChangeText={(v) => upd({ vehicleNo: v })} style={styles.f} activeOutlineColor={SCHOOL_GREEN} autoCapitalize="characters" />
            <TextInput mode="outlined" label="Driver name" value={edit.r.driverName} onChangeText={(v) => upd({ driverName: v })} style={styles.f} activeOutlineColor={SCHOOL_GREEN} />
            <TextInput mode="outlined" label="Driver phone" value={edit.r.driverPhone} onChangeText={(v) => upd({ driverPhone: v })} keyboardType="phone-pad" style={styles.f} activeOutlineColor={SCHOOL_GREEN} />
            <TextInput mode="outlined" label="Attendant name" value={edit.r.attendantName} onChangeText={(v) => upd({ attendantName: v })} style={styles.f} activeOutlineColor={SCHOOL_GREEN} />
            <TextInput mode="outlined" label="Bus fee per year (₹)" value={edit.r.fee ? String(edit.r.fee) : ""} onChangeText={(v) => upd({ fee: Number(v.replace(/\D/g, "")) || 0 })} keyboardType="number-pad" style={styles.f} activeOutlineColor={SCHOOL_GREEN} />

            <Text style={[ui.label, { color: c.text }]}>Stops (pick-up / drop time)</Text>
            {edit.r.stops.map((st, j) => (
              <View key={j} style={styles.stop}>
                <TextInput mode="outlined" dense label="Stop" value={st.name} onChangeText={(v) => upd({ stops: edit.r.stops.map((x, k) => (k === j ? { ...x, name: v } : x)) })} style={{ flex: 2 }} activeOutlineColor={SCHOOL_GREEN} />
                <TextInput mode="outlined" dense label="AM" placeholder="07:30" value={st.morning} onChangeText={(v) => upd({ stops: edit.r.stops.map((x, k) => (k === j ? { ...x, morning: v } : x)) })} style={{ flex: 1 }} activeOutlineColor={SCHOOL_GREEN} />
                <TextInput mode="outlined" dense label="PM" placeholder="16:15" value={st.evening} onChangeText={(v) => upd({ stops: edit.r.stops.map((x, k) => (k === j ? { ...x, evening: v } : x)) })} style={{ flex: 1 }} activeOutlineColor={SCHOOL_GREEN} />
                <IconButton icon="close" size={18} onPress={() => upd({ stops: edit.r.stops.filter((_, k) => k !== j) })} />
              </View>
            ))}
            <PillButton label="Add stop" icon="map-marker-plus" variant="soft" color={SCHOOL_GREEN} onPress={() => upd({ stops: [...edit.r.stops, { name: "", morning: "", evening: "" }] })} style={{ marginTop: 6 }} />

            <Text style={[ui.label, { color: c.text }]}>Children on this bus</Text>
            {Object.entries(edit.r.students ?? {}).map(([id, stop]) => (
              <View key={id} style={styles.kid}>
                <Text style={{ color: c.text, flex: 1 }}>
                  {byId.get(id)?.name ?? "?"} · {byId.get(id)?.className ?? ""} · 📍 {stop || "—"}
                </Text>
                <IconButton
                  icon="close"
                  size={16}
                  onPress={() => {
                    const next = { ...edit.r.students };
                    delete next[id];
                    upd({ students: next });
                  }}
                />
              </View>
            ))}
            <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 6 }}>Add children: pick the stop, then the class, then tap names.</Text>
            <Chips items={edit.r.stops.map((s) => s.name).filter(Boolean)} value={stopFor} onChange={setStopFor} color={SCHOOL_GREEN} />
            <Chips items={classes} value={cls} onChange={setCls} color={SCHOOL_GREEN} />
            <View style={styles.wrapRow}>
              {students
                .filter((s) => s.className === cls && !(s.id in (edit.r.students ?? {})))
                .map((s) => (
                  <Pressable key={s.id} onPress={() => stopFor && upd({ students: { ...edit.r.students, [s.id]: stopFor } })} style={[ui.chip, { borderColor: c.border, opacity: stopFor ? 1 : 0.5 }]}>
                    <Text style={{ color: c.text }}>+ {s.name}</Text>
                  </Pressable>
                ))}
            </View>
            <PillButton label="Save route" icon="content-save-outline" color={SCHOOL_GREEN} onPress={saveEdit} loading={saving} disabled={saving} style={{ marginTop: 16 }} />
          </>
        ) : null}
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  f: { marginTop: 8 },
  stop: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
  kid: { flexDirection: "row", alignItems: "center" },
  alert: { flexDirection: "row", alignItems: "center", paddingVertical: 4 },
  wrapRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
});
