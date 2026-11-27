import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { DrawerActions } from "@react-navigation/native";
import type { NativeStackHeaderProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "../hooks/useAppTheme";
import MySuccessBell from "../components/MySuccessBell";

/** Forms opened on top of a list: a back arrow instead of the menu. */
const BACK = new Set(["MahalForm", "BookingForm"]);

/**
 * DigiMoi / Mahal top bar, drawn by the app instead of Android's header, so screens always start below it and
 * ☰ / ← always get the tap. Keeps each screen's own title and right-side buttons (setOptions).
 */
export default function AppHeader({ navigation, route, options }: NativeStackHeaderProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const c = theme.colors;
  const tint = c.headerText;
  const title = typeof options.title === "string" && options.title ? options.title : route.name;
  const back = BACK.has(route.name);
  const right = options.headerRight?.({ tintColor: tint, canGoBack: navigation.canGoBack() });

  return (
    <View style={[styles.bar, { paddingTop: insets.top + 6, backgroundColor: c.header }]}>
      <View pointerEvents="none" style={[styles.glow, { width: 180, height: 180, borderRadius: 90, top: -120, left: -50, backgroundColor: "rgba(255,255,255,0.12)" }]} />
      <View pointerEvents="none" style={[styles.glow, { width: 140, height: 140, borderRadius: 70, top: -50, right: -40, backgroundColor: "rgba(0,0,0,0.10)" }]} />
      {back ? (
        <Pressable onPress={() => navigation.goBack()} hitSlop={14} style={({ pressed }) => [styles.btn, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel="Back">
          <MaterialCommunityIcons name="arrow-left" size={26} color={tint} />
        </Pressable>
      ) : (
        <Pressable onPress={() => navigation.dispatch(DrawerActions.openDrawer())} hitSlop={14} style={({ pressed }) => [styles.btn, styles.menu, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel="Open menu">
          <MaterialCommunityIcons name="menu" size={26} color={tint} />
        </Pressable>
      )}
      <Text style={[styles.title, { color: tint }]} numberOfLines={1} accessibilityRole="header">
        {title}
      </Text>
      {right ? <View style={styles.right}>{right}</View> : null}
      <MySuccessBell tint={tint} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingBottom: 8, overflow: "hidden", elevation: 4, zIndex: 10 },
  glow: { position: "absolute" },
  btn: { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  menu: { backgroundColor: "rgba(255,255,255,0.16)" },
  pressed: { backgroundColor: "rgba(255,255,255,0.30)" },
  title: { fontSize: 19, fontWeight: "800", flex: 1, marginLeft: 10 },
  right: { flexDirection: "row", alignItems: "center" },
});
