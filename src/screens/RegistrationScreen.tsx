import React, { useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  Checkbox,
  Snackbar,
  Switch,
  Text,
  TextInput,
} from "react-native-paper";
import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAppTheme } from "../hooks/useAppTheme";
import { useThemedInputProps } from "../hooks/useThemedInputProps";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthCard, AuthHero, PillButton, PopCheck, Rise, StepBar } from "../components/ui/AuthUi";
import { SuccessBurst } from "../components/ui/Motion";
import {
  checkMobileAvailable,
  registerCustomer,
  sendOtp,
  verifyOtp,
  type RegistrationForm,
} from "../services/registrationApi";

export type AuthStackParamList = {
  Login: undefined;
  /** kind: "moitech" (default) or "mahal" (a mahal owner account). */
  SignUp: { kind?: "moitech" | "mahal" } | undefined;
  ForgotPassword: undefined;
};

type Props = NativeStackScreenProps<AuthStackParamList, "SignUp">;

function emptyForm(): RegistrationForm {
  const now = new Date().toISOString();
  return {
    id: 0,
    name: "",
    primary_phone: "",
    secondary_phone: "",
    country: "",
    state: "",
    district: "",
    address_line1: "",
    address_line2: "",
    is_primary_phone_whatsup: false,
    is_secondary_phone_whatsup: false,
    pincode: "",
    password: "",
    otp: "",
    createdBy: "0",
    createdDt: now,
    updateddBy: "0",
    updatedDt: now,
    isActive: true,
  };
}

export default function RegistrationScreen({ navigation, route }: Props) {
  // Moitech (AU) or mahal owner (MU) account, chosen on the login screen.
  const mahal = route.params?.kind === "mahal";
  const userType = mahal ? "MU" : "AU";
  // The coloured hero carries the title and a back arrow (the header is hidden in RootNavigator).
  React.useEffect(() => navigation.setOptions({ title: mahal ? "Mahal Management sign up" : "DigiMoi sign up" }), [navigation, mahal]);
  const product = mahal
    ? { label: "Mahal Management", icon: "office-building-outline" as const, color: "#f59e0b" }
    : { label: "DigiMoi", icon: "hand-heart-outline" as const, color: "#6366f1" };
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { theme } = useAppTheme();
  const c = theme.colors;
  const inputTheme = useThemedInputProps();
  const styles = useMemo(() => makeRegStyles(c), [c]);
  const [form, setForm] = useState(emptyForm);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showOptional, setShowOptional] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [resendEnabled, setResendEnabled] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [snack, setSnack] = useState({ visible: false, message: "", isError: false });

  useEffect(() => {
    if (!otpSent || otpTimer <= 0) return;
    const id = setInterval(() => {
      setOtpTimer((t) => {
        if (t <= 1) {
          setResendEnabled(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [otpSent, otpTimer]);

  const showMsg = (message: string, isError = false) => {
    setSnack({ visible: true, message, isError });
  };

  const setField = (key: keyof RegistrationForm, value: string | boolean | number) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };

  const handleSendOtp = async () => {
    if (!/^\d{10}$/.test(form.primary_phone)) {
      setErrors({ primary_phone: t("mobile_invalid_mobile") });
      return;
    }
    setSendingOtp(true);
    try {
      const check = await checkMobileAvailable(form.primary_phone, userType);
      if (!check.result) {
        showMsg(check.message ?? t("no_user_found"), true);
        return;
      }
      // The server makes the code and sends the SMS.
      const sent = await sendOtp(form.primary_phone, userType);
      if (!sent.ok) {
        showMsg(sent.message || t("an_error_occurred"), true);
        return;
      }
      setOtpSent(true);
      setOtpTimer(180);
      setResendEnabled(false);
      showMsg(t("mobile_otp_sent", { defaultValue: "OTP sent to your mobile." }));
    } catch {
      showMsg(t("an_error_occurred"), true);
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    try {
      // The server checks the code.
      const checked = await verifyOtp(form.primary_phone, form.otp);
      if (!checked.ok) {
        setErrors({ otp: checked.message || t("mobile_invalid_otp", { defaultValue: "Invalid OTP." }) });
        return;
      }
      setOtpVerified(true);
      showMsg(t("mobile_verified", { defaultValue: "Mobile number verified" }));
    } catch {
      showMsg(t("an_error_occurred"), true);
    }
  };

  const handleRegister = async () => {
    const err: Record<string, string> = {};
    if (!form.name.trim()) err.name = t("validation_name");
    if (!/^\d{10}$/.test(form.primary_phone)) err.primary_phone = t("mobile_invalid_mobile");
    if (!/^\d{6}$/.test(form.otp)) err.otp = t("mobile_invalid_otp", { defaultValue: "Enter 6-digit OTP." });
    if (!otpVerified) err.otp = t("verifyOTP");
    if (!form.password || form.password.length < 6) err.password = t("mobile_invalid_password");
    if (confirmPassword !== form.password) {
      err.confirmPassword = t("mobile_password_mismatch", {
        defaultValue: "Passwords do not match.",
      });
    }
    if (!/^\d{6}$/.test(String(form.pincode))) {
      err.pincode = t("enter_pincode");
    }
    setErrors(err);
    if (Object.keys(err).length > 0) return;

    setSubmitting(true);
    try {
      const res = await registerCustomer(form, userType);
      if (res.result) {
        // A short celebration, then the sign-in screen (SuccessBurst calls replace when it finishes).
        setRegistered(true);
      } else {
        showMsg(res.message ?? t("an_error_occurred"), true);
      }
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        t("an_error_occurred");
      showMsg(msg, true);
    } finally {
      setSubmitting(false);
    }
  };

  const step = otpVerified ? 2 : otpSent ? 1 : 0;
  const fieldStyle = [inputTheme.style, styles.field];

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <AuthHero
          compact
          art={mahal ? "mahal" : "moitech"}
          paddingTop={insets.top}
          onBack={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate("Login"))}
          badge={product}
          title={t("create_account", { defaultValue: "Create an account" })}
          subtitle={mahal
            ? t("signup_mahal_sub", { defaultValue: "Take hall bookings online. 1 month free." })
            : t("signup_moitech_sub", { defaultValue: "Record moi (gifts) at your function. 7 days free." })}
        />

        <AuthCard>
          <StepBar
            steps={[t("step_mobile", { defaultValue: "Mobile" }), t("step_verify", { defaultValue: "Verify" }), t("step_details", { defaultValue: "Details" })]}
            step={step}
          />

          <Text style={styles.section}>{t("verify_your_mobile", { defaultValue: "Verify your mobile" })}</Text>

          <TextInput
            {...inputTheme}
            label={t("name")}
            mode="outlined"
            value={form.name}
            onChangeText={(v) => setField("name", v)}
            error={!!errors.name}
            outlineStyle={styles.outline}
            left={<TextInput.Icon icon="account-outline" />}
            style={fieldStyle}
          />
          {errors.name ? <Text style={styles.err}>{errors.name}</Text> : null}

          <TextInput
            {...inputTheme}
            label={t("primary_phone")}
            mode="outlined"
            keyboardType="phone-pad"
            value={form.primary_phone}
            onChangeText={(v) => setField("primary_phone", v.replace(/\D/g, "").slice(0, 10))}
            disabled={otpVerified}
            error={!!errors.primary_phone}
            outlineStyle={styles.outline}
            left={<TextInput.Icon icon="cellphone" />}
            right={otpVerified ? <TextInput.Icon icon="check-circle" color="#16a34a" /> : undefined}
            style={fieldStyle}
          />
          {errors.primary_phone ? <Text style={styles.err}>{errors.primary_phone}</Text> : null}

          {otpVerified ? (
            <PopCheck label={t("mobile_verified", { defaultValue: "Mobile number verified" })} />
          ) : (
            <>
              {!otpSent || resendEnabled ? (
                <PillButton
                  label={resendEnabled ? t("resendOTP") : t("sendOTP")}
                  icon="message-text-outline"
                  variant={otpSent ? "soft" : "solid"}
                  onPress={() => void handleSendOtp()}
                  loading={sendingOtp}
                  disabled={sendingOtp}
                  style={styles.gap}
                />
              ) : null}

              {otpSent ? (
                <Rise>
                  <View style={styles.row}>
                    <TextInput
                      {...inputTheme}
                      label={t("otp")}
                      mode="outlined"
                      keyboardType="number-pad"
                      value={form.otp}
                      onChangeText={(v) => setField("otp", v.replace(/\D/g, "").slice(0, 6))}
                      error={!!errors.otp}
                      outlineStyle={styles.outline}
                      left={<TextInput.Icon icon="shield-key-outline" />}
                      style={[inputTheme.style, styles.field, styles.flex1, styles.otp]}
                      autoComplete="sms-otp"
                      textContentType="oneTimeCode"
                    />
                    <PillButton
                      label={t("verifyOTP")}
                      onPress={() => void handleVerifyOtp()}
                      disabled={form.otp.length !== 6}
                      style={styles.verifyBtn}
                    />
                  </View>
                  {errors.otp ? <Text style={styles.err}>{errors.otp}</Text> : null}
                  {otpTimer > 0 ? (
                    <View style={styles.timerRow}>
                      <MaterialCommunityIcons name="timer-sand" size={14} color={c.textMuted} />
                      <Text variant="bodySmall" style={styles.timer}>
                        {t("resendIn")} {otpTimer} {t("seconds")}
                      </Text>
                    </View>
                  ) : null}
                </Rise>
              ) : null}
            </>
          )}
        </AuthCard>

        <AuthCard delay={380} style={[styles.secondCard, !otpVerified && styles.locked]}>
          <View style={styles.sectionRow}>
            <Text style={[styles.section, { marginBottom: 0 }]}>{t("account_details", { defaultValue: "Account details" })}</Text>
            {!otpVerified ? <MaterialCommunityIcons name="lock-outline" size={18} color={c.textMuted} /> : null}
          </View>
          {!otpVerified ? (
            <Text style={styles.hint}>{t("verify_first", { defaultValue: "Verify your mobile number first, then set your password." })}</Text>
          ) : null}

          <TextInput
            {...inputTheme}
            label={t("password")}
            mode="outlined"
            secureTextEntry={!showPassword}
            value={form.password}
            onChangeText={(v) => setField("password", v)}
            error={!!errors.password}
            outlineStyle={styles.outline}
            left={<TextInput.Icon icon="lock-outline" />}
            right={<TextInput.Icon icon={showPassword ? "eye-off" : "eye"} onPress={() => setShowPassword((x) => !x)} forceTextInputFocus={false} />}
            style={fieldStyle}
          />
          {errors.password ? <Text style={styles.err}>{errors.password}</Text> : null}
          <TextInput
            {...inputTheme}
            label={t("confirm_password")}
            mode="outlined"
            secureTextEntry={!showPassword}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            error={!!errors.confirmPassword}
            outlineStyle={styles.outline}
            left={<TextInput.Icon icon="lock-check-outline" />}
            style={fieldStyle}
          />
          {errors.confirmPassword ? <Text style={styles.err}>{errors.confirmPassword}</Text> : null}

          <TextInput
            {...inputTheme}
            label={t("pincode")}
            mode="outlined"
            keyboardType="number-pad"
            value={String(form.pincode)}
            onChangeText={(v) => setField("pincode", v.replace(/\D/g, "").slice(0, 6))}
            error={!!errors.pincode}
            outlineStyle={styles.outline}
            left={<TextInput.Icon icon="map-marker-outline" />}
            style={fieldStyle}
          />
          {errors.pincode ? <Text style={styles.err}>{errors.pincode}</Text> : null}

          <Pressable onPress={() => setShowOptional((v) => !v)} style={styles.toggleRow} accessibilityRole="switch" accessibilityState={{ checked: showOptional }}>
            <MaterialCommunityIcons name="card-account-details-outline" size={20} color={c.primary} />
            <Text style={styles.toggleText}>{t("add_address_optional", { defaultValue: "Add address (optional)" })}</Text>
            <Switch value={showOptional} onValueChange={setShowOptional} color={c.primary} />
          </Pressable>

          {showOptional ? (
            <Rise>
              {(["country", "state", "district", "address_line1"] as const).map((k) => (
                <TextInput
                  key={k}
                  {...inputTheme}
                  label={t(k)}
                  mode="outlined"
                  value={form[k]}
                  onChangeText={(v) => setField(k, v)}
                  outlineStyle={styles.outline}
                  style={fieldStyle}
                />
              ))}
              <View style={styles.checkRow}>
                <Checkbox
                  status={form.is_primary_phone_whatsup ? "checked" : "unchecked"}
                  onPress={() => setField("is_primary_phone_whatsup", !form.is_primary_phone_whatsup)}
                  color={c.primary}
                />
                <MaterialCommunityIcons name="whatsapp" size={18} color="#25d366" />
                <Text style={{ color: c.text }}>{t("is_primary_phone_whatsup")}</Text>
              </View>
            </Rise>
          ) : null}

          <PillButton
            label={t("register")}
            icon="account-plus"
            onPress={() => void handleRegister()}
            loading={submitting}
            disabled={!otpVerified || submitting}
            style={styles.registerBtn}
          />
        </AuthCard>

        <Rise delay={560} style={styles.signInRow}>
          <Text style={{ color: c.textMuted }}>{t("already_have_account", { defaultValue: "Already have an account?" })}</Text>
          <Pressable onPress={() => navigation.navigate("Login")} accessibilityRole="link" hitSlop={8}>
            <Text style={{ color: c.primary, fontWeight: "800" }}>{t("sign_in")}</Text>
          </Pressable>
        </Rise>
      </ScrollView>

      {registered ? (
        <SuccessBurst
          title={t("mobile_register_success", { defaultValue: "Registration successful!" })}
          subtitle={t("signin_with_new_account", { defaultValue: "Sign in with your mobile number and password." })}
          onDone={() => setTimeout(() => navigation.replace("Login"), 700)}
        />
      ) : null}

      <Snackbar
        visible={snack.visible}
        onDismiss={() => setSnack((s) => ({ ...s, visible: false }))}
        duration={3500}
        style={snack.isError ? styles.snackErr : styles.snackOk}
      >
        {snack.message}
      </Snackbar>
    </KeyboardAvoidingView>
  );
}

function makeRegStyles(c: ReturnType<typeof useAppTheme>["theme"]["colors"]) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: c.background },
    scroll: { paddingBottom: 40 },
    section: { fontSize: 17, fontWeight: "900", color: c.text, marginBottom: 12 },
    sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
    hint: { color: c.textMuted, marginBottom: 12, marginTop: 4 },
    field: { marginBottom: 10, backgroundColor: c.inputBg },
    outline: { borderRadius: 14 },
    otp: { letterSpacing: 6 },
    row: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
    flex1: { flex: 1 },
    gap: { marginTop: 4, marginBottom: 6 },
    verifyBtn: { marginTop: 4 },
    timerRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 },
    timer: { color: c.textMuted },
    err: { color: c.danger, marginTop: -6, marginBottom: 8, marginLeft: 6, fontSize: 12 },
    secondCard: { marginTop: 16 },
    locked: { opacity: 0.6 },
    toggleRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 14, backgroundColor: c.primaryMuted, marginTop: 4, marginBottom: 12 },
    toggleText: { flex: 1, color: c.text, fontWeight: "700" },
    checkRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 8 },
    registerBtn: { marginTop: 8 },
    signInRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, marginTop: 22 },
    snackErr: { backgroundColor: c.danger },
    snackOk: { backgroundColor: "#15803d" },
  });
}
