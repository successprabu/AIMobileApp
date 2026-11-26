import React, { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { ActivityIndicator, Text, TextInput } from "react-native-paper";
import { schoolError } from "../../api/school";
import { allSchools } from "../../api/schoolErp";
import { useSchoolAuth } from "../../context/SchoolAuthContext";
import { useAppTheme } from "../../hooks/useAppTheme";
import { Notice } from "../../components/ui/AuthUi";
import { openSchoolScreen } from "../../school/schoolMenu";
import { SCHOOL_GREEN, ui } from "./schoolUi";

/** Super admin: choose the school to work on (like the school picker on the website). */
export default function SchoolPickScreen() {
  const { pickedSchool, pickSchool } = useSchoolAuth();
  const { theme } = useAppTheme();
  const c = theme.colors;
  const [list, setList] = useState<{ id: string; label: string }[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void allSchools()
      .then(setList)
      .catch((e) => setError(schoolError(e, "Could not load the schools.")))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={[ui.center, { backgroundColor: c.background }]}>
        <ActivityIndicator color={SCHOOL_GREEN} />
      </View>
    );
  }
  const t = q.trim().toLowerCase();
  return (
    <FlatList
      style={{ backgroundColor: c.background }}
      contentContainerStyle={{ padding: 16 }}
      data={list.filter((x) => !t || x.label.toLowerCase().includes(t) || x.id.includes(t))}
      keyExtractor={(x) => x.id}
      ListHeaderComponent={
        <View style={{ gap: 8, marginBottom: 8 }}>
          {error ? <Notice kind="error" text={error} /> : null}
          <TextInput mode="outlined" dense placeholder="Search schools" value={q} onChangeText={setQ} left={<TextInput.Icon icon="magnify" />} activeOutlineColor={SCHOOL_GREEN} />
        </View>
      }
      renderItem={({ item }) => {
        const on = pickedSchool?.id === item.id;
        return (
          <Pressable
            onPress={() => void pickSchool(item).then(() => openSchoolScreen("SchoolHome"))}
            style={[styles.row, { backgroundColor: on ? `${SCHOOL_GREEN}1f` : c.surface, borderColor: on ? SCHOOL_GREEN : c.border }]}
          >
            <Text style={{ fontSize: 22 }}>🏫</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.text, fontWeight: "700" }}>{item.label}</Text>
              <Text style={{ color: c.textMuted, fontSize: 12 }}>{item.id}</Text>
            </View>
            {on ? <Text style={{ color: SCHOOL_GREEN, fontWeight: "800" }}>✓</Text> : null}
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 14, borderWidth: 1, marginBottom: 8 },
});
