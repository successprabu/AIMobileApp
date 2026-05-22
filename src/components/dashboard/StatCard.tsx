import React, { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
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

  const content = (
    <View style={[styles.card, { backgroundColor: accent }]}>
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
      <Pressable onPress={onPress} style={({ pressed }) => [pressed && styles.pressed]}>
        {content}
      </Pressable>
    );
  }
  return content;
}

function makeStyles() {
  return StyleSheet.create({
    card: {
      borderRadius: 14,
      padding: 14,
      minHeight: 118,
      flexDirection: "row",
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.14,
      shadowRadius: 8,
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
    pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  });
}
