import React, { useEffect, useMemo, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { Text, TextInput } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LOGIN_API, LOGIN_USER_ACCOUNT_CHECK_API } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import { useSchoolAuth } from "../context/SchoolAuthContext";
import { schoolError, schoolForgotPassword, schoolLogin, type SchoolSession } from "../api/school";
import { useAppTheme } from "../hooks/useAppTheme";
import { useKeyboardAwareScroll } from "../hooks/useKeyboardAwareScroll";
import type { AuthUser } from "../types/auth";
import type { AuthStackParamList } from "./RegistrationScreen";
import { APP_DISPLAY_NAME } from "../theme/themes";
import Sheet from "../components/ui/Sheet";
import { AuthCard, AuthHero, Notice, PillButton, Rise } from "../components/ui/AuthUi";
import { SuccessBurst } from "../components/ui/Motion";

// Each product has its own sign-up (same choices as the website).
const SCHOOL_SIGN_UP = "https://myschool-d5f9fueuajgvdkaj.westus3-01.azurewebsites.net/register-school";
const SIGN_UPS = [
  { id: "moitech", title: "DigiMoi", text: "Record moi (gifts) at your function. 7 days free.", icon: "hand-heart-outline", color: "#6366f1" },
  { id: "mahal", title: "Mahal Management", text: "For hall owners: take bookings online. 1 month free.", icon: "office-building-outline", color: "#f59e0b" },
  { id: "school", title: "School Website & ERP", text: "Register your school on the school site. 1 month free.", icon: "school-outline", color: "#10b981" },
] as const;

const LOGIN_TAB_KEY = "loginTab";
const SCHOOL_GREEN = "#059669";

type UserTypeOption = { userType: string; userTypeDescription: string };

type AccountCheckRow = {
  userType: string;
  userTypeDescription: string;
};


export default function LoginScreen() {
  const { t } = useTranslation();
  const { signIn, sessionEnded, clearSessionEnded } = useAuth();
  const { theme } = useAppTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(c), [c]);
  const {
    scrollRef,
    scrollPaddingBottom,
    setFieldAnchorRef,
    onFieldFocus,
    onScrollOffset,
  } = useKeyboardAwareScroll({ bottomInset: insets.bottom });

  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const [chooseSignUp, setChooseSignUp] = useState(false);
  const startSignUp = (id: (typeof SIGN_UPS)[number]["id"]) => {
    setChooseSignUp(false);
    if (id === "school") void Linking.openURL(SCHOOL_SIGN_UP);
    else navigation.navigate("SignUp", { kind: id });
  };
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [userType, setUserType] = useState("AU");
  const [userTypeDescription, setUserTypeDescription] = useState("");
  const [userTypes, setUserTypes] = useState<UserTypeOption[]>([]);
  const [loginError, setLoginError] = useState("");
  // The API says "Invalid User" for a wrong mobile number or password.
  const friendly = (message?: string | null) =>
    message && /^invalid user$/i.test(message.trim())
      ? t("wrong_mobile_or_password", { defaultValue: "Wrong mobile number or password. Please check and try again." })
      : message ?? undefined;
  const [loading, setLoading] = useState(false);
  const [checkingUser, setCheckingUser] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  /** Logins that worked: MySuccess (DigiMoi / Mahal) and/or School. Opened after the welcome animation. */
  const [welcome, setWelcome] = useState<{ ms?: AuthUser; sc?: SchoolSession } | null>(null);
  /** The mobile number last checked for a DigiMoi / Mahal account. */
  const checkedFor = useRef("");
  /** The welcome animation opens the account once, even if it reports "done" twice. */
  const opened = useRef(false);
  const { schoolSignIn, setActiveApp } = useSchoolAuth();
  /** false when the MySuccess check found no account for this mobile number (it may still be a school login). */
  const [msKnown, setMsKnown] = useState<boolean | null>(null);
  const isMobile = (u: string) => /^\d+$/.test(u.trim());

  /** Which login: DigiMoi / Mahal (mobile number) or School (username or parent mobile). Remembered on the phone. */
  const [tab, setTab] = useState<"mysuccess" | "school">("mysuccess");
  useEffect(() => {
    void AsyncStorage.getItem(LOGIN_TAB_KEY).then((v) => {
      if (v === "school" || v === "mysuccess") setTab(v);
    });
  }, []);
  const pickTab = (next: "mysuccess" | "school") => {
    if (next === tab) return;
    setTab(next);
    setLoginError("");
    setUserTypes([]);
    setMsKnown(null);
    checkedFor.current = "";
    void AsyncStorage.setItem(LOGIN_TAB_KEY, next);
  };
  const isSchool = tab === "school";
  const tint = isSchool ? SCHOOL_GREEN : c.primary;
  /** School usernames: phone keyboards add spaces after "." and capitals; take them out. */
  const cleanSchoolUser = (u: string) => u.replace(/\s+/g, "").toLowerCase();

  // ---- School "Forgot password" (email link from the school server)
  const [schoolForgot, setSchoolForgot] = useState(false);
  const [forgotUser, setForgotUser] = useState("");
  const [forgotBusy, setForgotBusy] = useState(false);
  const [forgotMsg, setForgotMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const sendSchoolReset = async () => {
    setForgotBusy(true);
    setForgotMsg(null);
    try {
      setForgotMsg({ ok: true, text: await schoolForgotPassword(cleanSchoolUser(forgotUser)) });
    } catch (e) {
      setForgotMsg({ ok: false, text: schoolError(e, t("an_error_occurred")) });
    } finally {
      setForgotBusy(false);
    }
  };

  const validateLoginInput = (u: string, p: string): string | null => {
    if (isSchool) {
      const name = cleanSchoolUser(u);
      if (!isMobile(name) && !/^[a-z0-9][a-z0-9._-]{2,59}$/.test(name)) {
        return t("school_invalid_username", { defaultValue: "Enter your school username (e.g. myschool.admin) or, for parents, your mobile number." });
      }
    } else if (!isMobile(u)) {
      return t("mobile_invalid_mobile", { defaultValue: "Please enter a valid mobile number." });
    }
    if (p.length < 6 || p.length > 64) {
      return t("mobile_invalid_password", {
        defaultValue: "Password must be between 6 and 64 characters.",
      });
    }
    return null;
  };

  const handleUsernameBlur = async () => {
    if (!username.trim()) return;
    if (isSchool || !isMobile(username)) return; // School tab: no MySuccess account check
    // Same number as last time: nothing to check again (re-checking made the screen flicker).
    const key = username.trim();
    if (checkedFor.current === key) return;
    checkedFor.current = key;
    setMsKnown(null);
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

        setMsKnown(true);
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
        setMsKnown(false);
        setUserTypes([]);
        setLoginError(t("no_user_found_try_school", { defaultValue: "No DigiMoi / Mahal account for this number. School parent? Use the School tab." }));
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
      if (isSchool) {
        // School ERP: staff username or parent mobile number.
        try {
          const session = await schoolLogin(cleanSchoolUser(username), password);
          await setActiveApp("school");
          setWelcome({ sc: session });
        } catch (e) {
          setLoginError(schoolError(e, t("wrong_username_or_password", { defaultValue: "Wrong username or password. Please check and try again." })));
        }
        return;
      }
      // DigiMoi / Mahal (MySuccess API), as before.
      const response = await axios.post(LOGIN_API, { username: username.trim(), password, userType, userTypeDescription });
      const data = response.data as { result?: boolean; data?: AuthUser; message?: string };
      if (data.result && data.data?.token) {
        const decoded = jwtDecode<{ exp?: number }>(data.data.token);
        if (decoded.exp == null || decoded.exp > Date.now() / 1000) {
          await setActiveApp("mysuccess");
          setWelcome({ ms: data.data });
        } else {
          setLoginError(t("session_expired", { defaultValue: "Session expired. Please try again." }));
        }
      } else {
        setLoginError(friendly(data.message) ?? t("mobile_login_failed", { defaultValue: "Login failed." }));
      }
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      setLoginError(friendly(err.response?.data?.message) ?? t("an_error_occurred"));
    } finally {
      setLoading(false);
    }
  };

  const keyboardVerticalOffset = Platform.OS === "ios" ? insets.top : 0;
  const clearNotes = () => {
    if (loginError) setLoginError("");
    if (sessionEnded) clearSessionEnded();
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={styles.flex}>
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={[styles.scroll, { paddingBottom: scrollPaddingBottom }]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
            automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
            onScroll={(e) => onScrollOffset(e.nativeEvent.contentOffset.y)}
            scrollEventThrottle={16}
          >
            <AuthHero
              paddingTop={insets.top}
              art="success"
              title={APP_DISPLAY_NAME}
              subtitle={
                isSchool
                  ? t("school_login_tagline", { defaultValue: "School ERP & Parent Portal — attendance, fees, homework" })
                  : t("mobile_login_marriage_tagline", { defaultValue: "Marriage & event accounts — receipts, expenses & gifts" })
              }
            />

            <AuthCard>
              <View style={[styles.tabs, { backgroundColor: c.chipBg }]} accessibilityRole="tablist">
                {([
                  { id: "mysuccess", label: "DigiMoi / Mahal", icon: "hand-heart-outline" },
                  { id: "school", label: "School", icon: "school-outline" },
                ] as const).map((o) => {
                  const on = tab === o.id;
                  const color = o.id === "school" ? SCHOOL_GREEN : c.primary;
                  return (
                    <Pressable
                      key={o.id}
                      onPress={() => pickTab(o.id)}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: on }}
                      style={[styles.tab, on && { backgroundColor: c.surface, shadowColor: color, elevation: 2 }]}
                    >
                      <MaterialCommunityIcons name={o.icon} size={18} color={on ? color : c.textMuted} />
                      <Text style={{ color: on ? color : c.textMuted, fontWeight: "800" }}>{o.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={styles.cardTitle}>{t("welcome_back", { defaultValue: "Welcome Back" })}</Text>
              <Text style={styles.cardSub}>
                {isSchool
                  ? t("school_login_subtitle", { defaultValue: "Staff: your username (e.g. myschool.admin) · Parents: your mobile number" })
                  : t("mobile_login_subtitle", { defaultValue: "Sign in with your mobile number" })}
              </Text>

              {sessionEnded && !loginError ? (
                <Notice kind="info" text={t("session_ended_sign_in", { defaultValue: "Your session has ended. Please sign in again." })} />
              ) : null}
              {loginError ? <Notice kind="error" text={loginError} /> : null}

              <View ref={setFieldAnchorRef("username")}>
                <TextInput
                  label={isSchool ? t("school_username", { defaultValue: "Username or parent mobile number" }) : t("mobile_number")}
                  mode="outlined"
                  value={username}
                  onChangeText={(v) => { setUsername(v); clearNotes(); }}
                  onEndEditing={handleUsernameBlur}
                  onFocus={() => onFieldFocus("username")}
                  placeholder={isSchool ? "myschool.admin" : t("enter_mobile_number")}
                  keyboardType={isSchool ? "email-address" : "phone-pad"}
                  autoCorrect={false}
                  autoComplete={isSchool ? "username" : "tel"}
                  autoCapitalize="none"
                  disabled={loading}
                  style={styles.field}
                  outlineStyle={styles.outline}
                  outlineColor={c.border}
                  activeOutlineColor={tint}
                  textColor={c.text}
                  left={<TextInput.Icon icon={isSchool ? "account-circle-outline" : "cellphone"} color={(f) => (f ? tint : c.textMuted)} />}
                  // Always the same slot (spinner or nothing), so the box keeps its size while the number is checked.
                  right={<TextInput.Icon icon={() => (checkingUser ? <ActivityIndicator size="small" color={c.primary} /> : <View style={{ width: 20 }} />)} disabled />}
                  returnKeyType="next"
                />
              </View>

              <View ref={setFieldAnchorRef("password")}>
                <TextInput
                  label={t("password")}
                  mode="outlined"
                  value={password}
                  onChangeText={(v) => { setPassword(v); clearNotes(); }}
                  onFocus={() => onFieldFocus("password")}
                  placeholder={t("enter_password")}
                  secureTextEntry={!showPassword}
                  disabled={loading}
                  style={styles.field}
                  outlineStyle={styles.outline}
                  outlineColor={c.border}
                  activeOutlineColor={c.primary}
                  textColor={c.text}
                  left={<TextInput.Icon icon="lock-outline" color={(f) => (f ? c.primary : c.textMuted)} />}
                  right={
                    <TextInput.Icon
                      icon={showPassword ? "eye-off" : "eye"}
                      onPress={() => setShowPassword((s) => !s)}
                      forceTextInputFocus={false}
                    />
                  }
                  returnKeyType="done"
                  onSubmitEditing={() => void userLogin()}
                />
              </View>

              {!isSchool && userTypes.length > 1 ? (
                <Rise>
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
                        <Picker.Item key={type.userType} label={type.userTypeDescription} value={type.userType} />
                      ))}
                    </Picker>
                  </View>
                </Rise>
              ) : null}

              <Pressable
                onPress={() => {
                  if (isSchool) {
                    setForgotUser(cleanSchoolUser(username));
                    setForgotMsg(null);
                    setSchoolForgot(true);
                  } else navigation.navigate("ForgotPassword");
                }}
                style={styles.forgot}
                accessibilityRole="link"
                hitSlop={8}
              >
                <Text style={[styles.forgotText, { color: tint }]}>{t("forgot_password")}</Text>
              </Pressable>

              <PillButton label={t("sign_in")} icon="login" onPress={() => void userLogin()} loading={loading} disabled={loading} color={tint} />

              <View style={styles.orRow}>
                <View style={styles.orLine} />
                <Text style={styles.orText}>{t("new_here", { defaultValue: "New here?" })}</Text>
                <View style={styles.orLine} />
              </View>

              <PillButton
                label={t("create_account", { defaultValue: "Create an account" })}
                icon="account-plus-outline"
                variant="outline"
                onPress={() => setChooseSignUp(true)}
              />
            </AuthCard>

            <Rise delay={520} style={styles.footer}>
              <MaterialCommunityIcons name="shield-check-outline" size={14} color={c.textMuted} />
              <Text style={styles.footerText}>MySuccess Tech · {t("secure_sign_in", { defaultValue: "Secure sign in" })}</Text>
            </Rise>
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>
      {welcome ? (
        <SuccessBurst
          title={t("signed_in_welcome", { defaultValue: "Welcome, {{name}}!", name: welcome.ms?.name ?? welcome.sc?.user.name ?? "" }).replace(/,\s*!$/, "!")}
          subtitle={t("signing_you_in", { defaultValue: "Opening your account…" })}
          onDone={() => {
            if (opened.current) return;
            opened.current = true;
            // Both open the app at once and save the sign-in in the background (no wait after "Welcome").
            if (welcome.sc) void schoolSignIn(welcome.sc);
            if (welcome.ms) void signIn(welcome.ms);
          }}
        />
      ) : null}
      <Sheet visible={schoolForgot} title={t("forgot_password")} onClose={() => setSchoolForgot(false)}>
        <Text style={{ color: c.textMuted, marginBottom: 12 }}>
          {t("school_forgot_help", { defaultValue: "Staff: enter your username. We email a link to set a new password. Parents: please ask the school office; it resets your password to your mobile number." })}
        </Text>
        {forgotMsg ? <Notice kind={forgotMsg.ok ? "success" : "error"} text={forgotMsg.text} /> : null}
        <TextInput
          label={t("school_username_only", { defaultValue: "Username" })}
          mode="outlined"
          value={forgotUser}
          onChangeText={setForgotUser}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          style={[styles.field, { marginBottom: 12 }]}
          activeOutlineColor={SCHOOL_GREEN}
        />
        <PillButton
          label={t("send_reset_link", { defaultValue: "Email me a reset link" })}
          icon="email-fast-outline"
          color={SCHOOL_GREEN}
          onPress={() => void sendSchoolReset()}
          loading={forgotBusy}
          disabled={forgotBusy || cleanSchoolUser(forgotUser).length < 3}
        />
      </Sheet>
      <Sheet visible={chooseSignUp} title={t("sign_up_for", { defaultValue: "Sign up for" })} onClose={() => setChooseSignUp(false)}>
        {SIGN_UPS.map((s, i) => (
          <Rise key={s.id} delay={i * 90}>
            <Pressable
              onPress={() => startSignUp(s.id)}
              accessibilityRole="button"
              style={({ pressed }) => [styles.choice, { borderColor: c.border, opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
            >
              <View style={[styles.choiceIcon, { backgroundColor: s.color }]}>
                <MaterialCommunityIcons name={s.icon} size={24} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: c.text, fontWeight: "800", fontSize: 15 }}>{s.title}</Text>
                <Text style={{ color: c.textMuted, fontSize: 13, marginTop: 2 }}>{s.text}</Text>
              </View>
              <View style={[styles.choiceGo, { backgroundColor: `${s.color}1f` }]}>
                <MaterialCommunityIcons name={s.id === "school" ? "open-in-new" : "arrow-right"} size={18} color={s.color} />
              </View>
            </Pressable>
          </Rise>
        ))}
      </Sheet>
    </KeyboardAvoidingView>
  );
}

function makeStyles(c: ReturnType<typeof useAppTheme>["theme"]["colors"]) {
  return StyleSheet.create({
    tabs: { flexDirection: "row", borderRadius: 14, padding: 4, marginBottom: 16, gap: 4 },
    tab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 11, shadowOpacity: 0.15, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
    flex: { flex: 1, backgroundColor: c.background },
    scroll: { flexGrow: 1 },
    cardTitle: { fontSize: 22, fontWeight: "900", color: c.text },
    cardSub: { color: c.textMuted, marginTop: 2, marginBottom: 16 },
    label: { marginTop: 4, marginBottom: 4, color: c.textMuted },
    field: { marginBottom: 12, backgroundColor: c.inputBg },
    outline: { borderRadius: 14 },
    pickerWrap: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 14,
      overflow: "hidden",
      backgroundColor: c.inputBg,
      marginBottom: 8,
    },
    forgot: { alignSelf: "flex-end", marginBottom: 16, marginTop: -2 },
    forgotText: { color: c.primary, fontWeight: "700" },
    orRow: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 18 },
    orLine: { flex: 1, height: 1, backgroundColor: c.border },
    orText: { color: c.textMuted, fontSize: 13, fontWeight: "600" },
    footer: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 22, marginBottom: 12 },
    footerText: { color: c.textMuted, fontSize: 12 },
    choice: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 18, borderWidth: 1, marginBottom: 12, backgroundColor: c.card },
    choiceIcon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
    choiceGo: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  });
}
