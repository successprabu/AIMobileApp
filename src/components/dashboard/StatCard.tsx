import React, { useMemo, useRef } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { ND } from "../ui/Motion";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";

type Props = {
  title: string;
  value: string;
  subtitle?: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  accent: string;
  onPress?: () => void;
};

/** Compact colored metric tile (web dashboard style), sized for 2-column grid. */
export default function StatCard({ title, value, subtitle, icon, accent, onPress }: Props) {
  const styles = useMemo(() => makeStyles(), []);
  const scale = useRef(new Animated.Value(1)).current;
  const squeeze = (v: number) => Animated.spring(scale, { toValue: v, friction: 5, tension: 260, useNativeDriver: ND }).start();

  const content = (
    <View style={[styles.card, { backgroundColor: accent, shadowColor: accent }]}>
      <View pointerEvents="none" style={styles.glow} />
      <View style={styles.iconWrap}>
        <MaterialCommunityIcons name={icon} size={28} color="#ffffff" />
      </View>
      <View style={styles.body}>
        <Text variant="labelMedium" style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        <Text variant="titleLarge" style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>
        {subtitle ? (
          <Text variant="bodySmall" style={styles.sub} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Animated.View style={{ transform: [{ scale }] }}>
        <Pressable onPress={onPress} onPressIn={() => squeeze(0.95)} onPressOut={() => squeeze(1)} accessibilityRole="button" accessibilityLabel={`${title} ${value}`}>
          {content}
        </Pressable>
      </Animated.View>
    );
  }
  return content;
}

function makeStyles() {
  return StyleSheet.create({
    card: {
      borderRadius: 20,
      padding: 14,
      minHeight: 118,
      overflow: "hidden",
      flexDirection: "row",
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 10,
      elevation: 4,
    },
    iconWrap: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 10,
      backgroundColor: "rgba(255,255,255,0.22)",
    },
    body: { flex: 1, minWidth: 0 },
    title: {
      color: "rgba(255,255,255,0.92)",
      marginBottom: 4,
      fontWeight: "600",
    },
    value: {
      color: "#ffffff",
      fontWeight: "800",
      fontSize: 20,
      lineHeight: 26,
    },
    sub: {
      color: "rgba(255,255,255,0.78)",
      marginTop: 2,
    },
    glow: { position: "absolute", width: 120, height: 120, borderRadius: 60, top: -50, right: -40, backgroundColor: "rgba(255,255,255,0.16)" },
  });
}
