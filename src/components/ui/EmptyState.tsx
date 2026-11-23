import React from "react";
import { Animated, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppTheme } from "../../hooks/useAppTheme";
import { useLoop, useMotionOn } from "./Motion";

/** "Nothing here yet": a softly floating icon in a tinted circle. Floats only while its screen is showing. */
export default function EmptyState({ icon, text, color }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; text: string; color?: string }) {
  const { theme } = useAppTheme();
  const c = theme.colors;
  const tint = color ?? c.primary;
  const v = useLoop(useMotionOn(), 1800);
  return (
    <View style={styles.wrap}>
      <Animated.View style={[styles.circle, { backgroundColor: `${tint}18`, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) }] }]}>
        <MaterialCommunityIcons name={icon} size={44} color={tint} />
      </Animated.View>
      <Animated.View style={[styles.shadow, { backgroundColor: c.border, transform: [{ scaleX: v.interpolate({ inputRange: [0, 1], outputRange: [1, 0.75] }) }] }]} />
      <Text style={[styles.text, { color: c.textMuted }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", paddingVertical: 36 },
  circle: { width: 96, height: 96, borderRadius: 48, alignItems: "center", justifyContent: "center" },
  shadow: { width: 56, height: 6, borderRadius: 3, marginTop: 10, opacity: 0.7 },
  text: { marginTop: 12, fontSize: 15, fontWeight: "600", textAlign: "center", paddingHorizontal: 24 },
});
