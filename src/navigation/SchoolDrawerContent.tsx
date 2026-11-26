import React, { useState } from "react";
import { Alert, Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Switch, Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { DrawerContentComponentProps } from "@react-navigation/drawer";
import { SCHOOL_SITE, schoolError, schoolLogoutAll } from "../api/school";
import { useAuth } from "../context/AuthContext";
import { useAppLock } from "../context/AppLockContext";
import { useSchoolAuth } from "../context/SchoolAuthContext";
import { useAppTheme } from "../hooks/useAppTheme";
import { unregisterSchoolPush } from "../school/push";
import { menuFor, openSchoolScreen, type MenuItem } from "../school/schoolMenu";
import { SCHOOL_GREEN } from "../screens/school/schoolUi";
import type { ParentSection } from "../screens/school/SchoolBottomBar";

const PARENT_ITEMS: { label: string; emoji: string; section: ParentSection }[] = [
  { label: "Home", emoji: "🏠", section: "top" },
  { label: "Attendance", emoji: "📅", section: "attendance" },
  { label: "Notices & homework", emoji: "📚", section: "notices" },
  { label: "Fees & receipts", emoji: "💰", section: "fees" },
  { label: "Bus", emoji: "🚌", section: "bus" },
  { label: "Ask about my child", emoji: "🤖", section: "ask" },
];

const ROLE: Record<string, string> = { superadmin: "Super admin", admin: "School admin", teacher: "Teaching staff", nonteaching: "Office staff", parent: "Parent" };

/** The School side menu: grouped like the website (Overview, Daily work, Campus, Insights, Administration). */
export default function SchoolDrawerContent(props: DrawerContentComponentProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const c = theme.colors;
  const { user } = useAuth();
  const { school, schoolSignOut, setActiveApp } = useSchoolAuth();
  const { lockEnabled, setLockEnabled } = useAppLock();
  const [folded, setFolded] = useState<Record<string, boolean>>({});
  if (!school) return null;
  const isParent = school.user.role === "parent";
  const close = () => props.navigation.closeDrawer();

  const go = (it: MenuItem) => {
    close();
    if (it.web) void Linking.openURL(`${SCHOOL_SITE}/admin/${it.web}`);
    else if (it.screen) openSchoolScreen(it.screen);
  };

  const signOut = () =>
    Alert.alert("Sign out of School?", user ? "You stay signed in to DigiMoi / Mahal." : undefined, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: () =>
          void (async () => {
            await unregisterSchoolPush().catch(() => undefined);
            await schoolSignOut();
            await setActiveApp(user ? "mysuccess" : null);
          })(),
      },
    ]);
  const signOutAll = () =>
    Alert.alert("Sign out of all devices?", "Your School login ends on every phone and browser, including this one.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out everywhere",
        style: "destructive",
        onPress: () =>
          void (async () => {
            try {
              await schoolLogoutAll();
            } catch (e) {
              return Alert.alert("Could not sign out everywhere", schoolError(e, "Check the network and try again."));
            }
            await schoolSignOut();
            await setActiveApp(user ? "mysuccess" : null);
          })(),
      },
    ]);
  const toggleLock = async () => {
    const err = await setLockEnabled(!lockEnabled);
    if (err) Alert.alert("App lock", err);
  };

  const row = (key: string, emoji: string, label: string, onPress: () => void, web?: boolean) => (
    <Pressable key={key} onPress={onPress} style={({ pressed }) => [styles.item, pressed && { backgroundColor: `${SCHOOL_GREEN}1a` }]} accessibilityRole="button">
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={{ color: c.text, fontWeight: "600", flex: 1 }}>{label}</Text>
      {web ? <MaterialCommunityIcons name="open-in-new" size={14} color={c.textMuted} /> : null}
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.drawerBg }}>
      <View style={[styles.head, { paddingTop: insets.top + 16 }]}>
        <View pointerEvents="none" style={[styles.glow, { width: 170, height: 170, borderRadius: 85, top: -60, right: -50, backgroundColor: "rgba(255,255,255,0.14)" }]} />
        <Text style={{ fontSize: 34 }}>🏫</Text>
        <Text style={styles.school} numberOfLines={2}>
          {school.schoolName ?? school.user.schoolId}
        </Text>
        <Text style={styles.who}>
          {school.user.name} · {ROLE[school.user.role] ?? school.user.role}
        </Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingVertical: 8 }}>
        {school.user.role === "superadmin" ? row("pick", "🔄", "Switch school", () => { close(); openSchoolScreen("SchoolPick"); }) : null}
        {!isParent ? row("home", "🏠", "Home", () => { close(); openSchoolScreen("SchoolHome"); }) : null}
        {isParent
          ? PARENT_ITEMS.map((p) => row(p.section, p.emoji, p.label, () => { close(); openSchoolScreen("SchoolHome", { section: p.section, at: Date.now() }); }))
          : menuFor(school).map((g) => (
              <View key={g.section}>
                <Pressable onPress={() => setFolded((f) => ({ ...f, [g.section]: !f[g.section] }))} style={styles.section} accessibilityRole="button" accessibilityState={{ expanded: !folded[g.section] }}>
                  <Text style={{ color: c.textMuted, fontWeight: "800", fontSize: 12, letterSpacing: 0.8, flex: 1 }}>{g.section.toUpperCase()}</Text>
                  <MaterialCommunityIcons name={folded[g.section] ? "chevron-down" : "chevron-up"} size={18} color={c.textMuted} />
                </Pressable>
                {folded[g.section] ? null : g.items.map((it) => row(it.key, it.emoji, it.label, () => go(it), !!it.web))}
              </View>
            ))}

        <View style={[styles.sep, { backgroundColor: c.border }]} />
        {user ? row("ms", "💍", "Open DigiMoi / Mahal", () => { close(); void setActiveApp("mysuccess"); }) : null}
        {row("pw", "🔑", "Change password", () => { close(); openSchoolScreen("SchoolChangePassword"); })}
        {row("site", "🌐", "School website", () => void Linking.openURL(SCHOOL_SITE), true)}
        <View style={styles.item}>
          <Text style={styles.emoji}>🔒</Text>
          <Text style={{ color: c.text, fontWeight: "600", flex: 1 }}>App lock</Text>
          <Switch value={lockEnabled} onValueChange={() => void toggleLock()} color={SCHOOL_GREEN} />
        </View>
      </ScrollView>
      <View style={[styles.foot, { paddingBottom: insets.bottom + 10, borderTopColor: c.border }]}>
        <Pressable onPress={signOut} style={[styles.out, { backgroundColor: `${c.danger}17` }]} accessibilityRole="button">
          <MaterialCommunityIcons name="logout" size={18} color={c.danger} />
          <Text style={{ color: c.danger, fontWeight: "800" }}>Sign out of School</Text>
        </Pressable>
        <Pressable onPress={signOutAll} style={{ alignItems: "center", paddingTop: 8 }} accessibilityRole="button">
          <Text style={{ color: c.textMuted, fontWeight: "700", fontSize: 13 }}>Sign out of all devices</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { backgroundColor: SCHOOL_GREEN, paddingHorizontal: 18, paddingBottom: 18, overflow: "hidden", borderBottomRightRadius: 28 },
  glow: { position: "absolute" },
  school: { color: "#fff", fontSize: 18, fontWeight: "800", marginTop: 6 },
  who: { color: "#ffffffd9", marginTop: 2 },
  section: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingTop: 14, paddingBottom: 4 },
  item: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingVertical: 11, marginHorizontal: 8, borderRadius: 12 },
  emoji: { fontSize: 20, width: 28, textAlign: "center" },
  sep: { height: 1, marginVertical: 8, marginHorizontal: 18 },
  foot: { paddingHorizontal: 16, paddingTop: 10, borderTopWidth: 1 },
  out: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 14 },
});
