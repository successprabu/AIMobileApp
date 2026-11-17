import React, { useCallback, useLayoutEffect, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Button, Checkbox, HelperText, Snackbar, Switch, Text, TextInput } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useAppTheme } from "../../hooks/useAppTheme";
import { useAuth } from "../../context/AuthContext";
import type { AuthUser } from "../../types/auth";
import { addCustomer, listCustomers, newPassword, updateCustomer, waDigits, type Customer } from "../../api/admin";
import { FadeIn } from "../../components/mahal/MahalUi";

/**
 * Mahal admins register Moitech accounts for the families who book their hall (same as the
 * website's Moitech Reg): the account is an Admin linked to the mahal admin's account.
 */
export default function MoitechRegScreen() {
  const { theme } = useAppTheme();
  const c = theme.colors;
  const navigation = useNavigation();
  const { user } = useAuth();
  const me = user as AuthUser;
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState(true);
  const [password, setPassword] = useState(newPassword);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [list, setList] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [lastSaved, setLastSaved] = useState<{ name: string; phone: string; password: string } | null>(null);

  useLayoutEffect(() => navigation.setOptions({ title: "Moitech Reg" }), [navigation]);

  const load = useCallback(async () => {
    const r = await listCustomers({ id: null, customer_id: me.customerID, function_name: "", current_page: 1, page_size: 50 });
    setLoading(false);
    if (r.ok) setList(r.data?.customers ?? []);
  }, [me.customerID]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const save = async () => {
    const e: Record<string, string> = {};
    if (name.trim().length < 2) e.name = "Enter the name";
    if (!/^\d{10}$/.test(phone)) e.phone = "Enter a 10 digit mobile number";
    if (password.length < 6) e.password = "At least 6 characters";
    setErrors(e);
    if (Object.keys(e).length || saving) return;
    setSaving(true);
    const now = new Date().toISOString();
    const r = await addCustomer({
      id: 0,
      name: name.trim(),
      primary_phone: phone,
      secondary_phone: "",
      country: "",
      state: "",
      district: "",
      address_line1: "",
      address_line2: "",
      is_primary_phone_whatsup: whatsapp,
      is_secondary_phone_whatsup: false,
      pincode: 0,
      userType: "AU",
      customerId: me.customerID ?? 0,
      appName: "MOI",
      country_code: "+91",
      password,
      isActive: true,
      activated_from: now,
      activated_To: now,
      current_plan_id: 0,
      previous_plan_id: 0,
      referedBy: String(me.id ?? ""),
      createdBy: String(me.id ?? "SYSTEM"),
      createdDt: now,
      updatedBy: String(me.id ?? "SYSTEM"),
      updatedDt: now,
    });
    setSaving(false);
    if (r.ok) {
      setLastSaved({ name: name.trim(), phone, password });
      setName("");
      setPhone("");
      setPassword(newPassword());
      setMessage("User Saved Successfully");
      void load();
    } else setMessage(r.message);
  };

  const toggle = async (cust: Customer) => {
    const updated = { ...cust, isActive: !cust.isActive };
    const r = await updateCustomer(updated);
    if (r.ok) setList((l) => l.map((x) => (x.id === cust.id ? updated : x)));
    else setMessage(r.message);
  };

  const shareText = lastSaved
    ? `Welcome to My Success Moitech!\nSign in with mobile ${lastSaved.phone} and password ${lastSaved.password}.\nPlease change your password after you sign in.`
    : "";

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <FadeIn style={[styles.card, { backgroundColor: c.card }]}>
          <Text style={{ color: c.text, fontWeight: "800", fontSize: 16 }}>Register a Moitech user</Text>
          <Text style={{ color: c.textMuted, marginBottom: 8 }}>For a family booking your hall: they record moi at their function.</Text>
          <TextInput mode="outlined" label="Name *" value={name} onChangeText={setName} error={!!errors.name} />
          {!!errors.name && <HelperText type="error">{errors.name}</HelperText>}
          <TextInput mode="outlined" label="Mobile number *" keyboardType="phone-pad" value={phone} onChangeText={(v) => setPhone(v.replace(/\D/g, "").slice(0, 10))} left={<TextInput.Affix text="+91" />} error={!!errors.phone} style={{ marginTop: 10 }} />
          {!!errors.phone && <HelperText type="error">{errors.phone}</HelperText>}
          <Pressable onPress={() => setWhatsapp((w) => !w)} style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
            <Checkbox status={whatsapp ? "checked" : "unchecked"} onPress={() => setWhatsapp((w) => !w)} color={c.primary} />
            <Text style={{ color: c.text }}>This number has WhatsApp</Text>
          </Pressable>
          <TextInput mode="outlined" label="Password *" value={password} onChangeText={setPassword} error={!!errors.password} style={{ marginTop: 6 }} right={<TextInput.Icon icon="autorenew" onPress={() => setPassword(newPassword())} accessibilityLabel="Make a new password" />} />
          {!!errors.password && <HelperText type="error">{errors.password}</HelperText>}
          <Button mode="contained" icon="account-plus" onPress={save} loading={saving} disabled={saving} style={{ marginTop: 14, borderRadius: 12 }} contentStyle={{ height: 48 }}>Save user</Button>
        </FadeIn>

        {lastSaved && (
          <FadeIn style={[styles.card, { backgroundColor: `${c.success}14`, borderColor: c.success, borderWidth: 1 }]}>
            <Text style={{ color: c.text, fontWeight: "700" }}>{lastSaved.name} can sign in now</Text>
            <Text style={{ color: c.textMuted }}>Mobile {lastSaved.phone} · Password {lastSaved.password}</Text>
            <Button mode="contained" icon="whatsapp" buttonColor="#16a34a" style={{ marginTop: 10, borderRadius: 12 }} onPress={() => Linking.openURL(`https://wa.me/${waDigits(lastSaved.phone)}?text=${encodeURIComponent(shareText)}`)}>
              Send login on WhatsApp
            </Button>
          </FadeIn>
        )}

        <Text style={{ color: c.text, fontWeight: "800", fontSize: 16, marginVertical: 8 }}>Your Moitech users ({list.length})</Text>
        {loading ? (
          <ActivityIndicator color={c.primary} />
        ) : list.length === 0 ? (
          <Text style={{ color: c.textMuted }}>Users you register appear here.</Text>
        ) : (
          list.map((u, i) => (
            <FadeIn key={u.id} index={i}>
              <View style={[styles.row, { backgroundColor: c.card, opacity: u.isActive ? 1 : 0.65 }]}>
                <View style={[styles.avatar, { backgroundColor: c.primaryMuted }]}>
                  <Text style={{ color: c.primary, fontWeight: "800" }}>{(u.name || "?").charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.text, fontWeight: "700" }}>{u.name}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <MaterialCommunityIcons name={u.is_primary_phone_whatsup ? "whatsapp" : "phone-outline"} size={14} color={u.is_primary_phone_whatsup ? "#16a34a" : c.textMuted} />
                    <Text style={{ color: c.textMuted }}>{u.primary_phone}</Text>
                  </View>
                </View>
                <Switch value={!!u.isActive} onValueChange={() => toggle(u)} color={c.primary} accessibilityLabel={`${u.name} active`} />
              </View>
            </FadeIn>
          ))
        )}
      </ScrollView>
      <Snackbar visible={!!message} onDismiss={() => setMessage("")}>{message}</Snackbar>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, padding: 16, marginBottom: 14, elevation: 1, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 14, marginBottom: 8 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
});
