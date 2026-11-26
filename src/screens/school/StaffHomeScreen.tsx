import React, { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SCHOOL_SITE } from "../../api/school";
import { useSchoolAuth } from "../../context/SchoolAuthContext";
import { useAppTheme } from "../../hooks/useAppTheme";
import { Notice, Rise } from "../../components/ui/AuthUi";
import { flushAttendance, pendingAttendance } from "../../school/attendanceQueue";
import { menuFor, openSchoolScreen, type MenuItem } from "../../school/schoolMenu";
import { SchoolHero } from "./schoolUi";

const ROLE: Record<string, string> = { superadmin: "Super admin", admin: "School admin", teacher: "Teaching staff", nonteaching: "Office staff" };

/** School → Staff home: every ERP page the person can use, grouped like the website's menu. */
export default function StaffHomeScreen() {
  const { school } = useSchoolAuth();
  const { theme } = useAppTheme();
  const c = theme.colors;
  const [pending, setPending] = useState(0);
  useFocusEffect(
    useCallback(() => {
      void flushAttendance()
        .catch(() => 0)
        .then(async () => setPending((await pendingAttendance()).length));
    }, []),
  );
  if (!school) return null;
  const groups = menuFor(school);

  const open = (it: MenuItem) => {
    if (it.web) void Linking.openURL(`${SCHOOL_SITE}/admin/${it.web}`);
    else if (it.screen) openSchoolScreen(it.screen);
  };

  let n = 0;
  return (
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={styles.wrap}>
      <Rise>
        <SchoolHero title={school.user.name} lines={[ROLE[school.user.role] ?? school.user.role]} />
      </Rise>
      {school.user.schoolId === "*" ? (
        <Pressable onPress={() => openSchoolScreen("SchoolPick")}>
          <Notice kind="info" text="🏫 Super admin: tap here to choose the school to work on." />
        </Pressable>
      ) : null}
      {pending ? <Notice kind="info" text={`${pending} day${pending > 1 ? "s" : ""} of attendance waiting on this phone; it is sent when you are online.`} /> : null}
      {groups.map((g) => (
        <View key={g.section}>
          <Text style={[styles.section, { color: c.textMuted }]}>{g.section.toUpperCase()}</Text>
          <View style={styles.grid}>
            {g.items.map((it) => (
              <Rise key={it.key} delay={n++ * 30} style={styles.cell}>
                <Pressable onPress={() => open(it)} style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]} accessibilityRole="button" accessibilityLabel={it.label}>
                  <View style={[styles.emojiTile, { backgroundColor: it.tint }]}>
                    <Text style={{ fontSize: 26 }}>{it.emoji}</Text>
                  </View>
                  <Text style={{ color: c.text, fontWeight: "700", textAlign: "center", fontSize: 13 }}>{it.label}</Text>
                  {it.web ? <MaterialCommunityIcons name="open-in-new" size={12} color={c.textMuted} /> : null}
                </Pressable>
              </Rise>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16, paddingBottom: 24 },
  section: { fontWeight: "800", fontSize: 12, letterSpacing: 0.8, marginTop: 10, marginBottom: 2, marginLeft: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -5 },
  cell: { width: "33.33%", padding: 5 },
  card: { borderWidth: 1, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 6, alignItems: "center", gap: 6, minHeight: 112 },
  emojiTile: { width: 50, height: 50, borderRadius: 16, alignItems: "center", justifyContent: "center" },
});
