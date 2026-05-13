import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { LOGIN_API, LOGIN_USER_ACCOUNT_CHECK_API } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";

type UserTypeOption = { userType: string; userTypeDescription: string };

type AccountCheckRow = {
  userType: string;
  userTypeDescription: string;
};

function validateLoginInput(username: string, password: string): string | null {
  if (!/^\d+$/.test(username.trim())) {
    return "Please enter a valid mobile number.";
  }
  if (password.length < 6 || password.length > 16) {
    return "Password must be between 6 and 16 characters.";
  }
  return null;
}

export default function LoginScreen() {
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
        setLoginError("No user found for this mobile number.");
        setUserTypes([]);
      }
    } catch {
      setLoginError("Something went wrong while checking the account.");
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
        data?: import("../types/auth").AuthUser;
        message?: string;
      };

      if (data.result && data.data?.token) {
        const decoded = jwtDecode<{ exp?: number }>(data.data.token);
        const now = Date.now() / 1000;
        if (decoded.exp != null && decoded.exp > now) {
          await signIn(data.data);
        } else {
          setLoginError("Session expired. Please try again.");
        }
      } else {
        setLoginError(data.message ?? "Login failed.");
      }
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      setLoginError(
        err.response?.data?.message ?? "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const openWeb = (path: string) => {
    if (!webOrigin) {
      Alert.alert(
        "Website",
        "Set EXPO_PUBLIC_WEB_APP_URL in .env to open sign-up and password recovery in the browser."
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
          <Text style={styles.title}>Accounts</Text>
          <Text style={styles.subtitle}>Sign in with your mobile number</Text>
        </View>

        {loginError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{loginError}</Text>
          </View>
        ) : null}

        <Text style={styles.label}>Mobile number</Text>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          onEndEditing={handleUsernameBlur}
          placeholder="Mobile number"
          keyboardType="phone-pad"
          autoCapitalize="none"
          editable={!loading}
        />
        {checkingUser ? (
          <ActivityIndicator style={styles.inlineSpinner} />
        ) : null}

        <Text style={styles.label}>Password</Text>
        <View style={styles.passwordRow}>
          <TextInput
            style={[styles.input, styles.passwordInput]}
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            secureTextEntry={!showPassword}
            editable={!loading}
          />
          <Pressable
            onPress={() => setShowPassword((s) => !s)}
            style={styles.togglePwd}
            hitSlop={8}
          >
            <Text style={styles.togglePwdText}>{showPassword ? "Hide" : "Show"}</Text>
          </Pressable>
        </View>

        {userTypes.length > 1 ? (
          <>
            <Text style={styles.label}>Account type</Text>
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
            <Text style={styles.buttonText}>Sign in</Text>
          )}
        </Pressable>

        <View style={styles.links}>
          <Pressable onPress={() => openWeb("/forgot-password")}>
            <Text style={styles.link}>Forgot password</Text>
          </Pressable>
          <Pressable onPress={() => openWeb("/purchase")}>
            <Text style={styles.link}>Sign up</Text>
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
  header: { marginBottom: 28 },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#2d3436",
  },
  subtitle: {
    marginTop: 8,
    fontSize: 16,
    color: "#636e72",
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
