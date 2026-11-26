import React, { useRef } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ND } from "../../components/ui/Motion";
import { useSchoolAuth } from "../../context/SchoolAuthContext";
import { SCHOOL_GREEN } from "./schoolUi";

/** Where a tab goes: a School screen, or (parents) a part of the parent home. */
export type SchoolTab = { key: string; label: string; emoji: string; screen: string; section?: ParentSection };
export type ParentSection = "top" | "attendance" | "notices" | "fees" | "bus" | "ask";

const STAFF: (SchoolTab & { perms: string[] })[] = [
  { key: "home", label: "Home", emoji: "🏫", screen: "SchoolHome", perms: [] },
  { key: "att", label: "Attendance", emoji: "✅", screen: "SchoolAttendance", perms: ["attendance.students"] },
  { key: "post", label: "Homework", emoji: "📚", screen: "SchoolPost", perms: ["circulars", "marks.manage", "students.manage"] },
  { key: "fee", label: "Fees", emoji: "💰", screen: "SchoolCollectFee", perms: ["fees.collect"] },
  { key: "enq", label: "Enquiries", emoji: "📥", screen: "SchoolAdmissions", perms: ["enquiries"] },
  { key: "marks", label: "Marks", emoji: "📝", screen: "SchoolMarks", perms: ["marks.manage"] },
  { key: "bus", label: "Bus", emoji: "🚌", screen: "SchoolBusAlert", perms: ["transport"] },
];

const PARENT: SchoolTab[] = [
  { key: "top", label: "Home", emoji: "🏠", screen: "SchoolHome", section: "top" },
  { key: "attendance", label: "Attendance", emoji: "📅", screen: "SchoolHome", section: "attendance" },
  { key: "notices", label: "Homework", emoji: "📚", screen: "SchoolHome", section: "notices" },
  { key: "fees", label: "Fees", emoji: "💰", screen: "SchoolHome", section: "fees" },
  { key: "ask", label: "Ask", emoji: "🤖", screen: "SchoolHome", section: "ask" },
];

export type SchoolTabNav = {
  navigate: (screen: string, params?: object) => void;
  replace: (screen: string, params?: object) => void;
  popTo: (screen: string, params?: object) => void;
};

/** Bottom bar on every School screen: the five things people use most, as big emoji buttons. */
export default function SchoolBottomBar({ navigation, routeName, section }: { navigation: SchoolTabNav; routeName: string; section?: ParentSection }) {
  const insets = useSafeAreaInsets();
  const { school } = useSchoolAuth();
  if (!school || school.user.mustChangePassword) return null;
  const isParent = school.user.role === "parent";
  const can = (perms: string[]) => !perms.length || school.user.role === "superadmin" || perms.some((p) => school.permissions.includes(p));
  const tabs: SchoolTab[] = isParent ? PARENT : STAFF.filter((t) => can(t.perms)).slice(0, 5);
  if (tabs.length < 2) return null;

  const active = (t: SchoolTab) => (isParent ? routeName === "SchoolHome" && (section ?? "top") === t.section : routeName === t.screen);

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View pointerEvents="none" style={[styles.glow, { width: 150, height: 150, borderRadius: 75, top: -95, left: -30, backgroundColor: "rgba(255,255,255,0.12)" }]} />
      <View pointerEvents="none" style={[styles.glow, { width: 120, height: 120, borderRadius: 60, bottom: -75, right: -20, backgroundColor: "rgba(0,0,0,0.10)" }]} />
      {tabs.map((t) => (
        <Tab
          key={t.key}
          tab={t}
          on={active(t)}
          onPress={() => {
            // Tabs swap places (Home stays underneath), so Back always goes Home and screens never pile up.
            const params = t.section ? { section: t.section, at: Date.now() } : undefined;
            if (t.screen === "SchoolHome") {
              if (routeName === "SchoolHome") navigation.navigate(t.screen, params);
              else navigation.popTo(t.screen, params);
            } else if (routeName === t.screen) return;
            else if (routeName === "SchoolHome") navigation.navigate(t.screen, params);
            else navigation.replace(t.screen, params);
          }}
        />
      ))}
    </View>
  );
}

function Tab({ tab, on, onPress }: { tab: SchoolTab; on: boolean; onPress: () => void }) {
  const s = useRef(new Animated.Value(1)).current;
  const to = (v: number) => Animated.spring(s, { toValue: v, friction: 5, tension: 260, useNativeDriver: ND }).start();
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => to(0.85)}
      onPressOut={() => to(1)}
      style={styles.tab}
      accessibilityRole="tab"
      accessibilityState={{ selected: on }}
      accessibilityLabel={tab.label}
    >
      <Animated.View style={[styles.pill, on && styles.pillOn, { transform: [{ scale: s }] }]}>
        <Text style={styles.emoji}>{tab.emoji}</Text>
      </Animated.View>
      <Text style={[styles.label, on && { opacity: 1, fontWeight: "800" }]} numberOfLines={1}>
        {tab.label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    backgroundColor: SCHOOL_GREEN,
    paddingTop: 8,
    paddingHorizontal: 6,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: "hidden",
    elevation: 12,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
  },
  glow: { position: "absolute" },
  tab: { flex: 1, alignItems: "center", gap: 2 },
  pill: { width: 46, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  pillOn: { backgroundColor: "rgba(255,255,255,0.25)" },
  emoji: { fontSize: 20 },
  label: { color: "#fff", fontSize: 11, opacity: 0.85 },
});
