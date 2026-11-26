import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Text, TextInput } from "react-native-paper";
import { schoolError, sendBusAlert, transport, type BusRoute } from "../../api/school";
import { useSchoolAuth } from "../../context/SchoolAuthContext";
import { useAppTheme } from "../../hooks/useAppTheme";
import { Notice, PillButton } from "../../components/ui/AuthUi";
import { Chips, SCHOOL_GREEN, day, ui } from "./schoolUi";

const QUICK = ["Bus is running 15 minutes late.", "Bus is running 30 minutes late.", "Bus has left school.", "Bus will not run today."];

/** Transport in-charge: send a bus alert to parents on one route (or all routes). */
export default function BusAlertScreen() {
  const { school } = useSchoolAuth();
  const sid = school?.user.schoolId ?? "";
  const { theme } = useAppTheme();
  const c = theme.colors;

  const [routes, setRoutes] = useState<BusRoute[]>([]);
  const [alerts, setAlerts] = useState<Awaited<ReturnType<typeof transport>>["alerts"]>([]);
  const [routeId, setRouteId] = useState<string>("all");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ kind: "info" | "error" | "success"; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const t = await transport(sid);
      setRoutes(t.routes);
      setAlerts(t.alerts.slice(0, 10));
    } catch (e) {
      setNote({ kind: "error", text: schoolError(e, "Could not load the bus routes.") });
    } finally {
      setLoading(false);
    }
  }, [sid]);

  useEffect(() => {
    void load();
  }, [load]);

  const send = async () => {
    if (text.trim().length < 3) return setNote({ kind: "error", text: "Type the alert message." });
    setBusy(true);
    setNote(null);
    try {
      await sendBusAlert(sid, routeId, text.trim());
      setNote({ kind: "success", text: "Sent. Parents on this route get a notification and see it in the app." });
      setText("");
      void load();
    } catch (e) {
      setNote({ kind: "error", text: schoolError(e, "Could not send. Check the network and try again.") });
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

  return (
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={ui.wrap} keyboardShouldPersistTaps="handled">
      {note ? <Notice kind={note.kind} text={note.text} /> : null}
      <Text style={[ui.label, { color: c.text }]}>Route</Text>
      <Chips items={["all", ...routes.map((r) => r.id)]} value={routeId} onChange={setRouteId} label={(id) => (id === "all" ? "All routes" : routes.find((r) => r.id === id)?.name ?? id)} color={SCHOOL_GREEN} />
      <Text style={[ui.label, { color: c.text }]}>Message</Text>
      <View style={styles.quick}>
        {QUICK.map((q) => (
          <Text key={q} onPress={() => setText(q)} style={[styles.q, { borderColor: c.border, color: c.text }]}>
            {q}
          </Text>
        ))}
      </View>
      <TextInput mode="outlined" value={text} onChangeText={setText} multiline maxLength={300} placeholder="Type the alert" activeOutlineColor={SCHOOL_GREEN} style={{ marginTop: 8 }} />
      <PillButton label="Send bus alert" icon="bus-alert" color={SCHOOL_GREEN} onPress={() => void send()} loading={busy} disabled={busy} style={{ marginTop: 14 }} />

      {alerts.length ? (
        <>
          <Text style={[ui.label, { color: c.text, marginTop: 24 }]}>Recent alerts</Text>
          {alerts.map((a) => (
            <View key={a.id} style={[styles.item, { borderColor: c.border, backgroundColor: c.surface }]}>
              <Text style={{ color: c.text }}>
                <Text style={{ fontWeight: "800", color: c.text }}>{a.routeName}: </Text>
                {a.text}
              </Text>
              <Text style={{ color: c.textMuted, fontSize: 12 }}>
                {day(a.at)} · {new Date(a.at).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })} · {a.by}
              </Text>
            </View>
          ))}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  quick: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  q: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, overflow: "hidden" },
  item: { borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 8 },
});
