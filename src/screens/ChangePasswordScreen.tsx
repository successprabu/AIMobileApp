import React, { useLayoutEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from "react-native";
import { Button, HelperText, Snackbar, Text, TextInput } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import { useAppTheme } from "../hooks/useAppTheme";
import { FadeIn } from "../components/mahal/MahalUi";
import { changePassword } from "../api/admin";

/** Signed in: change the password. The new one works for every account of this mobile number. */
export default function ChangePasswordScreen() {
  const { t } = useTranslation();
  const { theme } = useAppTheme();
  const c = theme.colors;
  const navigation = useNavigation();
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState("");

  useLayoutEffect(() => navigation.setOptions({ title: t("changePassword", { defaultValue: "Change password" }) }), [navigation, t]);
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    const e: Record<string, string> = {};
    if (!form.current) e.current = "Enter your current password";
    if (form.next.length < 8) e.next = "At least 8 characters";
    if (form.next !== form.confirm) e.confirm = "The passwords do not match";
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    const r = await changePassword(form.current, form.next);
    setBusy(false);
    if (!r.ok) return setMessage(r.message);
    setDone(true);
    setForm({ current: "", next: "", confirm: "" });
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        {done ? (
          <FadeIn style={[styles.card, { backgroundColor: c.card, alignItems: "center" }]}>
            <MaterialCommunityIcons name="check-circle" size={64} color={c.success} />
            <Text style={{ color: c.text, fontSize: 18, fontWeight: "800", marginTop: 6 }}>Password changed</Text>
            <Text style={{ color: c.textMuted, textAlign: "center", marginTop: 4 }}>Use the new password next time you sign in, here and on the website.</Text>
            <Button mode="contained" onPress={() => navigation.goBack()} style={{ marginTop: 14, borderRadius: 12, alignSelf: "stretch" }}>Done</Button>
          </FadeIn>
        ) : (
          <FadeIn style={[styles.card, { backgroundColor: c.card }]}>
            <TextInput mode="outlined" label="Current password" secureTextEntry={!show} value={form.current} onChangeText={set("current")} error={!!errors.current} right={<TextInput.Icon icon={show ? "eye-off" : "eye"} onPress={() => setShow((s) => !s)} accessibilityLabel={show ? "Hide passwords" : "Show passwords"} />} />
            {!!errors.current && <HelperText type="error">{errors.current}</HelperText>}
            <TextInput mode="outlined" label="New password" secureTextEntry={!show} value={form.next} onChangeText={set("next")} error={!!errors.next} style={{ marginTop: 10 }} />
            <HelperText type={errors.next ? "error" : "info"}>{errors.next || "At least 8 characters"}</HelperText>
            <TextInput mode="outlined" label="Confirm new password" secureTextEntry={!show} value={form.confirm} onChangeText={set("confirm")} error={!!errors.confirm} />
            {!!errors.confirm && <HelperText type="error">{errors.confirm}</HelperText>}
            <Button mode="contained" icon="key-change" onPress={save} loading={busy} disabled={busy} style={{ marginTop: 16, borderRadius: 12 }} contentStyle={{ height: 48 }}>Change password</Button>
          </FadeIn>
        )}
      </ScrollView>
      <Snackbar visible={!!message} onDismiss={() => setMessage("")} duration={5000}>{message}</Snackbar>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, padding: 16, elevation: 1, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
});
