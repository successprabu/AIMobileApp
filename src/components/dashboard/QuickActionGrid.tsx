import React, { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppTheme } from "../../hooks/useAppTheme";
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
  const { theme } = useAppTheme();
  const c = theme.colors;
  const styles = useMemo(() => makeStyles(c), [c]);

  return (
    <View style={styles.wrap}>
      <Text variant="titleMedium" style={[styles.sectionTitle, { color: c.text }]}>
        {title}
      </Text>
      <View style={styles.grid}>
        {actions.map((action) => (
          <Pressable
            key={action.screen}
            style={({ pressed }) => [
              styles.tile,
              { backgroundColor: c.card, borderColor: c.border },
              pressed && styles.pressed,
            ]}
            onPress={() => onPress(action.screen)}
          >
            <View style={[styles.iconCircle, { backgroundColor: action.color }]}>
              <MaterialCommunityIcons name={action.icon} size={22} color="#fff" />
            </View>
            <Text variant="labelMedium" style={[styles.label, { color: c.text }]} numberOfLines={2}>
              {action.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function makeStyles(c: ReturnType<typeof useAppTheme>["theme"]["colors"]) {
  return StyleSheet.create({
    wrap: { marginBottom: 16 },
    sectionTitle: { fontWeight: "700", marginBottom: 12 },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    tile: {
      width: "30%",
      minWidth: 104,
      flexGrow: 1,
      borderRadius: 14,
      borderWidth: 1,
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
    label: { textAlign: "center", fontSize: 12 },
    pressed: { opacity: 0.9 },
  });
}
