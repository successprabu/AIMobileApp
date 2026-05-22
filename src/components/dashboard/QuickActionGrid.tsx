import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { MainStackParamList } from "../../navigation/types";

export type QuickActionItem = {
  screen: keyof MainStackParamList;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
};

type Props = {
  actions: QuickActionItem[];
  onPress: (screen: keyof MainStackParamList) => void;
  title: string;
};

export default function QuickActionGrid({ actions, onPress, title }: Props) {
  return (
    <View style={styles.wrap}>
      <Text variant="titleMedium" style={styles.sectionTitle}>
        {title}
      </Text>
      <View style={styles.grid}>
        {actions.map((action) => (
          <Pressable
            key={action.screen}
            style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
            onPress={() => onPress(action.screen)}
          >
            <View style={[styles.iconCircle, { backgroundColor: action.color }]}>
              <MaterialCommunityIcons name={action.icon} size={22} color="#fff" />
            </View>
            <Text variant="labelMedium" style={styles.label} numberOfLines={2}>
              {action.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  sectionTitle: { fontWeight: "700", marginBottom: 12, color: "#2d3436" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: {
    width: "30%",
    minWidth: 104,
    flexGrow: 1,
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  label: { textAlign: "center", color: "#2d3436", fontSize: 12 },
  pressed: { opacity: 0.9 },
});
