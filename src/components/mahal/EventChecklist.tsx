import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { Button, Checkbox, Text, TextInput } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppTheme } from "../../hooks/useAppTheme";
import { getChecklist, saveHandoverNote, tickChecklist, type BookingChecklist } from "../../api/mahalPlus";
import { useTx } from "../../i18n/site";

const when = (d: string) => new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

/** Event-day checklist on a booking (cleaning, chairs, power, keys…) plus damage / handover notes. Staff can tick. */
export default function EventChecklist({ bookingId, onMessage }: { bookingId: number; onMessage: (m: string) => void }) {
  const { theme } = useAppTheme();
  const c = theme.colors;
  const tx = useTx();
  const [data, setData] = useState<BookingChecklist | null>(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let live = true;
    setData(null);
    void getChecklist(bookingId).then((r) => {
      if (!live) return;
      if (r.ok && Array.isArray(r.data?.items)) {
        setData(r.data!);
        setNote(r.data!.note ?? "");
      } else if (r.ok) setData({ bookingId, items: [], doneCount: 0, total: 0, note: "" });
      else setError(r.message);
    });
    return () => {
      live = false;
    };
  }, [bookingId]);

  const tick = async (id: number, done: boolean) => {
    setBusy(id);
    const r = await tickChecklist(bookingId, id, !done);
    setBusy(0);
    if (r.ok && r.data) setData(r.data);
    else onMessage(tx(r.message));
  };
  const saveNote = async () => {
    setSaving(true);
    const r = await saveHandoverNote(bookingId, note);
    setSaving(false);
    onMessage(tx(r.message));
    if (r.ok) setData((d) => (d ? { ...d, note: r.data?.note ?? "" } : d));
  };

  if (error) return <Text style={{ color: c.textMuted, marginTop: 12 }}>{tx(error)}</Text>;
  if (!data) return <ActivityIndicator style={{ marginTop: 12 }} color={c.primary} />;
  if (!data.items.length) return null;
  const all = data.doneCount === data.total;

  return (
    <View style={[styles.box, { borderColor: c.border }]}>
      <View style={styles.head}>
        <MaterialCommunityIcons name="clipboard-check-outline" size={20} color={c.primary} />
        <Text style={{ color: c.text, fontWeight: "800", flex: 1 }}>{tx("Event-day checklist")}</Text>
        <Text style={{ color: all ? c.success : c.textMuted, fontWeight: "800" }}>{data.doneCount}/{data.total}</Text>
      </View>
      <View style={[styles.track, { backgroundColor: c.border }]}>
        <View style={{ width: `${data.total ? (data.doneCount / data.total) * 100 : 0}%`, height: "100%", borderRadius: 3, backgroundColor: all ? c.success : c.primary }} />
      </View>
      {data.items.map((i) => (
        <Pressable key={i.id} onPress={() => void tick(i.id, i.done)} disabled={busy === i.id} style={styles.row} accessibilityRole="checkbox" accessibilityState={{ checked: i.done }}>
          <Checkbox status={i.done ? "checked" : "unchecked"} onPress={() => void tick(i.id, i.done)} disabled={busy === i.id} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: i.done ? c.textMuted : c.text, textDecorationLine: i.done ? "line-through" : "none" }}>{tx(i.text)}</Text>
            {i.done && (!!i.doneBy || !!i.doneDt) && (
              <Text style={{ color: c.textMuted, fontSize: 11 }}>{[i.doneBy, i.doneDt && when(i.doneDt)].filter(Boolean).join(" · ")}</Text>
            )}
          </View>
        </Pressable>
      ))}
      <TextInput mode="outlined" multiline label={tx("Damage or handover notes")} placeholder={tx("For example: 2 chairs broken, stage light not working")}
        value={note} onChangeText={(v) => setNote(v.slice(0, 1000))} style={{ marginTop: 8 }} />
      {note !== (data.note ?? "") && (
        <Button mode="contained" compact style={{ alignSelf: "flex-end", marginTop: 8 }} loading={saving} disabled={saving} onPress={() => void saveNote()}>{tx("Save notes")}</Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: 1, borderRadius: 14, padding: 12, marginTop: 16 },
  head: { flexDirection: "row", alignItems: "center", gap: 8 },
  track: { height: 6, borderRadius: 3, overflow: "hidden", marginVertical: 8 },
  row: { flexDirection: "row", alignItems: "center", minHeight: 44 },
});
