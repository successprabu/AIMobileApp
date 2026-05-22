import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Image,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { Button, Text, TextInput } from "react-native-paper";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LOGIN_API, LOGIN_USER_ACCOUNT_CHECK_API } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import type { AuthUser } from "../types/auth";
import type { AuthStackParamList } from "./RegistrationScreen";
import { APP_DISPLAY_NAME, colors } from "../theme/appTheme";

type UserTypeOption = { userType: string; userTypeDescription: string };

type AccountCheckRow = {
  userType: string;
  userTypeDescription: string;
};

export default function LoginScreen() {
  const { t } = useTranslation();
  const { signIn } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [userType, setUserType] = useState("AU");
  const [userTypeDescription, setUserTypeDescription] = useState("");
  const [userTypes, setUserTypes] = useState<UserTypeOption[]>([]);
  const [loginError, setLoginError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingUser, setCheckingUser] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const validateLoginInput = (u: string, p: string): string | null => {
    if (!/^\d+$/.test(u.trim())) {
      return t("mobile_invalid_mobile", {
        defaultValue: "Please enter a valid mobile number.",
      });
    }
    if (p.length < 6 || p.length > 16) {
      return t("mobile_invalid_password", {
        defaultValue: "Password must be between 6 and 16 characters.",
      });
    }
    return null;
  };

  const handleUsernameBlur = async () => {
    if (!username.trim()) return;
    setLoginError("");
    setCheckingUser(true);
    try {
      const response = await axios.get(
        `${LOGIN_USER_ACCOUNT_CHECK_API}userName=${encodeURIComponent(
          username.trim()
        )}&appName=MOI`
      );
      const data = response.data as {
        result?: boolean;
        data?: AccountCheckRow[];
      };

      if (data.result && data.data && data.data.length > 0) {
        const uniqueTypes = [...new Set(data.data.map((item) => item.userType))];
        const options: UserTypeOption[] = uniqueTypes.map((ut) => {
          const row = data.data!.find((item) => item.userType === ut)!;
          return {
            userType: row.userType,
            userTypeDescription: row.userTypeDescription,
          };
        });

        if (options.length === 1) {
          setUserType(options[0].userType);
          setUserTypeDescription(options[0].userTypeDescription);
          setUserTypes([]);
        } else {
          setUserTypes(options);
          setUserType(options[0].userType);
          setUserTypeDescription(options[0].userTypeDescription);
        }
      } else {
        setLoginError(t("no_user_found"));
        setUserTypes([]);
      }
    } catch {
      setLoginError(t("an_error_occurred"));
      setUserTypes([]);
    } finally {
      setCheckingUser(false);
    }
  };

  const userLogin = async () => {
    setLoginError("");
    const validationError = validateLoginInput(username, password);
    if (validationError) {
      setLoginError(validationError);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        username: username.trim(),
        password,
        userType,
        userTypeDescription,
      };
      const response = await axios.post(LOGIN_API, payload);
      const data = response.data as {
        result?: boolean;
        data?: AuthUser;
        message?: string;
      };

      if (data.result && data.data?.token) {
        const decoded = jwtDecode<{ exp?: number }>(data.data.token);
        const now = Date.now() / 1000;
        if (decoded.exp != null && decoded.exp > now) {
          await signIn(data.data);
        } else {
          setLoginError(
            t("session_expired", {
              defaultValue: "Session expired. Please try again.",
            })
          );
        }
      } else {
        setLoginError(data.message ?? t("mobile_login_failed", { defaultValue: "Login failed." }));
      }
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      setLoginError(err.response?.data?.message ?? t("an_error_occurred"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerCard}>
          <Image
            source={require("../../assets/brand-logo.png")}
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel={APP_DISPLAY_NAME}
          />
          <Text variant="headlineMedium" style={styles.title}>
            {APP_DISPLAY_NAME}
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            {t("mobile_login_subtitle", {
              defaultValue: "Sign in with your mobile number",
            })}
          </Text>
        </View>

        {loginError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{loginError}</Text>
          </View>
        ) : null}

        <TextInput
          label={t("mobile_number")}
          mode="outlined"
          value={username}
          onChangeText={setUsername}
          onEndEditing={handleUsernameBlur}
          placeholder={t("enter_mobile_number")}
          keyboardType="phone-pad"
          autoCapitalize="none"
          disabled={loading}
          style={styles.field}
        />
        {checkingUser ? <ActivityIndicator style={styles.inlineSpinner} /> : null}

        <TextInput
          label={t("password")}
          mode="outlined"
          value={password}
          onChangeText={setPassword}
          placeholder={t("enter_password")}
          secureTextEntry={!showPassword}
          disabled={loading}
          right={
            <TextInput.Icon
              icon={showPassword ? "eye-off" : "eye"}
              onPress={() => setShowPassword((s) => !s)}
            />
          }
          style={styles.field}
        />

        {userTypes.length > 1 ? (
          <>
            <Text variant="labelLarge" style={styles.label}>
              {t("userType")}
            </Text>
            <View style={styles.pickerWrap}>
              <Picker
                selectedValue={userType}
                onValueChange={(value) => {
                  const opt = userTypes.find((o) => o.userType === value);
                  if (opt) {
                    setUserType(opt.userType);
                    setUserTypeDescription(opt.userTypeDescription);
                  }
                }}
              >
                {userTypes.map((type) => (
                  <Picker.Item
                    key={type.userType}
                    label={type.userTypeDescription}
                    value={type.userType}
                  />
                ))}
              </Picker>
            </View>
          </>
        ) : null}

        <Button
          mode="contained"
          onPress={() => void userLogin()}
          loading={loading}
          disabled={loading}
          style={styles.button}
          contentStyle={styles.buttonContent}
        >
          {t("sign_in")}
        </Button>

        <View style={styles.links}>
          <Button mode="text" onPress={() => navigation.navigate("SignUp")} compact>
            {t("sign_up")}
          </Button>
          <Button mode="text" onPress={() => {}} compact disabled>
            {t("forgot_password")}
          </Button>
        </View>
        <Text variant="bodySmall" style={styles.forgotHint}>
          {t("mobile_forgot_hint", {
            defaultValue: "Forgot password: contact support or use the web portal.",
          })}
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: 20, paddingTop: 48, paddingBottom: 32 },
  headerCard: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  logo: { width: 52, height: 56, marginBottom: 12 },
  title: { fontWeight: "800", color: colors.text, textAlign: "center" },
  subtitle: { marginTop: 8, color: colors.textMuted, textAlign: "center" },
  label: { marginTop: 8, color: colors.textMuted },
  field: { marginBottom: 8, backgroundColor: colors.surface },
  pickerWrap: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: colors.surface,
    marginBottom: 8,
  },
  button: { marginTop: 16, borderRadius: 12 },
  buttonContent: { paddingVertical: 6 },
  links: {
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  forgotHint: { textAlign: "center", color: colors.textMuted, marginTop: 4 },
  errorBox: {
    backgroundColor: "rgba(255, 71, 87, 0.1)",
    borderColor: "rgba(255, 71, 87, 0.25)",
    borderWidth: 1,
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  errorText: { color: "#ff4757" },
  inlineSpinner: { marginBottom: 8 },
});
