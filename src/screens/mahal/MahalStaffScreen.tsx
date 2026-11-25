import React, { useCallback, useLayoutEffect, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { Button, FAB, Snackbar, Switch, Text, TextInput } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { MainStackParamList } from "../../navigation/types";
import { useAppTheme } from "../../hooks/useAppTheme";
import { listStaff, saveStaff, type Staff } from "../../api/mahalOps";
import { FadeIn } from "../../components/mahal/MahalUi";
import Sheet from "../../components/ui/Sheet";
import { useTx } from "../../i18n/site";

const CAN = ["Add and edit bookings", "Confirm or decline requests", "Record payments and make invoices", "Send WhatsApp reminders", "Add expenses"];
const CANNOT = ["See income and profit", "Cancel bookings or delete expenses", "Change hall details, photos or payment settings", "Add other staff"];

type Form = { id: number; name: string; phone: string; password: string; isActive: boolean };

/** Owner only: logins for managers, who book and take payments from their own phone without seeing profit. */
export default function MahalStaffScreen() {
  const { theme } = useAppTheme();
  const c = theme.colors;
  const tx = useTx();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const [list, setList] = useState<Staff[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState<Form | null>(null);
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

  useLayoutEffect(() => navigation.setOptions({ title: tx("Staff logins") }), [navigation, tx]);

  const load = useCallback(async () => {
    const r = await listStaff();
    setRefreshing(false);
    setList(r.ok ? r.data ?? [] : []);
    if (!r.ok) setMessage(tx(r.message));
  }, [tx]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const save = async () => {
    if (!form) return;
    setSaving(true);
    const r = await saveStaff(form);
    setSaving(false);
    setMessage(tx(r.message));
    if (r.ok) {
      setForm(null);
      void load();
    }
  };

  const editing = !!form?.id;

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 96 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} />}>
        <Text style={{ color: c.textMuted, marginBottom: 12 }}>{tx("Give your manager their own login instead of sharing your password.")}</Text>

        <View style={[styles.card, { backgroundColor: c.card }]}>
          {list === null ? (
            <ActivityIndicator color={c.primary} />
          ) : list.length === 0 ? (
            <View style={{ alignItems: "center", padding: 12 }}>
              <MaterialCommunityIcons name="badge-account-outline" size={44} color={c.textMuted} />
              <Text style={{ color: c.text, fontWeight: "800", marginTop: 6 }}>{tx("No staff logins yet")}</Text>
              <Text style={{ color: c.textMuted, textAlign: "center" }}>{tx("Add a manager so they can take bookings and payments from their own phone.")}</Text>
            </View>
          ) : (
            list.map((s, i) => (
              <FadeIn key={s.id} index={i}>
                <Pressable onPress={() => setForm({ ...s, password: "" })} accessibilityRole="button" accessibilityLabel={`${tx("Edit")} ${s.name}`}
                  style={[styles.row, { borderColor: c.border, opacity: s.isActive ? 1 : 0.55 }]}>
                  <View style={[styles.avatar, { backgroundColor: `${c.primary}22` }]}>
                    <Text style={{ color: c.primary, fontWeight: "800" }}>{(s.name || "?").charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: c.text, fontWeight: "700" }}>{s.name}</Text>
                    <Text style={{ color: c.textMuted }}>{s.phone}</Text>
                  </View>
                  <View style={[styles.tag, { borderColor: s.isActive ? c.success : c.textMuted }]}>
                    <Text style={{ color: s.isActive ? c.success : c.textMuted, fontSize: 12, fontWeight: "700" }}>{tx(s.isActive ? "Active" : "Blocked")}</Text>
                  </View>
                  <MaterialCommunityIcons name="pencil-outline" size={20} color={c.textMuted} />
                </Pressable>
              </FadeIn>
            ))
          )}
        </View>

        <View style={[styles.card, { backgroundColor: c.card }]}>
          <Text style={[styles.title, { color: c.text }]}>{tx("Staff can")}</Text>
          {CAN.map((t) => <Rule key={t} ok text={tx(t)} />)}
          <Text style={[styles.title, { color: c.text, marginTop: 12 }]}>{tx("Only you can")}</Text>
          {CANNOT.map((t) => <Rule key={t} text={tx(t)} />)}
        </View>
      </ScrollView>

      <FAB icon="plus" label={tx("Add staff login")} color="#fff" style={[styles.fab, { backgroundColor: c.primary }]}
        onPress={() => setForm({ id: 0, name: "", phone: "", password: "", isActive: true })} />

      <Sheet visible={!!form} title={tx(editing ? "Edit staff login" : "Add staff login")} onClose={() => !saving && setForm(null)}>
        {form && (
          <View style={{ gap: 12 }}>
            <TextInput mode="outlined" label={tx("Name")} value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} autoFocus={!editing} />
            <TextInput mode="outlined" label={tx("Mobile number")} keyboardType="phone-pad" value={form.phone}
              onChangeText={(v) => setForm({ ...form, phone: v.replace(/\D/g, "").slice(0, 10) })} />
            <Text style={{ color: c.textMuted, fontSize: 12, marginTop: -8 }}>{tx("They sign in with this number")}</Text>
            <TextInput mode="outlined" label={tx(editing ? "New password (leave empty to keep)" : "Password")} value={form.password}
              secureTextEntry={!show} autoComplete="new-password" onChangeText={(v) => setForm({ ...form, password: v })}
              right={<TextInput.Icon icon={show ? "eye-off" : "eye"} onPress={() => setShow((x) => !x)} accessibilityLabel={tx("Show password")} />} />
            <Text style={{ color: c.textMuted, fontSize: 12, marginTop: -8 }}>{tx("At least 6 characters. Share it with them yourself.")}</Text>
            {editing && (
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={{ color: c.text }}>{tx(form.isActive ? "Can sign in" : "Blocked from signing in")}</Text>
                <Switch value={form.isActive} onValueChange={(v) => setForm({ ...form, isActive: v })} />
              </View>
            )}
            <Button mode="contained" onPress={save} loading={saving} disabled={saving} style={{ borderRadius: 12 }}>{tx("Save")}</Button>
          </View>
        )}
      </Sheet>
      <Snackbar visible={!!message} onDismiss={() => setMessage("")}>{message}</Snackbar>
    </View>
  );
}

function Rule({ text, ok = false }: { text: string; ok?: boolean }) {
  const { theme } = useAppTheme();
  const c = theme.colors;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 3 }}>
      <MaterialCommunityIcons name={ok ? "check" : "close"} size={18} color={ok ? c.success : c.danger} />
      <Text style={{ color: c.text, flex: 1 }}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, padding: 16, marginBottom: 14, elevation: 1, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  title: { fontWeight: "800", fontSize: 16, marginBottom: 6 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  tag: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  fab: { position: "absolute", right: 16, bottom: 20 },
});
