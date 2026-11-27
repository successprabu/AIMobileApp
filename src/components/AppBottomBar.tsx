import React, { useRef } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { CommonActions, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { useAppTheme } from "../hooks/useAppTheme";
import { useActiveMainScreen } from "../hooks/useActiveMainScreen";
import { screenEmoji } from "../constants/screenIcons";
import type { MainStackParamList } from "../navigation/types";
import { ND } from "./ui/Motion";

type Tab = { screen: keyof MainStackParamList; label: string };

/** The five things each role uses most. */
function tabsFor(role: string, tx: (s: string) => string): Tab[] {
  switch (role) {
    case "AU":
      return [
        { screen: "Dashboard", label: tx("Home") },
        { screen: "Transaction", label: tx("Add moi") },
        { screen: "TransactionList", label: tx("Receipts") },
        { screen: "GuestEntries", label: tx("Guests") },
        { screen: "SummaryReport", label: tx("Reports") },
      ];
    case "NU":
      return [
        { screen: "Dashboard", label: tx("Home") },
        { screen: "Transaction", label: tx("Add moi") },
        { screen: "TransactionList", label: tx("Receipts") },
        { screen: "GuestEntries", label: tx("Guests") },
        { screen: "AddExpenses", label: tx("Expense") },
      ];
    case "MU":
      return [
        { screen: "Dashboard", label: tx("Home") },
        { screen: "MahalBookings", label: tx("Bookings") },
        { screen: "BookingForm", label: tx("New booking") },
        { screen: "FollowUps", label: tx("Follow-ups") },
        { screen: "MahalReports", label: tx("Reports") },
      ];
    case "MS":
      return [
        { screen: "Dashboard", label: tx("Home") },
        { screen: "MahalBookings", label: tx("Bookings") },
        { screen: "BookingForm", label: tx("New booking") },
        { screen: "MahalExpenses", label: tx("Expenses") },
        { screen: "MahalReviews", label: tx("Reviews") },
      ];
    case "SU":
      return [
        { screen: "Dashboard", label: tx("Home") },
        { screen: "ClientList", label: tx("Clients") },
        { screen: "Enquiries", label: tx("Enquiries") },
        { screen: "MahalBookings", label: tx("Bookings") },
        { screen: "TransactionList", label: tx("Receipts") },
      ];
    default:
      return [];
  }
}

/** DigiMoi / Mahal bottom bar: big emoji buttons in the header colour, like the School app. */
export default function AppBottomBar() {
  const { t } = useTranslation();
  const tx = (s: string) => t(s, { defaultValue: s });
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const { user } = useAuth();
  const active = useActiveMainScreen();
  const navigation = useNavigation();
  const tabs = tabsFor(user?.userType ?? "", tx);
  if (tabs.length < 2) return null;
  const bg = theme.colors.header;
  /** Tabs swap places with Home underneath, so screens never pile up and Back goes Home. */
  const open = (screen: keyof MainStackParamList) =>
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: "Home", state: { index: screen === "Dashboard" ? 0 : 1, routes: screen === "Dashboard" ? [{ name: "Dashboard" }] : [{ name: "Dashboard" }, { name: screen }] } }],
      }),
    );

  return (
    <View style={[styles.bar, { backgroundColor: bg, paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View pointerEvents="none" style={[styles.glow, { width: 150, height: 150, borderRadius: 75, top: -95, left: -30, backgroundColor: "rgba(255,255,255,0.12)" }]} />
      <View pointerEvents="none" style={[styles.glow, { width: 120, height: 120, borderRadius: 60, bottom: -75, right: -20, backgroundColor: "rgba(0,0,0,0.10)" }]} />
      {tabs.map((tab) => (
        <TabButton key={tab.screen} emoji={screenEmoji(tab.screen).emoji} label={tab.label} on={active === tab.screen} onPress={() => active !== tab.screen && open(tab.screen)} />
      ))}
    </View>
  );
}

function TabButton({ emoji, label, on, onPress }: { emoji: string; label: string; on: boolean; onPress: () => void }) {
  const s = useRef(new Animated.Value(1)).current;
  const to = (v: number) => Animated.spring(s, { toValue: v, friction: 5, tension: 260, useNativeDriver: ND }).start();
  return (
    <Pressable onPress={onPress} onPressIn={() => to(0.85)} onPressOut={() => to(1)} style={styles.tab} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={label}>
      <Animated.View style={[styles.pill, on && styles.pillOn, { transform: [{ scale: s }] }]}>
        <Text style={styles.emoji}>{emoji}</Text>
      </Animated.View>
      <Text style={[styles.label, on && { opacity: 1, fontWeight: "800" }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
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
