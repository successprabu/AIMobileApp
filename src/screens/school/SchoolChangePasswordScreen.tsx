import React, { useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { Text, TextInput } from "react-native-paper";
import { schoolChangePassword, schoolError } from "../../api/school";
import { useSchoolAuth } from "../../context/SchoolAuthContext";
import { useAppTheme } from "../../hooks/useAppTheme";
import { Notice, PillButton } from "../../components/ui/AuthUi";

/** Change the School login's password. First sign-ins (parents: password = mobile number) must do this. */
export default function SchoolChangePasswordScreen({ onDone }: { onDone?: () => void }) {
  const { school, updateSchool } = useSchoolAuth();
  const { theme } = useAppTheme();
  const c = theme.colors;
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);
  const first = !!school?.user.mustChangePassword;

  const save = async () => {
    setError("");
    if (next.length < 8 || !/[A-Za-z]/.test(next) || !/\d/.test(next)) return setError("New password: at least 8 characters, with a letter and a number.");
    if (next !== again) return setError("The two new passwords are not the same.");
    setBusy(true);
    try {
      await schoolChangePassword(current, next);
      await updateSchool({ user: { ...school!.user, mustChangePassword: false } });
      setOk(true);
      setCurrent("");
      setNext("");
      setAgain("");
      onDone?.();
    } catch (e) {
      setError(schoolError(e, "Could not change the password."));
    } finally {
      setBusy(false);
    }
  };

  const field = (label: string, value: string, set: (v: string) => void) => (
    <TextInput
      label={label}
      mode="outlined"
      value={value}
      onChangeText={set}
      secureTextEntry={!show}
      autoCapitalize="none"
      style={styles.field}
      right={<TextInput.Icon icon={show ? "eye-off" : "eye"} onPress={() => setShow(!show)} />}
    />
  );

  return (
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
      <Text style={[styles.h1, { color: c.text }]}>{first ? "Set your own password" : "Change password"}</Text>
      {first ? (
        <Notice kind="info" text={school?.user.role === "parent" ? "Your first password is your mobile number. Please choose a new one to continue." : "Please choose your own password to continue."} />
      ) : null}
      {ok ? <Notice kind="success" text="Password changed." /> : null}
      {error ? <Notice kind="error" text={error} /> : null}
      {field("Current password", current, setCurrent)}
      {field("New password", next, setNext)}
      {field("New password again", again, setAgain)}
      <PillButton label="Save password" icon="content-save-outline" onPress={() => void save()} loading={busy} disabled={!current || !next || !again} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 20, gap: 12 },
  h1: { fontSize: 22, fontWeight: "800" },
  field: { backgroundColor: "transparent" },
});
