import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from "react-native";
import { ActivityIndicator, FAB, Text, TextInput } from "react-native-paper";
import { useFocusEffect } from "@react-navigation/native";
import { schoolError } from "../../api/school";
import { getSettings, studentList } from "../../api/schoolErp";
import { useSchoolAuth } from "../../context/SchoolAuthContext";
import { useAppTheme } from "../../hooks/useAppTheme";
import { Notice } from "../../components/ui/AuthUi";
import type { SchoolSettings, Student } from "../../school/erp";
import { pushSchoolScreen } from "../../school/schoolMenu";
import { Chips, SCHOOL_GREEN, ui } from "./schoolUi";

const STATUSES = ["Active", "Left", "Alumni"] as const;

/** Students: search by name, admission no or parent mobile; filter by class and status; add a student. */
export default function StudentsScreen() {
  const { school } = useSchoolAuth();
  const sid = school?.user.schoolId ?? "";
  const canAdd = school?.user.role === "superadmin" || !!school?.permissions.includes("students.manage");
  const { theme } = useAppTheme();
  const c = theme.colors;
  const [list, setList] = useState<Student[]>([]);
  const [settings, setSettings] = useState<SchoolSettings | null>(null);
  const [q, setQ] = useState("");
  const [cls, setCls] = useState("All");
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("Active");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const [l, st] = await Promise.all([studentList(sid), getSettings(sid)]);
      setList(l);
      setSettings(st.settings);
    } catch (e) {
      setError(schoolError(e, "Could not load students. Pull down to try again."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [sid]);
  useEffect(() => {
    void load();
  }, [load]);
  // Back from adding / editing: show the change.
  useFocusEffect(
    useCallback(() => {
      if (!loading) void load();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    const order = settings?.classes ?? [];
    return list
      .filter((s) => s.status === status && (cls === "All" || s.className === cls))
      .filter((s) => !t || s.name.toLowerCase().includes(t) || s.admissionNo.toLowerCase().includes(t) || (s.parentPhone ?? "").includes(t) || (s.parentName ?? "").toLowerCase().includes(t))
      .sort((a, b) => order.indexOf(a.className) - order.indexOf(b.className) || (a.section ?? "").localeCompare(b.section ?? "") || a.name.localeCompare(b.name));
  }, [list, q, cls, status, settings]);

  const classes = ["All", ...(settings?.classes.filter((k) => list.some((s) => s.className === k)) ?? [])];

  if (loading) {
    return (
      <View style={[ui.center, { backgroundColor: c.background }]}>
        <ActivityIndicator color={SCHOOL_GREEN} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <FlatList
        data={shown}
        keyExtractor={(s) => s.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, paddingBottom: 96 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} />}
        ListHeaderComponent={
          <View style={{ gap: 6, marginBottom: 8 }}>
            {error ? <Notice kind="error" text={error} /> : null}
            <TextInput mode="outlined" dense placeholder="Search name, admission no, parent mobile" value={q} onChangeText={setQ} left={<TextInput.Icon icon="magnify" />} activeOutlineColor={SCHOOL_GREEN} />
            <Chips items={[...STATUSES]} value={status} onChange={setStatus} color={SCHOOL_GREEN} />
            <Chips items={classes} value={cls} onChange={setCls} color={SCHOOL_GREEN} />
            <Text style={{ color: c.textMuted }}>{shown.length} students</Text>
          </View>
        }
        ListEmptyComponent={<Text style={{ color: c.textMuted, textAlign: "center", marginTop: 24 }}>🔍 No students match.</Text>}
        renderItem={({ item: s }) => (
          <Pressable onPress={() => pushSchoolScreen("SchoolStudent", { id: s.id })} style={[styles.row, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={styles.avatar}>
              <Text style={{ color: "#fff", fontWeight: "800" }}>{s.name.charAt(0)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.text, fontWeight: "700" }}>{s.name}</Text>
              <Text style={{ color: c.textMuted, fontSize: 12 }}>
                {s.className} {s.section ?? ""} · {s.admissionNo} · {s.parentPhone}
              </Text>
            </View>
            {s.transportRoute ? <Text>🚌</Text> : null}
          </Pressable>
        )}
      />
      {canAdd ? <FAB icon="account-plus" label="Add" style={styles.fab} color="#fff" onPress={() => pushSchoolScreen("SchoolStudentForm", {})} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: 14, borderWidth: 1, marginBottom: 8 },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: SCHOOL_GREEN, alignItems: "center", justifyContent: "center" },
  fab: { position: "absolute", right: 16, bottom: 16, backgroundColor: SCHOOL_GREEN },
});
