import React from "react";
import { Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SCHOOL_SITE } from "../../api/school";
import { useSchoolAuth } from "../../context/SchoolAuthContext";
import { useAppTheme } from "../../hooks/useAppTheme";
import { Notice, Rise } from "../../components/ui/AuthUi";

type Icon = keyof typeof MaterialCommunityIcons.glyphMap;

/** Each ERP page with the permission that shows it (same as the website's menu). */
const PAGES: { path: string; label: string; icon: Icon; perms: string[] }[] = [
  { path: "dashboard", label: "Dashboard", icon: "view-dashboard-outline", perms: ["dashboard"] },
  { path: "attendance", label: "Attendance", icon: "calendar-check", perms: ["attendance.students", "attendance.staff"] },
  { path: "fees", label: "Fees", icon: "cash-multiple", perms: ["fees.view", "fees.collect"] },
  { path: "marks", label: "Marks", icon: "clipboard-text-outline", perms: ["marks.view", "marks.manage"] },
  { path: "circulars", label: "Circulars & homework", icon: "bullhorn-outline", perms: ["circulars", "marks.manage", "students.manage"] },
  { path: "students", label: "Students", icon: "account-school-outline", perms: ["students.view"] },
  { path: "enquiries", label: "Enquiries", icon: "inbox-arrow-down", perms: ["enquiries"] },
  { path: "applications", label: "Applications", icon: "card-account-details-outline", perms: ["enquiries"] },
  { path: "transport", label: "Transport", icon: "bus-school", perms: ["transport"] },
  { path: "library", label: "Library", icon: "library-shelves", perms: ["library"] },
  { path: "reports", label: "Reports", icon: "chart-bar", perms: ["reports"] },
  { path: "website", label: "Website", icon: "web", perms: ["website.manage", "settings.manage"] },
];

const ROLE: Record<string, string> = { superadmin: "Super admin", admin: "School admin", teacher: "Teaching staff", nonteaching: "Office staff" };

/**
 * School → Staff home (first version). Shows the school, the person's role and every ERP page they can use.
 * Pages open on the website for now; they move into the app screen by screen (attendance first).
 */
export default function StaffHomeScreen() {
  const { school } = useSchoolAuth();
  const { theme } = useAppTheme();
  const c = theme.colors;
  if (!school) return null;
  const can = (perms: string[]) => school.user.role === "superadmin" || perms.some((p) => school.permissions.includes(p));
  const pages = PAGES.filter((p) => can(p.perms));

  return (
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={styles.wrap}>
      <Rise>
        <View style={[styles.hero, { backgroundColor: c.primary }]}>
          <MaterialCommunityIcons name="school" size={34} color="#fff" />
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>{school.schoolName ?? school.user.schoolId}</Text>
            <Text style={styles.heroSub}>
              {school.user.name} · {ROLE[school.user.role] ?? school.user.role}
            </Text>
          </View>
        </View>
      </Rise>
      <Notice kind="info" text="School ERP in the app is new. These pages open on the website for now; attendance, homework and fees are coming into the app next." />
      <View style={styles.grid}>
        {pages.map((p, i) => (
          <Rise key={p.path} delay={i * 40} style={styles.cell}>
            <Pressable
              onPress={() => void Linking.openURL(`${SCHOOL_SITE}/admin/${p.path}`)}
              style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}
              accessibilityRole="button"
              accessibilityLabel={p.label}
            >
              <MaterialCommunityIcons name={p.icon} size={28} color={c.primary} />
              <Text style={{ color: c.text, fontWeight: "700", textAlign: "center" }}>{p.label}</Text>
            </Pressable>
          </Rise>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16, paddingBottom: 40, gap: 14 },
  hero: { flexDirection: "row", alignItems: "center", gap: 14, padding: 18, borderRadius: 20 },
  heroTitle: { color: "#fff", fontSize: 19, fontWeight: "800" },
  heroSub: { color: "#ffffffcc", marginTop: 2 },
  grid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -6 },
  cell: { width: "33.33%", padding: 6 },
  card: { borderWidth: 1, borderRadius: 16, paddingVertical: 18, paddingHorizontal: 8, alignItems: "center", gap: 8, minHeight: 104 },
});
