import React, { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { Button, HelperText, Snackbar, Text, TextInput } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAppTheme } from "../hooks/useAppTheme";
import { FadeIn } from "../components/mahal/MahalUi";
import { forgotPassword, resetPassword } from "../services/registrationApi";
import type { AuthStackParamList } from "./RegistrationScreen";

type Props = NativeStackScreenProps<AuthStackParamList, "ForgotPassword">;
const RESEND_AFTER = 30;

/** Forgot password: registered mobile → OTP by SMS → new password. Same as the website. */
export default function ForgotPasswordScreen({ navigation }: Props) {
  const { theme } = useAppTheme();
  const c = theme.colors;
  const [step, setStep] = useState<"phone" | "reset" | "done">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0);
  const [message, setMessage] = useState("");

  useEffect(() => navigation.setOptions({ title: "Forgot password" }), [navigation]);
  useEffect(() => {
    if (wait <= 0) return undefined;
    const id = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);

  const send = async () => {
    if (!/^[6-9]\d{9}$/.test(phone)) return setErrors({ phone: "Enter your 10 digit registered mobile number" });
    setErrors({});
    setBusy(true);
    const r = await forgotPassword(phone);
    setBusy(false);
    if (!r.ok) return setMessage(r.message);
    setWait(RESEND_AFTER);
    setStep("reset");
  };

  const reset = async () => {
    const e: Record<string, string> = {};
    if (!/^\d{6}$/.test(otp)) e.otp = "Enter the 6 digit OTP";
    if (password.length < 6) e.password = "At least 6 characters";
    if (password !== confirm) e.confirm = "The passwords do not match";
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    const r = await resetPassword(phone, otp, password);
    setBusy(false);
    if (!r.ok) return setMessage(r.message);
    setStep("done");
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <FadeIn style={[styles.card, { backgroundColor: c.card }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <View style={[styles.badge, { backgroundColor: c.primary }]}>
              <MaterialCommunityIcons name="lock-reset" size={24} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.text, fontSize: 18, fontWeight: "800" }}>Forgot password</Text>
              <Text style={{ color: c.textMuted }}>
                {step === "phone" ? "We will send an OTP to your registered mobile." : step === "reset" ? `OTP sent to ${phone}.` : "All set."}
              </Text>
            </View>
          </View>

          {step === "phone" && (
            <FadeIn key="phone">
              <TextInput mode="outlined" label="Registered mobile number" keyboardType="phone-pad" value={phone} onChangeText={(v) => setPhone(v.replace(/\D/g, "").slice(0, 10))} left={<TextInput.Affix text="+91" />} error={!!errors.phone} autoFocus />
              {!!errors.phone && <HelperText type="error">{errors.phone}</HelperText>}
              <Button mode="contained" onPress={send} loading={busy} disabled={busy} style={styles.btn} contentStyle={{ height: 48 }}>Send OTP</Button>
            </FadeIn>
          )}

          {step === "reset" && (
            <FadeIn key="reset">
              <TextInput mode="outlined" label="OTP" keyboardType="number-pad" value={otp} onChangeText={(v) => setOtp(v.replace(/\D/g, "").slice(0, 6))} error={!!errors.otp} autoFocus textContentType="oneTimeCode" />
              {!!errors.otp && <HelperText type="error">{errors.otp}</HelperText>}
              <TextInput mode="outlined" label="New password" secureTextEntry={!show} value={password} onChangeText={setPassword} error={!!errors.password} style={{ marginTop: 10 }} right={<TextInput.Icon icon={show ? "eye-off" : "eye"} onPress={() => setShow((s) => !s)} accessibilityLabel={show ? "Hide password" : "Show password"} />} />
              <HelperText type={errors.password ? "error" : "info"}>{errors.password || "At least 6 characters"}</HelperText>
              <TextInput mode="outlined" label="Confirm new password" secureTextEntry={!show} value={confirm} onChangeText={setConfirm} error={!!errors.confirm} />
              {!!errors.confirm && <HelperText type="error">{errors.confirm}</HelperText>}
              <Button mode="contained" onPress={reset} loading={busy} disabled={busy} style={styles.btn} contentStyle={{ height: 48 }}>Change password</Button>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
                <Button icon="arrow-left" onPress={() => { setStep("phone"); setOtp(""); }} compact>Change number</Button>
                <Button onPress={send} disabled={wait > 0 || busy} compact>{wait > 0 ? `Resend in ${wait}s` : "Resend OTP"}</Button>
              </View>
            </FadeIn>
          )}

          {step === "done" && (
            <FadeIn key="done" style={{ alignItems: "center", paddingVertical: 8 }}>
              <MaterialCommunityIcons name="check-circle" size={72} color={c.success} />
              <Text style={{ color: c.text, fontSize: 18, fontWeight: "800", marginTop: 6 }}>Password changed</Text>
              <Text style={{ color: c.textMuted, textAlign: "center", marginTop: 4 }}>Sign in with your mobile number and the new password.</Text>
              <Button mode="contained" onPress={() => navigation.navigate("Login")} style={[styles.btn, { alignSelf: "stretch" }]} contentStyle={{ height: 48 }}>Sign in</Button>
            </FadeIn>
          )}
        </FadeIn>
      </ScrollView>
      <Snackbar visible={!!message} onDismiss={() => setMessage("")} duration={5000}>{message}</Snackbar>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, padding: 20, elevation: 2, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } },
  badge: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  btn: { marginTop: 16, borderRadius: 12 },
});
