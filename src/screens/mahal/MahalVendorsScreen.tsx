import React, { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { ActivityIndicator, Alert, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { Button, Chip, FAB, IconButton, Snackbar, Switch, Text, TextInput } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { MainStackParamList } from "../../navigation/types";
import { useAppTheme } from "../../hooks/useAppTheme";
import { listMyMahals, type Mahal } from "../../api/mahal";
import { deleteVendor, listVendors, saveVendor, VENDOR_CATEGORIES, type Vendor } from "../../api/mahalPlus";
import { FadeIn } from "../../components/mahal/MahalUi";
import Sheet from "../../components/ui/Sheet";
import { useTx } from "../../i18n/site";

const COLORS: Record<string, string> = { Catering: "#f59e0b", Decoration: "#db2777", Photography: "#6366f1", Music: "#0ea5e9", Flowers: "#10b981", Makeup: "#e11d48", Priest: "#f97316", Transport: "#475569", Lighting: "#eab308", Other: "#64748b" };
type Form = { id: number; mahalId: number; category: string; name: string; phone: string; note: string; isActive: boolean };

/** Owner: caterers, decorators, photographers… the hall recommends. Customers see them on the hall page. */
export default function MahalVendorsScreen() {
  const { theme } = useAppTheme();
  const c = theme.colors;
  const tx = useTx();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const [mahals, setMahals] = useState<Mahal[]>([]);
  const [items, setItems] = useState<Vendor[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);

  useLayoutEffect(() => navigation.setOptions({ title: tx("Vendors") }), [navigation, tx]);
  useEffect(() => {
    void listMyMahals().then((r) => r.ok && setMahals((r.data ?? []).filter((m) => m.isActive !== false)));
  }, []);
  const load = useCallback(async () => {
    const r = await listVendors();
    setRefreshing(false);
    setItems(r.ok ? r.data?.items ?? [] : []);
    if (!r.ok) setMessage(tx(r.message));
  }, [tx]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const save = async () => {
    if (!form) return;
    setSaving(true);
    const r = await saveVendor({ ...form, sortOrder: 0 });
    setSaving(false);
    setMessage(tx(r.message));
    if (r.ok) {
      setForm(null);
      void load();
    }
  };
  const remove = (v: Vendor) =>
    Alert.alert(tx('Delete "{{name}}"?', { name: v.name }), undefined, [
      { text: tx("Close"), style: "cancel" },
      { text: tx("Delete"), style: "destructive", onPress: async () => { const r = await deleteVendor(v.id); setMessage(tx(r.message)); if (r.ok) void load(); } },
    ]);

  const groups = VENDOR_CATEGORIES.map((cat) => [cat, (items ?? []).filter((v) => v.category === cat)] as const).filter(([, l]) => l.length > 0);
  const hallName = (id: number) => mahals.find((m) => m.id === id)?.mahalName;

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 96 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} />}>
        <Text style={{ color: c.textMuted, marginBottom: 12 }}>{tx("Caterers, decorators and photographers you recommend. Families see them on your hall page and can call them directly.")}</Text>
        {!items ? <ActivityIndicator color={c.primary} /> : items.length === 0 ? (
          <View style={{ alignItems: "center", padding: 24 }}>
            <MaterialCommunityIcons name="storefront-outline" size={48} color={c.textMuted} />
            <Text style={{ color: c.text, fontWeight: "800", marginTop: 6 }}>{tx("No vendors yet")}</Text>
            <Text style={{ color: c.textMuted, textAlign: "center" }}>{tx("Add the caterers, decorators and photographers you work with. Families often ask the hall for them.")}</Text>
          </View>
        ) : groups.map(([cat, list]) => (
          <View key={cat} style={{ marginBottom: 14 }}>
            <Text style={{ color: COLORS[cat], fontWeight: "800", fontSize: 12, marginBottom: 6 }}>{tx(cat).toUpperCase()}</Text>
            <View style={[styles.card, { backgroundColor: c.card }]}>
              {list.map((v, i) => (
                <FadeIn key={v.id} index={i}>
                  <Pressable onPress={() => setForm({ id: v.id, mahalId: v.mahalId, category: v.category, name: v.name, phone: v.phone ?? "", note: v.note ?? "", isActive: v.isActive })}
                    style={[styles.row, { borderColor: c.border, opacity: v.isActive ? 1 : 0.55, borderBottomWidth: i < list.length - 1 ? StyleSheet.hairlineWidth : 0 }]}
                    accessibilityRole="button" accessibilityLabel={`${tx("Edit")} ${v.name}`}>
                    <View style={[styles.avatar, { backgroundColor: COLORS[cat] }]}><Text style={{ color: "#fff", fontWeight: "800" }}>{v.name.charAt(0).toUpperCase()}</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: c.text, fontWeight: "700" }} numberOfLines={1}>{v.name}</Text>
                      <Text style={{ color: c.textMuted, fontSize: 12 }} numberOfLines={1}>{[v.phone, v.note, mahals.length > 1 ? hallName(v.mahalId) : null].filter(Boolean).join(" · ")}</Text>
                    </View>
                    {!!v.phone && <IconButton icon="phone" size={20} onPress={() => void Linking.openURL(`tel:${v.phone}`)} accessibilityLabel={tx("Call")} />}
                    <IconButton icon="delete-outline" size={20} iconColor={c.danger} onPress={() => remove(v)} accessibilityLabel={tx("Delete")} />
                  </Pressable>
                </FadeIn>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      <FAB icon="plus" label={tx("Add vendor")} color="#fff" style={[styles.fab, { backgroundColor: c.primary }]} disabled={!mahals.length}
        onPress={() => setForm({ id: 0, mahalId: mahals[0]?.id ?? 0, category: "Catering", name: "", phone: "", note: "", isActive: true })} />

      <Sheet visible={!!form} title={tx(form?.id ? "Edit vendor" : "Add vendor")} onClose={() => !saving && setForm(null)}>
        {form && (
          <View style={{ gap: 10 }}>
            {mahals.length > 1 && !form.id && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {mahals.map((m) => <Chip key={m.id} selected={form.mahalId === m.id} onPress={() => setForm({ ...form, mahalId: m.id })} style={{ marginRight: 6 }}>{m.mahalName}</Chip>)}
              </ScrollView>
            )}
            <View style={styles.wrap}>
              {VENDOR_CATEGORIES.map((cat) => <Chip key={cat} selected={form.category === cat} onPress={() => setForm({ ...form, category: cat })}>{tx(cat)}</Chip>)}
            </View>
            <TextInput mode="outlined" label={tx("Name")} value={form.name} onChangeText={(v) => setForm({ ...form, name: v.slice(0, 100) })} />
            <TextInput mode="outlined" label={tx("Phone")} keyboardType="phone-pad" value={form.phone} onChangeText={(v) => setForm({ ...form, phone: v.slice(0, 20) })} />
            <TextInput mode="outlined" multiline label={tx("Note for customers (optional)")} placeholder={tx("For example: Veg meals from ₹250 a plate")}
              value={form.note} onChangeText={(v) => setForm({ ...form, note: v.slice(0, 300) })} />
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ color: c.text }}>{tx("Show to customers")}</Text>
              <Switch value={form.isActive} onValueChange={(v) => setForm({ ...form, isActive: v })} />
            </View>
            <Button mode="contained" onPress={save} loading={saving} disabled={saving} style={{ borderRadius: 12 }}>{tx("Save")}</Button>
          </View>
        )}
      </Sheet>
      <Snackbar visible={!!message} onDismiss={() => setMessage("")}>{message}</Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, overflow: "hidden", elevation: 1, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingLeft: 12, paddingVertical: 6 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  fab: { position: "absolute", right: 16, bottom: 20 },
});
