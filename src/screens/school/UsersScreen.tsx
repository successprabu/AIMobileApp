import React, { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, StyleSheet, View } from "react-native";
import { ActivityIndicator, FAB, Switch, Text, TextInput } from "react-native-paper";
import { schoolError } from "../../api/school";
import { createUser, getSettings, resetParentPassword, updateUser, userList } from "../../api/schoolErp";
import { useSchoolAuth } from "../../context/SchoolAuthContext";
import { useAppTheme } from "../../hooks/useAppTheme";
import { Notice, PillButton } from "../../components/ui/AuthUi";
import Sheet from "../../components/ui/Sheet";
import type { AdminUser, UserRole } from "../../school/erp";
import { Chips, SCHOOL_GREEN, day, ui } from "./schoolUi";

type Tab = "Staff" | "Parents";
const LABEL: Record<string, string> = { superadmin: "Super admin", admin: "School admin", teacher: "Teaching staff", nonteaching: "Office staff", parent: "Parent" };

/** Staff & logins: add staff logins, switch them on/off, change role, reset passwords; parent logins. */
export default function UsersScreen() {
  const { school } = useSchoolAuth();
  const sid = school?.user.schoolId ?? "";
  const { theme } = useAppTheme();
  const c = theme.colors;
  const [tab, setTab] = useState<Tab>("Staff");
  const [staff, setStaff] = useState<AdminUser[]>([]);
  const [parents, setParents] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [designations, setDesignations] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [form, setForm] = useState<null | { username: string; name: string; role: UserRole; designation: string; phone: string; password: string }>(null);
  const [reset, setReset] = useState<{ u: AdminUser; pw: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, p, st] = await Promise.all([userList(false), userList(true), getSettings(sid).catch(() => null)]);
      setStaff(s.items);
      setRoles(s.assignableRoles.filter((r) => r !== "parent" && r !== "superadmin"));
      setParents(p.items);
      setDesignations(st?.settings.staffDesignations ?? []);
    } catch (e) {
      setNote({ kind: "error", text: schoolError(e, "Could not load logins.") });
    } finally {
      setLoading(false);
    }
  }, [sid]);
  useEffect(() => {
    void load();
  }, [load]);

  const replace = (x: AdminUser) => {
    setStaff((l) => l.map((y) => (y.id === x.id ? x : y)));
    setParents((l) => l.map((y) => (y.id === x.id ? x : y)));
  };
  const change = async (u: AdminUser, patch: Parameters<typeof updateUser>[1], ok: string) => {
    try {
      replace(await updateUser(u.id, patch));
      setNote({ kind: "success", text: ok });
    } catch (e) {
      setNote({ kind: "error", text: schoolError(e, "Could not update.") });
      void load();
    }
  };

  const create = async () => {
    if (!form) return;
    setBusy(true);
    try {
      const u = await createUser({ ...form, username: form.username.trim().toLowerCase().replace(/\s+/g, ""), schoolId: sid });
      setStaff((l) => [...l, u]);
      setForm(null);
      setNote({ kind: "success", text: `👤 Login ${u.username} created. They change the password at first login.` });
    } catch (e) {
      Alert.alert("Could not create", schoolError(e, "Please check the details."));
    } finally {
      setBusy(false);
    }
  };

  const saveReset = async () => {
    if (!reset) return;
    setBusy(true);
    await change(reset.u, { password: reset.pw }, `🔑 Password reset for ${reset.u.username}. They must change it at next login.`);
    setBusy(false);
    setReset(null);
  };

  if (loading) {
    return (
      <View style={[ui.center, { backgroundColor: c.background }]}>
        <ActivityIndicator color={SCHOOL_GREEN} />
      </View>
    );
  }

  const t = q.trim().toLowerCase();
  const list = (tab === "Staff" ? staff : parents).filter((u) => !t || u.name.toLowerCase().includes(t) || u.username.toLowerCase().includes(t) || (u.phone ?? "").includes(t));

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <FlatList
        data={list}
        keyExtractor={(u) => u.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 96 }}
        ListHeaderComponent={
          <View style={{ gap: 8, marginBottom: 8 }}>
            {note ? <Notice kind={note.kind} text={note.text} /> : null}
            <Chips<Tab> items={["Staff", "Parents"]} value={tab} onChange={setTab} label={(x) => `${x === "Staff" ? "👩‍🏫" : "👪"} ${x} (${x === "Staff" ? staff.length : parents.length})`} color={SCHOOL_GREEN} />
            <TextInput mode="outlined" dense placeholder="Search name, username, phone" value={q} onChangeText={setQ} left={<TextInput.Icon icon="magnify" />} activeOutlineColor={SCHOOL_GREEN} />
          </View>
        }
        renderItem={({ item: u }) => (
          <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border, opacity: u.active ? 1 : 0.6 }]}>
            <View style={styles.line}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: c.text, fontWeight: "700" }}>{u.name}</Text>
                <Text style={{ color: c.textMuted, fontSize: 12 }}>
                  {u.username} · {LABEL[u.role] ?? u.role}
                  {u.designation ? ` · ${u.designation}` : ""}
                  {u.mustChangePassword ? " · 🔑 temporary password" : ""}
                </Text>
                <Text style={{ color: c.textMuted, fontSize: 11 }}>Last login: {u.lastLoginAt ? day(u.lastLoginAt) : "never"}</Text>
              </View>
              {u.id !== school?.user.id ? <Switch value={u.active} color={SCHOOL_GREEN} onValueChange={(v) => void change(u, { active: v }, v ? `${u.name} can log in.` : `${u.name} can no longer log in.`)} /> : null}
            </View>
            {tab === "Staff" && u.id !== school?.user.id ? (
              <>
                <Chips items={roles} value={u.role} onChange={(r) => r !== u.role && void change(u, { role: r }, `${u.name} is now ${LABEL[r] ?? r}.`)} label={(r) => LABEL[r] ?? r} color={SCHOOL_GREEN} />
                <PillButton label="Reset password" icon="key-variant" variant="outline" color={SCHOOL_GREEN} onPress={() => setReset({ u, pw: "" })} style={{ marginTop: 6 }} />
              </>
            ) : tab === "Parents" ? (
              <PillButton
                label="Reset to mobile number"
                icon="key-variant"
                variant="outline"
                color={SCHOOL_GREEN}
                onPress={() =>
                  Alert.alert("Reset parent password?", `${u.username} will log in with the mobile number as password.`, [
                    { text: "Cancel", style: "cancel" },
                    { text: "Reset", onPress: () => void resetParentPassword(u.id).then(() => setNote({ kind: "success", text: `🔑 ${u.username} can log in with the mobile number.` })).catch((e) => setNote({ kind: "error", text: schoolError(e, "Could not reset.") })) },
                  ])
                }
                style={{ marginTop: 6 }}
              />
            ) : null}
          </View>
        )}
      />
      {tab === "Staff" && sid !== "*" ? (
        <FAB icon="account-plus" label="Add login" color="#fff" style={styles.fab} onPress={() => setForm({ username: `${sid}.`, name: "", role: roles.includes("teacher") ? "teacher" : roles[0], designation: "", phone: "", password: "" })} />
      ) : null}

      <Sheet visible={!!form} title="New staff login" onClose={() => setForm(null)}>
        {form ? (
          <>
            <TextInput mode="outlined" label="Name *" value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} activeOutlineColor={SCHOOL_GREEN} />
            <TextInput mode="outlined" label="Username *" value={form.username} onChangeText={(v) => setForm({ ...form, username: v })} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" style={styles.f} activeOutlineColor={SCHOOL_GREEN} />
            <Text style={[ui.label, { color: c.text }]}>Role</Text>
            <Chips items={roles} value={form.role} onChange={(r) => setForm({ ...form, role: r })} label={(r) => LABEL[r] ?? r} color={SCHOOL_GREEN} />
            {designations.length ? (
              <>
                <Text style={[ui.label, { color: c.text }]}>Designation</Text>
                <Chips items={designations} value={form.designation} onChange={(v) => setForm({ ...form, designation: v })} color={SCHOOL_GREEN} />
              </>
            ) : null}
            <TextInput mode="outlined" label="Mobile" value={form.phone} onChangeText={(v) => setForm({ ...form, phone: v })} keyboardType="phone-pad" style={styles.f} activeOutlineColor={SCHOOL_GREEN} />
            <TextInput mode="outlined" label="Temporary password *" value={form.password} onChangeText={(v) => setForm({ ...form, password: v })} secureTextEntry autoCapitalize="none" style={styles.f} activeOutlineColor={SCHOOL_GREEN} />
            <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 6 }}>Share it with the person privately; they must change it when they first log in.</Text>
            <PillButton label="Create login" icon="account-plus" color={SCHOOL_GREEN} onPress={() => void create()} loading={busy} disabled={busy || !form.name.trim() || form.username.length < 4 || form.password.length < 8} style={{ marginTop: 14 }} />
          </>
        ) : null}
      </Sheet>

      <Sheet visible={!!reset} title={`Reset ${reset?.u.username ?? ""}`} onClose={() => setReset(null)}>
        {reset ? (
          <>
            <TextInput mode="outlined" label="New temporary password" value={reset.pw} onChangeText={(v) => setReset({ ...reset, pw: v })} secureTextEntry autoCapitalize="none" activeOutlineColor={SCHOOL_GREEN} />
            <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 6 }}>At least 8 characters. They must change it at next login.</Text>
            <PillButton label="Reset password" icon="key-variant" color={SCHOOL_GREEN} onPress={() => void saveReset()} loading={busy} disabled={busy || reset.pw.length < 8} style={{ marginTop: 14 }} />
          </>
        ) : null}
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 8, gap: 4 },
  line: { flexDirection: "row", alignItems: "center", gap: 8 },
  f: { marginTop: 8 },
  fab: { position: "absolute", right: 16, bottom: 16, backgroundColor: SCHOOL_GREEN },
});
