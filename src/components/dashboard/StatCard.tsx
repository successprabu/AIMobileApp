import React from "react";
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

export default function StatCard({
  title,
  value,
  subtitle,
  icon,
  accent,
  onPress,
}: Props) {
  const content = (
    <View style={[styles.card, { borderLeftColor: accent }]}>
      <View style={[styles.iconWrap, { backgroundColor: `${accent}22` }]}>
        <MaterialCommunityIcons name={icon} size={26} color={accent} />
      </View>
      <View style={styles.body}>
        <Text variant="labelMedium" style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        <Text variant="headlineSmall" style={[styles.value, { color: accent }]}>
          {value}
        </Text>
        {subtitle ? (
          <Text variant="bodySmall" style={styles.sub}>
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

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  body: { flex: 1 },
  title: { color: "#636e72", marginBottom: 4 },
  value: { fontWeight: "700" },
  sub: { color: "#95a5a6", marginTop: 2 },
  pressed: { opacity: 0.88 },
});
