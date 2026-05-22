import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { useTranslation } from "react-i18next";
import { LOGIN_API, LOGIN_USER_ACCOUNT_CHECK_API } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import type { AuthUser } from "../types/auth";

type UserTypeOption = { userType: string; userTypeDescription: string };

type AccountCheckRow = {
  userType: string;
  userTypeDescription: string;
};

export default function LoginScreen() {
  const { t } = useTranslation();
  const { signIn } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [userType, setUserType] = useState("AU");
  const [userTypeDescription, setUserTypeDescription] = useState("");
  const [userTypes, setUserTypes] = useState<UserTypeOption[]>([]);
  const [loginError, setLoginError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingUser, setCheckingUser] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const webOrigin = process.env.EXPO_PUBLIC_WEB_APP_URL?.replace(/\/$/, "");

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

  const openWeb = (path: string) => {
    if (!webOrigin) {
      Alert.alert(
        t("mobile_web_title", { defaultValue: "Website" }),
        t("mobile_web_env_hint", {
          defaultValue:
            "Set EXPO_PUBLIC_WEB_APP_URL in .env to open sign-up and password recovery in the browser.",
        })
      );
      return;
    }
    Linking.openURL(`${webOrigin}${path}`);
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
        <View style={styles.header}>
          <Image
            source={require("../../assets/brand-logo.png")}
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel={t("my_accounts")}
          />
          <Text style={styles.title}>{t("my_accounts")}</Text>
          <Text style={styles.subtitle}>
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

        <Text style={styles.label}>{t("mobile_number")}</Text>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          onEndEditing={handleUsernameBlur}
          placeholder={t("enter_mobile_number")}
          keyboardType="phone-pad"
          autoCapitalize="none"
          editable={!loading}
        />
        {checkingUser ? (
          <ActivityIndicator style={styles.inlineSpinner} />
        ) : null}

        <Text style={styles.label}>{t("password")}</Text>
        <View style={styles.passwordRow}>
          <TextInput
            style={[styles.input, styles.passwordInput]}
            value={password}
            onChangeText={setPassword}
            placeholder={t("enter_password")}
            secureTextEntry={!showPassword}
            editable={!loading}
          />
          <Pressable
            onPress={() => setShowPassword((s) => !s)}
            style={styles.togglePwd}
            hitSlop={8}
          >
            <Text style={styles.togglePwdText}>
              {showPassword
                ? t("mobile_hide", { defaultValue: "Hide" })
                : t("mobile_show", { defaultValue: "Show" })}
            </Text>
          </Pressable>
        </View>

        {userTypes.length > 1 ? (
          <>
            <Text style={styles.label}>{t("userType")}</Text>
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

        <Pressable
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={userLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{t("sign_in")}</Text>
          )}
        </Pressable>

        <View style={styles.links}>
          <Pressable onPress={() => openWeb("/forgot-password")}>
            <Text style={styles.link}>{t("forgot_password")}</Text>
          </Pressable>
          <Pressable onPress={() => openWeb("/purchase")}>
            <Text style={styles.link}>{t("sign_up")}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#f8f9fa" },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 32,
  },
  header: { marginBottom: 28, alignItems: "center" },
  logo: { width: 44, height: 48, marginBottom: 12 },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#2d3436",
    textAlign: "center",
  },
  subtitle: {
    marginTop: 8,
    fontSize: 16,
    color: "#636e72",
    textAlign: "center",
  },
  label: {
    marginTop: 16,
    marginBottom: 8,
    fontSize: 14,
    fontWeight: "600",
    color: "#636e72",
  },
  input: {
    borderWidth: 2,
    borderColor: "#e0e0e0",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  passwordRow: { position: "relative" },
  passwordInput: { paddingRight: 64 },
  togglePwd: {
    position: "absolute",
    right: 12,
    top: 14,
  },
  togglePwdText: { color: "#0984e3", fontWeight: "600" },
  pickerWrap: {
    borderWidth: 2,
    borderColor: "#e0e0e0",
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#fff",
  },
  button: {
    marginTop: 28,
    backgroundColor: "#0984e3",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: "#fff", fontSize: 17, fontWeight: "600" },
  links: {
    marginTop: 24,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  link: { color: "#0984e3", fontSize: 15, fontWeight: "500" },
  errorBox: {
    backgroundColor: "rgba(255, 71, 87, 0.1)",
    borderColor: "rgba(255, 71, 87, 0.25)",
    borderWidth: 1,
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  errorText: { color: "#ff4757" },
  inlineSpinner: { marginTop: 8 },
});
