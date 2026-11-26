import React, { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { HelperText, Text, TextInput } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAppTheme } from "../hooks/useAppTheme";
import { useThemedInputProps } from "../hooks/useThemedInputProps";
import { AuthCard, AuthHero, Notice, PillButton, Rise, StepBar } from "../components/ui/AuthUi";
import { SuccessBurst } from "../components/ui/Motion";
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
    if (password.length < 8) e.password = "At least 8 characters";
    if (password !== confirm) e.confirm = "The passwords do not match";
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    const r = await resetPassword(phone, otp, password);
    setBusy(false);
    if (!r.ok) return setMessage(r.message);
    setStep("done");
  };

  const insets = useSafeAreaInsets();
  const inputTheme = useThemedInputProps();
  const field = [inputTheme.style, styles.field];
  const back = () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate("Login"));

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <AuthHero
          compact
          art="reset"
          paddingTop={insets.top}
          onBack={back}
          title="Forgot password"
          subtitle={step === "phone" ? "We will send an OTP to your registered mobile." : `OTP sent to +91 ${phone}.`}
        />

        <AuthCard>
          <StepBar steps={["Mobile", "OTP", "New password"]} step={step === "phone" ? 0 : 1} />
          {message ? <Notice kind="error" text={message} /> : null}

          {step === "phone" && (
            <Rise key="phone">
              <TextInput
                {...inputTheme}
                mode="outlined"
                label="Registered mobile number"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={(v) => { setPhone(v.replace(/\D/g, "").slice(0, 10)); setMessage(""); }}
                left={<TextInput.Icon icon="cellphone" />}
                outlineStyle={styles.outline}
                error={!!errors.phone}
                autoFocus
                style={field}
              />
              {!!errors.phone && <HelperText type="error">{errors.phone}</HelperText>}
              <PillButton label="Send OTP" icon="message-text-outline" onPress={send} loading={busy} disabled={busy} style={styles.btn} />
            </Rise>
          )}

          {step !== "phone" && (
            <Rise key="reset">
              <TextInput
                {...inputTheme}
                mode="outlined"
                label="OTP"
                keyboardType="number-pad"
                value={otp}
                onChangeText={(v) => { setOtp(v.replace(/\D/g, "").slice(0, 6)); setMessage(""); }}
                left={<TextInput.Icon icon="shield-key-outline" />}
                outlineStyle={styles.outline}
                error={!!errors.otp}
                autoFocus
                textContentType="oneTimeCode"
                autoComplete="sms-otp"
                style={field}
              />
              {!!errors.otp && <HelperText type="error">{errors.otp}</HelperText>}
              <TextInput
                {...inputTheme}
                mode="outlined"
                label="New password"
                secureTextEntry={!show}
                value={password}
                onChangeText={setPassword}
                error={!!errors.password}
                left={<TextInput.Icon icon="lock-outline" />}
                right={<TextInput.Icon icon={show ? "eye-off" : "eye"} onPress={() => setShow((x) => !x)} forceTextInputFocus={false} accessibilityLabel={show ? "Hide password" : "Show password"} />}
                outlineStyle={styles.outline}
                style={field}
              />
              <HelperText type={errors.password ? "error" : "info"}>{errors.password || "At least 8 characters"}</HelperText>
              <TextInput
                {...inputTheme}
                mode="outlined"
                label="Confirm new password"
                secureTextEntry={!show}
                value={confirm}
                onChangeText={setConfirm}
                error={!!errors.confirm}
                left={<TextInput.Icon icon="lock-check-outline" />}
                outlineStyle={styles.outline}
                style={field}
              />
              {!!errors.confirm && <HelperText type="error">{errors.confirm}</HelperText>}
              <PillButton label="Change password" icon="lock-reset" onPress={reset} loading={busy} disabled={busy} style={styles.btn} />
              <View style={styles.row}>
                <Pressable onPress={() => { setStep("phone"); setOtp(""); setMessage(""); }} hitSlop={8} accessibilityRole="button" style={styles.link}>
                  <MaterialCommunityIcons name="arrow-left" size={16} color={c.primary} />
                  <Text style={{ color: c.primary, fontWeight: "700" }}>Change number</Text>
                </Pressable>
                <Pressable onPress={send} disabled={wait > 0 || busy} hitSlop={8} accessibilityRole="button" style={styles.link}>
                  <MaterialCommunityIcons name={wait > 0 ? "timer-sand" : "refresh"} size={16} color={wait > 0 ? c.textMuted : c.primary} />
                  <Text style={{ color: wait > 0 ? c.textMuted : c.primary, fontWeight: "700" }}>{wait > 0 ? `Resend in ${wait}s` : "Resend OTP"}</Text>
                </Pressable>
              </View>
            </Rise>
          )}
        </AuthCard>

        <Rise delay={500} style={styles.signIn}>
          <Text style={{ color: c.textMuted }}>Remembered it?</Text>
          <Pressable onPress={() => navigation.navigate("Login")} accessibilityRole="link" hitSlop={8}>
            <Text style={{ color: c.primary, fontWeight: "800" }}>Sign in</Text>
          </Pressable>
        </Rise>
      </ScrollView>

      {step === "done" ? (
        <SuccessBurst
          title="Password changed"
          subtitle="Sign in with your mobile number and the new password."
          onDone={() => setTimeout(() => navigation.navigate("Login"), 900)}
        />
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: 4 },
  outline: { borderRadius: 14 },
  btn: { marginTop: 14 },
  row: { flexDirection: "row", justifyContent: "space-between", marginTop: 16 },
  link: { flexDirection: "row", alignItems: "center", gap: 4 },
  signIn: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, marginTop: 22 },
});
