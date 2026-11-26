import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { DrawerActions } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SCHOOL_GREEN } from "../screens/school/schoolUi";
import NotificationBell from "../screens/school/NotificationBell";

type Nav = {
  dispatch: (a: ReturnType<typeof DrawerActions.openDrawer>) => void;
  goBack: () => void;
  getState: () => { routes: { key: string }[] };
};

/**
 * The School top bar, drawn by the app (not Android's header), so pages always start below it and the
 * buttons always get the tap. Menu screens show ☰; screens opened on top of them show ←.
 */
export default function SchoolHeader({ navigation, routeKey, routeName, title, showMenu }: { navigation: Nav; routeKey: string; routeName: string; title: string; showMenu: boolean }) {
  const insets = useSafeAreaInsets();
  let depth = 0;
  try {
    depth = navigation.getState().routes.findIndex((r) => r.key === routeKey);
  } catch {
    depth = 0;
  }
  const back = routeName === "SchoolStudent" || routeName === "SchoolStudentForm" || depth >= 2;

  return (
    <View style={[styles.bar, { paddingTop: insets.top + 6 }]}>
      <View pointerEvents="none" style={[styles.glow, { width: 180, height: 180, borderRadius: 90, top: -120, left: -50, backgroundColor: "rgba(255,255,255,0.12)" }]} />
      <View pointerEvents="none" style={[styles.glow, { width: 140, height: 140, borderRadius: 70, top: -50, right: -40, backgroundColor: "rgba(0,0,0,0.10)" }]} />
      {back ? (
        <Pressable onPress={() => navigation.goBack()} hitSlop={14} style={({ pressed }) => [styles.btn, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel="Back">
          <MaterialCommunityIcons name="arrow-left" size={26} color="#fff" />
        </Pressable>
      ) : showMenu ? (
        <Pressable onPress={() => navigation.dispatch(DrawerActions.openDrawer())} hitSlop={14} style={({ pressed }) => [styles.btn, styles.menu, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel="Open menu">
          <MaterialCommunityIcons name="menu" size={26} color="#fff" />
        </Pressable>
      ) : (
        <View style={{ width: 8 }} />
      )}
      <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
        {title}
      </Text>
      {showMenu ? <NotificationBell /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: SCHOOL_GREEN, flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingBottom: 8, overflow: "hidden", zIndex: 10, elevation: 4 },
  glow: { position: "absolute" },
  btn: { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  menu: { backgroundColor: "rgba(255,255,255,0.16)" },
  pressed: { backgroundColor: "rgba(255,255,255,0.30)" },
  title: { color: "#fff", fontSize: 19, fontWeight: "800", flex: 1, marginLeft: 10 },
});
