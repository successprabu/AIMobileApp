import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, View } from "react-native";
import { Button, Checkbox, IconButton, Text, TextInput } from "react-native-paper";
import { useAppTheme } from "../../hooks/useAppTheme";
import type { Mahal } from "../../api/mahal";
import { listChecklistItems, saveChecklistItems } from "../../api/mahalPlus";
import Sheet from "../ui/Sheet";
import { useTx } from "../../i18n/site";

type Row = { key: string; id: number; text: string; isActive: boolean };

/** Owner: the lines of a hall's event-day checklist, in order. Unticked lines are not shown on bookings. */
export default function ChecklistSheet({ mahal, onClose, onSaved }: { mahal: Mahal | null; onClose: () => void; onSaved: (msg: string) => void }) {
  const { theme } = useAppTheme();
  const c = theme.colors;
  const tx = useTx();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!mahal) return;
    setRows(null);
    void listChecklistItems(mahal.id).then((r) => {
      setRows(r.ok ? (r.data ?? []).map((x) => ({ key: `i${x.id}`, id: x.id, text: x.text, isActive: x.isActive })) : []);
      if (!r.ok) Alert.alert(tx(r.message));
    });
  }, [mahal, tx]);

  const update = (key: string, patch: Partial<Row>) => setRows((list) => (list ?? []).map((x) => (x.key === key ? { ...x, ...patch } : x)));
  const up = (i: number) => setRows((list) => {
    if (!list || i === 0) return list;
    const next = [...list];
    [next[i - 1], next[i]] = [next[i], next[i - 1]];
    return next;
  });

  const save = async () => {
    if (!mahal || !rows) return;
    setSaving(true);
    const r = await saveChecklistItems(mahal.id, rows.filter((x) => x.text.trim()).map((x) => ({ id: x.id, text: x.text.trim(), isActive: x.isActive })));
    setSaving(false);
    if (r.ok) onSaved(tx(r.message));
    else Alert.alert(tx(r.message));
  };

  return (
    <Sheet visible={!!mahal} title={`${tx("Event-day checklist")} · ${mahal?.mahalName ?? ""}`} onClose={() => !saving && onClose()}>
      <Text style={{ color: c.textMuted, marginBottom: 10 }}>{tx("Your staff tick these on each booking. Untick a line to stop using it.")}</Text>
      {!rows ? <ActivityIndicator color={c.primary} /> : (
        <View style={{ gap: 6 }}>
          {rows.map((x, i) => (
            <View key={x.key} style={{ flexDirection: "row", alignItems: "center" }}>
              <Checkbox status={x.isActive ? "checked" : "unchecked"} onPress={() => update(x.key, { isActive: !x.isActive })} />
              <TextInput mode="outlined" dense style={{ flex: 1 }} value={x.text} onChangeText={(v) => update(x.key, { text: v.slice(0, 150) })} />
              <IconButton icon="arrow-up" size={18} disabled={i === 0} onPress={() => up(i)} accessibilityLabel={tx("Move up")} />
              {!x.id && <IconButton icon="delete-outline" size={18} iconColor={c.danger} onPress={() => setRows((l) => (l ?? []).filter((y) => y.key !== x.key))} accessibilityLabel={tx("Delete")} />}
            </View>
          ))}
          <Button icon="plus" style={{ alignSelf: "flex-start" }} onPress={() => setRows((l) => [...(l ?? []), { key: `n${Date.now()}`, id: 0, text: "", isActive: true }])}>{tx("Add a line")}</Button>
          <Button mode="contained" onPress={save} loading={saving} disabled={saving} style={{ borderRadius: 12, marginTop: 6 }}>{tx("Save")}</Button>
        </View>
      )}
    </Sheet>
  );
}
