import React, { useEffect, useMemo, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  Button,
  Checkbox,
  Snackbar,
  Switch,
  Text,
  TextInput,
} from "react-native-paper";
import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAppTheme } from "../hooks/useAppTheme";
import { APP_DISPLAY_NAME } from "../theme/themes";
import {
  checkMobileAvailable,
  generateOtp,
  registerCustomer,
  registrationInitiate,
  sendOtpSms,
  type RegistrationForm,
} from "../services/registrationApi";

export type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
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

export default function RegistrationScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { theme } = useAppTheme();
  const c = theme.colors;
  const styles = useMemo(() => makeRegStyles(c), [c]);
  const [form, setForm] = useState(emptyForm);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showOptional, setShowOptional] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);
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
      const check = await checkMobileAvailable(form.primary_phone);
      if (!check.result) {
        showMsg(check.message ?? t("no_user_found"), true);
        return;
      }
      const otp = generateOtp();
      setGeneratedOtp(otp);
      await sendOtpSms(form.primary_phone, otp);
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
    if (form.otp !== generatedOtp) {
      setErrors({ otp: t("mobile_invalid_otp", { defaultValue: "Invalid OTP." }) });
      return;
    }
    try {
      await registrationInitiate(form.primary_phone);
      setOtpVerified(true);
      showMsg(t("verifyOTP"));
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
      const res = await registerCustomer(form);
      if (res.result) {
        showMsg(t("mobile_register_success", { defaultValue: "Registration successful!" }));
        setTimeout(() => navigation.replace("Login"), 1500);
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

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Image source={require("../../assets/brand-logo.png")} style={styles.logo} />
          <Text variant="headlineSmall" style={styles.title}>
            {APP_DISPLAY_NAME}
          </Text>
          <Text variant="bodyMedium" style={styles.sub}>
            {t("registration")}
          </Text>
        </View>

        <View style={styles.toggleRow}>
          <Text variant="bodyMedium">{t("display_mandatory_fields_only")}</Text>
          <Switch value={!showOptional} onValueChange={(v) => setShowOptional(!v)} />
        </View>

        <TextInput
          label={t("name")}
          mode="outlined"
          value={form.name}
          onChangeText={(v) => setField("name", v)}
          error={!!errors.name}
          style={styles.field}
        />
        {errors.name ? <Text style={styles.err}>{errors.name}</Text> : null}

        <View style={styles.row}>
          <TextInput
            label={t("primary_phone")}
            mode="outlined"
            keyboardType="phone-pad"
            value={form.primary_phone}
            onChangeText={(v) => setField("primary_phone", v.replace(/\D/g, "").slice(0, 10))}
            disabled={otpVerified}
            error={!!errors.primary_phone}
            style={[styles.field, styles.flex1]}
          />
          <Button
            mode="contained"
            onPress={() => void handleSendOtp()}
            loading={sendingOtp}
            disabled={(otpSent && !resendEnabled) || otpVerified}
            style={styles.otpBtn}
          >
            {resendEnabled ? t("resendOTP") : t("sendOTP")}
          </Button>
        </View>
        {errors.primary_phone ? <Text style={styles.err}>{errors.primary_phone}</Text> : null}

        <View style={styles.row}>
          <TextInput
            label={t("otp")}
            mode="outlined"
            keyboardType="number-pad"
            value={form.otp}
            onChangeText={(v) => setField("otp", v.replace(/\D/g, "").slice(0, 6))}
            disabled={otpVerified}
            error={!!errors.otp}
            style={[styles.field, styles.flex1]}
          />
          <Button
            mode="contained-tonal"
            onPress={() => void handleVerifyOtp()}
            disabled={form.otp.length !== 6 || otpVerified}
            style={styles.otpBtn}
          >
            {t("verifyOTP")}
          </Button>
        </View>
        {otpSent && !otpVerified && otpTimer > 0 ? (
          <Text variant="bodySmall" style={styles.timer}>
            {t("resendIn")} {otpTimer} {t("seconds")}
          </Text>
        ) : null}

        <TextInput
          label={t("password")}
          mode="outlined"
          secureTextEntry
          value={form.password}
          onChangeText={(v) => setField("password", v)}
          error={!!errors.password}
          style={styles.field}
        />
        <TextInput
          label={t("confirm_password")}
          mode="outlined"
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          error={!!errors.confirmPassword}
          style={styles.field}
        />
        {errors.confirmPassword ? (
          <Text style={styles.err}>{errors.confirmPassword}</Text>
        ) : null}

        <TextInput
          label={t("pincode")}
          mode="outlined"
          keyboardType="number-pad"
          value={String(form.pincode)}
          onChangeText={(v) => setField("pincode", v.replace(/\D/g, "").slice(0, 6))}
          error={!!errors.pincode}
          style={styles.field}
        />

        {showOptional ? (
          <>
            <TextInput
              label={t("country")}
              mode="outlined"
              value={form.country}
              onChangeText={(v) => setField("country", v)}
              style={styles.field}
            />
            <TextInput
              label={t("state")}
              mode="outlined"
              value={form.state}
              onChangeText={(v) => setField("state", v)}
              style={styles.field}
            />
            <TextInput
              label={t("district")}
              mode="outlined"
              value={form.district}
              onChangeText={(v) => setField("district", v)}
              style={styles.field}
            />
            <TextInput
              label={t("address_line1")}
              mode="outlined"
              value={form.address_line1}
              onChangeText={(v) => setField("address_line1", v)}
              style={styles.field}
            />
            <View style={styles.checkRow}>
              <Checkbox
                status={form.is_primary_phone_whatsup ? "checked" : "unchecked"}
                onPress={() =>
                  setField("is_primary_phone_whatsup", !form.is_primary_phone_whatsup)
                }
              />
              <Text>{t("is_primary_phone_whatsup")}</Text>
            </View>
          </>
        ) : null}

        <Button
          mode="contained"
          icon="account-plus"
          onPress={() => void handleRegister()}
          loading={submitting}
          disabled={!otpVerified}
          style={styles.registerBtn}
        >
          {t("register")}
        </Button>

        <Button mode="text" onPress={() => navigation.navigate("Login")} style={styles.back}>
          {t("sign_in")}
        </Button>
      </ScrollView>

      <Snackbar
        visible={snack.visible}
        onDismiss={() => setSnack((s) => ({ ...s, visible: false }))}
        duration={3500}
        style={snack.isError ? styles.snackErr : undefined}
      >
        {snack.message}
      </Snackbar>
    </KeyboardAvoidingView>
  );
}

function makeRegStyles(c: ReturnType<typeof useAppTheme>["theme"]["colors"]) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: c.background },
    scroll: { padding: 20, paddingBottom: 40 },
    header: { alignItems: "center", marginBottom: 16 },
    logo: { width: 48, height: 52, marginBottom: 8 },
    title: { fontWeight: "700", color: c.text },
    sub: { color: c.textMuted, marginTop: 4, textAlign: "center" },
    toggleRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    field: { marginBottom: 4, backgroundColor: c.inputBg },
    row: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
    flex1: { flex: 1 },
    otpBtn: { marginTop: 8 },
    timer: { color: c.textMuted, marginBottom: 8 },
    err: { color: c.danger, marginBottom: 8, marginLeft: 4 },
    checkRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
    registerBtn: { marginTop: 16, paddingVertical: 4 },
    back: { marginTop: 8 },
    snackErr: { backgroundColor: c.danger },
  });
}
