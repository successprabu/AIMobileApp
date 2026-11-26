import React, { useCallback, useState } from "react";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { SchoolStackParamList } from "../../navigation/SchoolNavigator";
import { flushAttendance, pendingAttendance } from "../../school/attendanceQueue";
import { Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SCHOOL_SITE } from "../../api/school";
import { useSchoolAuth } from "../../context/SchoolAuthContext";
import { useAppTheme } from "../../hooks/useAppTheme";
import { Notice, Rise } from "../../components/ui/AuthUi";
import { SchoolHero } from "./schoolUi";

type Icon = keyof typeof MaterialCommunityIcons.glyphMap;

type AppScreen = Exclude<keyof SchoolStackParamList, "SchoolHome" | "SchoolChangePassword">;

/** In the app: each screen with the permission that shows it. */
const IN_APP: { screen: AppScreen; label: string; icon: Icon; emoji: string; tint: string; perms: string[] }[] = [
  { screen: "SchoolAttendance", label: "Attendance", icon: "calendar-check", emoji: "✅", tint: "#dcfce7", perms: ["attendance.students"] },
  { screen: "SchoolMarks", label: "Enter marks", icon: "clipboard-text-outline", emoji: "📝", tint: "#e0e7ff", perms: ["marks.manage"] },
  { screen: "SchoolPost", label: "Homework & circulars", icon: "bullhorn-outline", emoji: "📚", tint: "#fef3c7", perms: ["circulars", "marks.manage", "students.manage"] },
  { screen: "SchoolCollectFee", label: "Collect fee", icon: "cash-check", emoji: "💰", tint: "#d1fae5", perms: ["fees.collect"] },
  { screen: "SchoolAdmissions", label: "Enquiries & applications", icon: "inbox-arrow-down", emoji: "📥", tint: "#fce7f3", perms: ["enquiries"] },
  { screen: "SchoolBusAlert", label: "Bus alert", icon: "bus-alert", emoji: "🚌", tint: "#ffedd5", perms: ["transport"] },
];

/** On the website (bigger screens): same permissions as the website's menu. */
const PAGES: { path: string; label: string; icon: Icon; perms: string[] }[] = [
  { path: "dashboard", label: "Dashboard", icon: "view-dashboard-outline", perms: ["dashboard"] },
  { path: "attendance", label: "Staff attendance", icon: "account-clock-outline", perms: ["attendance.staff"] },
  { path: "fees", label: "Fees & dues", icon: "cash-multiple", perms: ["fees.view", "fees.collect"] },
  { path: "students", label: "Students", icon: "account-school-outline", perms: ["students.view"] },
  { path: "transport", label: "Bus routes", icon: "bus-school", perms: ["transport"] },
  { path: "library", label: "Library", icon: "library-shelves", perms: ["library"] },
  { path: "reports", label: "Reports", icon: "chart-bar", perms: ["reports"] },
  { path: "website", label: "Website", icon: "web", perms: ["website.manage", "settings.manage"] },
];

const ROLE: Record<string, string> = { superadmin: "Super admin", admin: "School admin", teacher: "Teaching staff", nonteaching: "Office staff" };

/** School → Staff home: daily work in the app (attendance, marks, homework, fees, enquiries, bus), the rest on the website. */
export default function StaffHomeScreen() {
  const { school } = useSchoolAuth();
  const { theme } = useAppTheme();
  const c = theme.colors;
  const navigation = useNavigation<NativeStackNavigationProp<SchoolStackParamList>>();
  const [pending, setPending] = useState(0);
  useFocusEffect(
    useCallback(() => {
      void flushAttendance()
        .catch(() => 0)
        .then(async () => setPending((await pendingAttendance()).length));
    }, []),
  );
  if (!school) return null;
  const can = (perms: string[]) => school.user.role === "superadmin" || perms.some((p) => school.permissions.includes(p));
  const pages = PAGES.filter((p) => can(p.perms));
  const screens = IN_APP.filter((p) => can(p.perms));
  const card = (key: string, label: string, icon: Icon, onPress: () => void, i: number, web?: boolean, emoji?: string, tint?: string) => (
    <Rise key={key} delay={i * 40} style={styles.cell}>
      <Pressable onPress={onPress} style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]} accessibilityRole="button" accessibilityLabel={label}>
        {emoji ? (
          <View style={[styles.emojiTile, { backgroundColor: tint }]}>
            <Text style={{ fontSize: 26 }}>{emoji}</Text>
          </View>
        ) : (
          <MaterialCommunityIcons name={icon} size={28} color={c.textMuted} />
        )}
        <Text style={{ color: c.text, fontWeight: "700", textAlign: "center" }}>{label}</Text>
        {web ? <MaterialCommunityIcons name="open-in-new" size={12} color={c.textMuted} /> : null}
      </Pressable>
    </Rise>
  );

  return (
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={styles.wrap}>
      <Rise>
        <SchoolHero title={school.user.name} lines={[ROLE[school.user.role] ?? school.user.role]} />
      </Rise>
      {pending ? <Notice kind="info" text={`${pending} day${pending > 1 ? "s" : ""} of attendance waiting on this phone; it is sent when you are online.`} /> : null}
      {screens.length ? (
        <View style={styles.grid}>{screens.map((p, i) => card(p.screen, p.label, p.icon, () => navigation.navigate(p.screen), i, false, p.emoji, p.tint))}</View>
      ) : null}
      {pages.length ? (
        <>
          <Text style={{ color: c.textMuted, fontWeight: "700", marginTop: 4 }}>🌐 On the website (bigger screens)</Text>
          <View style={styles.grid}>
            {pages.map((p, i) => card(p.path, p.label, p.icon, () => void Linking.openURL(`${SCHOOL_SITE}/admin/${p.path}`), i + screens.length, true))}
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16, paddingBottom: 24, gap: 14 },
  emojiTile: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  hero: { flexDirection: "row", alignItems: "center", gap: 14, padding: 18, borderRadius: 20 },
  heroTitle: { color: "#fff", fontSize: 19, fontWeight: "800" },
  heroSub: { color: "#ffffffcc", marginTop: 2 },
  grid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -6 },
  cell: { width: "33.33%", padding: 6 },
  card: { borderWidth: 1, borderRadius: 16, paddingVertical: 18, paddingHorizontal: 8, alignItems: "center", gap: 8, minHeight: 104 },
});
