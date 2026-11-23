import React, { useRef } from "react";
import { Animated, Easing, Platform, Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { DrawerActions, useNavigation } from "@react-navigation/native";
import { ND } from "./Motion";

/**
 * The app's top bar pieces (used as native-stack header options). Only one-time animations (on open and on
 * press), so screens people use all day cost nothing extra.
 */

/** Deep pink with soft circles, the same look as the sign-in screen. Static: no animation cost. */
export function HeaderBackground({ color }: { color: string }) {
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: color, overflow: "hidden" }]}>
      <View style={[styles.glow, { width: 180, height: 180, borderRadius: 90, top: -110, left: -50, backgroundColor: "rgba(255,255,255,0.12)" }]} />
      <View style={[styles.glow, { width: 140, height: 140, borderRadius: 70, top: -40, right: -40, backgroundColor: "rgba(0,0,0,0.12)" }]} />
      <View style={[styles.glow, { width: 60, height: 60, borderRadius: 30, bottom: -30, right: 110, backgroundColor: "rgba(255,255,255,0.08)" }]} />
    </View>
  );
}

/** The screen title. Not animated: native headers can rebuild their title view, which made it blink. */
export function HeaderTitle({ children, tint }: { children: string; tint: string }) {
  return (
    <Text numberOfLines={1} style={{ color: tint, fontSize: 19, fontWeight: "800", letterSpacing: 0.2 }} accessibilityRole="header">
      {children}
    </Text>
  );
}

/** A round glassy header button that springs when pressed. */
export function HeaderIconButton({ icon, label, onPress, tint }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; onPress: () => void; tint: string }) {
  const s = useRef(new Animated.Value(1)).current;
  const to = (v: number) => Animated.spring(s, { toValue: v, friction: 5, tension: 260, useNativeDriver: ND }).start();
  return (
    <Animated.View style={{ transform: [{ scale: s }], marginRight: 10 }}>
      <Pressable onPress={onPress} onPressIn={() => to(0.86)} onPressOut={() => to(1)} accessibilityRole="button" accessibilityLabel={label} hitSlop={8} style={styles.iconBtn}>
        <MaterialCommunityIcons name={icon} size={22} color={tint} />
      </Pressable>
    </Animated.View>
  );
}

/**
 * Opens the sidebar. A drawn "menu" mark: three rounded bars of different lengths in a glassy square; when
 * pressed the button springs and the bars line up to full width, then settle back.
 */
export function MenuButton({ tint }: { tint: string }) {
  const navigation = useNavigation();
  const scale = useRef(new Animated.Value(1)).current;
  const line = useRef(new Animated.Value(0)).current;
  const pressIn = () => {
    Animated.spring(scale, { toValue: 0.88, friction: 5, tension: 260, useNativeDriver: ND }).start();
    Animated.timing(line, { toValue: 1, duration: 160, useNativeDriver: ND }).start();
  };
  const pressOut = () => {
    Animated.spring(scale, { toValue: 1, friction: 4, tension: 200, useNativeDriver: ND }).start();
    Animated.spring(line, { toValue: 0, friction: 5, tension: 120, useNativeDriver: ND }).start();
  };
  // Width of each bar as a share of the longest (22px); pressing stretches the short ones to full.
  const bar = (share: number) => ({
    backgroundColor: tint,
    transform: [{ scaleX: line.interpolate({ inputRange: [0, 1], outputRange: [share, 1] }) }],
  });
  return (
    <Animated.View style={{ marginLeft: Platform.OS === "web" ? 8 : 0, marginRight: 10, transform: [{ scale }] }}>
      <Pressable
        onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
        onPressIn={pressIn}
        onPressOut={pressOut}
        accessibilityRole="button"
        accessibilityLabel="Open menu"
        hitSlop={8}
        style={styles.menuBtn}
      >
        <Animated.View style={[styles.bar, bar(1)]} />
        <Animated.View style={[styles.bar, bar(0.6)]} />
        <Animated.View style={[styles.bar, bar(0.82)]} />
      </Pressable>
    </Animated.View>
  );
}

/** Goes back one screen. */
export function BackButton({ tint, onPress }: { tint: string; onPress: () => void }) {
  return <HeaderIconButton icon="arrow-left" label="Back" onPress={onPress} tint={tint} />;
}

const styles = StyleSheet.create({
  glow: { position: "absolute" },
  menuBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
    justifyContent: "center",
    paddingLeft: 10,
    gap: 4,
  },
  bar: { width: 22, height: 2.6, borderRadius: 2, transformOrigin: "left" },
  iconBtn: { width: 40, height: 40, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" },
});
