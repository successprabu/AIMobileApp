import React, { useMemo, useState } from "react";
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
import { MaterialCommunityIcons } from "@expo/vector-icons";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LOGIN_API, LOGIN_USER_ACCOUNT_CHECK_API } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import { useAppTheme } from "../hooks/useAppTheme";
import type { AuthUser } from "../types/auth";
import type { AuthStackParamList } from "./RegistrationScreen";
import { APP_DISPLAY_NAME } from "../theme/themes";

type UserTypeOption = { userType: string; userTypeDescription: string };

type AccountCheckRow = {
  userType: string;
  userTypeDescription: string;
};

const DECOR_ICONS: (keyof typeof MaterialCommunityIcons.glyphMap)[] = [
  "ring",
  "heart",
  "flower",
  "party-popper",
  "camera",
  "silverware-fork-knife",
];

export default function LoginScreen() {
  const { t } = useTranslation();
  const { signIn } = useAuth();
  const { theme } = useAppTheme();
  const c = theme.colors;
  const styles = useMemo(() => makeStyles(c), [c]);

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
      <View style={styles.topBand} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.decorRow}>
          {DECOR_ICONS.map((icon) => (
            <View key={icon} style={styles.decorChip}>
              <MaterialCommunityIcons name={icon} size={18} color={c.marriageAccent} />
            </View>
          ))}
        </View>

        <View style={styles.headerCard}>
          <View style={styles.logoRing}>
            <Image
              source={require("../../assets/brand-logo.png")}
              style={styles.logo}
              resizeMode="contain"
              accessibilityLabel={APP_DISPLAY_NAME}
            />
          </View>
          <Text variant="headlineMedium" style={styles.title}>
            {APP_DISPLAY_NAME}
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            {t("mobile_login_marriage_tagline", {
              defaultValue: "Marriage & event accounts — receipts, expenses & gifts",
            })}
          </Text>
          <View style={styles.taglineRow}>
            <MaterialCommunityIcons name="calendar-heart" size={16} color={c.marriageAccent} />
            <Text style={styles.taglineText}>
              {t("mobile_login_subtitle", {
                defaultValue: "Sign in with your mobile number",
              })}
            </Text>
          </View>
        </View>

        {loginError ? (
          <View style={styles.errorBox}>
            <MaterialCommunityIcons name="alert-circle-outline" size={18} color={c.danger} />
            <Text style={styles.errorText}>{loginError}</Text>
          </View>
        ) : null}

        <View style={styles.formCard}>
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
            outlineColor={c.border}
            activeOutlineColor={c.primary}
            left={<TextInput.Icon icon="cellphone" />}
          />
          {checkingUser ? <ActivityIndicator style={styles.inlineSpinner} color={c.primary} /> : null}

          <TextInput
            label={t("password")}
            mode="outlined"
            value={password}
            onChangeText={setPassword}
            placeholder={t("enter_password")}
            secureTextEntry={!showPassword}
            disabled={loading}
            style={styles.field}
            outlineColor={c.border}
            activeOutlineColor={c.primary}
            left={<TextInput.Icon icon="lock-outline" />}
            right={
              <TextInput.Icon
                icon={showPassword ? "eye-off" : "eye"}
                onPress={() => setShowPassword((s) => !s)}
              />
            }
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
            buttonColor={c.marriageAccent}
          >
            {t("sign_in")}
          </Button>
        </View>

        <View style={styles.links}>
          <Button mode="text" textColor={c.primary} onPress={() => navigation.navigate("SignUp")} compact>
            {t("sign_up")}
          </Button>
          <Button mode="text" textColor={c.textMuted} onPress={() => {}} compact disabled>
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

function makeStyles(c: ReturnType<typeof useAppTheme>["theme"]["colors"]) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: c.background },
    topBand: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: 140,
      backgroundColor: c.marriageSoft,
      borderBottomLeftRadius: 32,
      borderBottomRightRadius: 32,
    },
    scroll: { paddingHorizontal: 20, paddingTop: 36, paddingBottom: 32 },
    decorRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
      gap: 8,
      marginBottom: 16,
    },
    decorChip: {
      backgroundColor: c.surface,
      borderRadius: 20,
      padding: 8,
      borderWidth: 1,
      borderColor: c.border,
    },
    headerCard: {
      alignItems: "center",
      backgroundColor: c.surface,
      borderRadius: 20,
      padding: 22,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: c.border,
      shadowColor: c.marriageAccent,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.12,
      shadowRadius: 14,
      elevation: 4,
    },
    logoRing: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: c.marriageSoft,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 12,
      borderWidth: 2,
      borderColor: c.marriageAccent,
    },
    logo: { width: 48, height: 52 },
    title: { fontWeight: "800", color: c.text, textAlign: "center" },
    subtitle: {
      marginTop: 8,
      color: c.textMuted,
      textAlign: "center",
      lineHeight: 20,
      paddingHorizontal: 8,
    },
    taglineRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: 12,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: c.marriageSoft,
    },
    taglineText: { color: c.marriageAccent, fontSize: 13, fontWeight: "600" },
    formCard: {
      backgroundColor: c.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: c.border,
      marginBottom: 8,
    },
    label: { marginTop: 4, color: c.textMuted },
    field: { marginBottom: 8, backgroundColor: c.inputBg },
    pickerWrap: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 12,
      overflow: "hidden",
      backgroundColor: c.inputBg,
      marginBottom: 8,
    },
    button: { marginTop: 12, borderRadius: 12 },
    buttonContent: { paddingVertical: 6 },
    links: {
      marginTop: 16,
      flexDirection: "row",
      justifyContent: "space-between",
    },
    forgotHint: { textAlign: "center", color: c.textMuted, marginTop: 4 },
    errorBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: `${c.danger}18`,
      borderColor: `${c.danger}40`,
      borderWidth: 1,
      padding: 12,
      borderRadius: 12,
      marginBottom: 12,
    },
    errorText: { color: c.danger, flex: 1 },
    inlineSpinner: { marginBottom: 8 },
  });
}
