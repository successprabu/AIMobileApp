import React, { useLayoutEffect, useState } from "react";
import { KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, Share, StyleSheet, View } from "react-native";
import { Button, Checkbox, HelperText, Snackbar, Text, TextInput } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useAppTheme } from "../../hooks/useAppTheme";
import { useAuth } from "../../context/AuthContext";
import type { MainStackParamList } from "../../navigation/types";
import type { AuthUser } from "../../types/auth";
import { addCustomer, newPassword } from "../../api/admin";
import { FadeIn } from "../../components/mahal/MahalUi";

type Nav = NativeStackNavigationProp<MainStackParamList>;
type Kind = "moitech" | "mahal";

const KINDS: Record<Kind, { label: string; product: string; userType: string; role: string; trialDays: number; icon: keyof typeof MaterialCommunityIcons.glyphMap; color: string; hint: string }> = {
  moitech: { label: "DigiMoi client", product: "DigiMoi", userType: "AU", role: "Admin", trialDays: 7, icon: "hand-heart-outline", color: "#6366f1", hint: "Records moi at functions. 7 days free." },
  mahal: { label: "Mahal owner", product: "Mahal Management", userType: "MU", role: "Mahal Admin", trialDays: 30, icon: "office-building-outline", color: "#f59e0b", hint: "Takes hall bookings. 1 month free." },
};

// Sent with the login so the client can install the app (always the newest version).
const APP_URL = "https://github.com/successprabu/AIMobileApp/releases/latest/download/MySuccess.apk";

/** Super admin: create an independent Moitech or Mahal Management account and send the login. */
export default function RegisterClientScreen() {
  const { theme } = useAppTheme();
  const c = theme.colors;
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<MainStackParamList, "RegisterClient">>();
  const { user } = useAuth();
  const admin = user as AuthUser;
  const [kind, setKind] = useState<Kind>(route.params?.type === "mahal" ? "mahal" : "moitech");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState(true);
  const [password, setPassword] = useState(newPassword);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [done, setDone] = useState<{ name: string; phone: string; password: string; kind: Kind } | null>(null);
  const k = KINDS[kind];

  useLayoutEffect(() => navigation.setOptions({ title: "Register a client" }), [navigation]);

  const submit = async () => {
    const e: Record<string, string> = {};
    if (name.trim().length < 2) e.name = "Enter the client name";
    if (!/^[6-9]\d{9}$/.test(phone)) e.phone = "Enter a 10 digit mobile number";
    if (password.length < 8) e.password = "At least 8 characters";
    setErrors(e);
    if (Object.keys(e).length || saving) return;
    setSaving(true);
    const now = new Date();
    const by = String(admin?.id ?? "SYSTEM");
    // Same shape as the public sign-up pages, as an independent account (customerId 0).
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
      userType: k.userType,
      customerId: 0,
      appName: "MOI",
      country_code: "+91",
      password,
      isActive: true,
      activated_from: now.toISOString(),
      activated_To: new Date(now.getTime() + k.trialDays * 86400000).toISOString(),
      current_plan_id: 0,
      previous_plan_id: 0,
      referedBy: by,
      createdBy: by,
      createdDt: now.toISOString(),
      updatedBy: by,
      updatedDt: now.toISOString(),
    });
    setSaving(false);
    if (r.ok) setDone({ name: name.trim(), phone, password, kind });
    else setMessage(/already/i.test(r.message) ? `This number already has a ${k.product} account.` : r.message);
  };

  const loginMessage = done
    ? [
        `Welcome to MySuccess ${KINDS[done.kind].product}!`,
        `Your account is ready, free for ${KINDS[done.kind].trialDays === 30 ? "1 month" : `${KINDS[done.kind].trialDays} days`}.`,
        "Sign in on the My Success app or website with:",
        `Mobile number: ${done.phone}`,
        `Password: ${done.password}`,
        "Please change your password after you sign in.",
        `Android app: ${APP_URL}`,
      ].join("\n")
    : "";

  if (done) {
    return (
      <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={{ padding: 16 }}>
        <FadeIn style={[styles.card, { backgroundColor: c.card, alignItems: "center" }]}>
          <MaterialCommunityIcons name="check-circle" size={64} color={c.success} />
          <Text style={{ color: c.text, fontSize: 20, fontWeight: "800", marginTop: 6 }}>{done.name} is registered</Text>
          <Text style={{ color: c.textMuted }}>{KINDS[done.kind].label} · signs in as {KINDS[done.kind].role}</Text>
          <View style={[styles.messageBox, { backgroundColor: c.chipBg }]}>
            <Text style={{ color: c.text, lineHeight: 22 }}>{loginMessage}</Text>
          </View>
          <Button mode="contained" icon="whatsapp" buttonColor="#16a34a" style={styles.wide} contentStyle={{ height: 48 }} onPress={() => Linking.openURL(`https://wa.me/91${done.phone}?text=${encodeURIComponent(loginMessage)}`)}>
            Send on WhatsApp
          </Button>
          <Button mode="outlined" icon="share-variant" style={styles.wide} onPress={() => Share.share({ message: loginMessage })}>Share</Button>
          <Button icon="account-plus" style={styles.wide} onPress={() => { setDone(null); setName(""); setPhone(""); setPassword(newPassword()); }}>Register another</Button>
        </FadeIn>
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Text style={{ color: c.text, fontWeight: "700", marginBottom: 8 }}>What are you registering?</Text>
        {(Object.keys(KINDS) as Kind[]).map((key, i) => {
          const x = KINDS[key];
          const on = kind === key;
          return (
            <FadeIn key={key} index={i}>
              <Pressable onPress={() => setKind(key)} accessibilityRole="radio" accessibilityState={{ selected: on }} style={[styles.kind, { backgroundColor: on ? `${x.color}14` : c.card, borderColor: on ? x.color : c.border }]}>
                <View style={[styles.kindIcon, { backgroundColor: `${x.color}22` }]}>
                  <MaterialCommunityIcons name={x.icon} size={24} color={x.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.text, fontWeight: "800" }}>{x.label}</Text>
                  <Text style={{ color: c.textMuted, fontSize: 13 }}>{x.hint}</Text>
                </View>
                <MaterialCommunityIcons name={on ? "radiobox-marked" : "radiobox-blank"} size={22} color={on ? x.color : c.textMuted} />
              </Pressable>
            </FadeIn>
          );
        })}

        <FadeIn index={2} style={[styles.card, { backgroundColor: c.card, marginTop: 6 }]}>
          <TextInput mode="outlined" label={kind === "mahal" ? "Owner name *" : "Client name *"} value={name} onChangeText={setName} error={!!errors.name} />
          {!!errors.name && <HelperText type="error">{errors.name}</HelperText>}
          <TextInput mode="outlined" label="Mobile number *" keyboardType="phone-pad" value={phone} onChangeText={(v) => setPhone(v.replace(/\D/g, "").slice(0, 10))} left={<TextInput.Affix text="+91" />} error={!!errors.phone} style={{ marginTop: 10 }} />
          <HelperText type={errors.phone ? "error" : "info"}>{errors.phone || "They sign in with this number"}</HelperText>
          <Pressable onPress={() => setWhatsapp((w) => !w)} style={{ flexDirection: "row", alignItems: "center" }}>
            <Checkbox status={whatsapp ? "checked" : "unchecked"} onPress={() => setWhatsapp((w) => !w)} color={c.primary} />
            <Text style={{ color: c.text }}>This number has WhatsApp</Text>
          </Pressable>
          <TextInput
            mode="outlined"
            label="Password *"
            value={password}
            onChangeText={setPassword}
            error={!!errors.password}
            style={{ marginTop: 10 }}
            right={<TextInput.Icon icon="autorenew" onPress={() => setPassword(newPassword())} accessibilityLabel="Make a new password" />}
          />
          <HelperText type={errors.password ? "error" : "info"}>{errors.password || "Created for you. You will send it to the client."}</HelperText>
        </FadeIn>

        <Button mode="contained" icon="account-plus" onPress={submit} loading={saving} disabled={saving} style={{ borderRadius: 14 }} contentStyle={{ height: 52 }} labelStyle={{ fontSize: 16, fontWeight: "700" }}>
          Register {kind === "mahal" ? "mahal owner" : "DigiMoi client"}
        </Button>
      </ScrollView>
      <Snackbar visible={!!message} onDismiss={() => setMessage("")} duration={5000}>{message}</Snackbar>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, padding: 16, marginBottom: 14, elevation: 1, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  kind: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 16, borderWidth: 1.5, marginBottom: 10 },
  kindIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  messageBox: { borderRadius: 12, padding: 14, marginTop: 16, alignSelf: "stretch" },
  wide: { alignSelf: "stretch", marginTop: 10, borderRadius: 12 },
});

