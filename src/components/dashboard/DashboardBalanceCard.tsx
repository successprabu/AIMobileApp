import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppTheme } from "../../hooks/useAppTheme";

type Props = {
  label: string;
  value: string;
  positive: boolean;
};

export default function DashboardBalanceCard({ label, value, positive }: Props) {
  const { theme } = useAppTheme();
  const c = theme.colors;
  const styles = useMemo(() => makeStyles(c), [c]);
  const valueColor = positive ? "#00b894" : "#d63031";

  return (
    <View style={[styles.wrap, { borderColor: c.border, backgroundColor: c.card }]}>
      <View style={[styles.iconCircle, { backgroundColor: `${valueColor}18` }]}>
        <MaterialCommunityIcons
          name={positive ? "trending-up" : "trending-down"}
          size={28}
          color={valueColor}
        />
      </View>
      <View style={styles.textBlock}>
        <Text variant="labelLarge" style={[styles.label, { color: c.textMuted }]}>
          {label}
        </Text>
        <Text variant="headlineMedium" style={[styles.value, { color: valueColor }]}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function makeStyles(c: ReturnType<typeof useAppTheme>["theme"]["colors"]) {
  return StyleSheet.create({
    wrap: {
      flexDirection: "row",
      alignItems: "center",
      borderRadius: 16,
      padding: 18,
      marginBottom: 16,
      borderWidth: 1,
      borderLeftWidth: 4,
      borderLeftColor: c.primary,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 10,
      elevation: 3,
    },
    iconCircle: {
      width: 52,
      height: 52,
      borderRadius: 26,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 14,
    },
    textBlock: { flex: 1 },
    label: { fontWeight: "600" },
    value: { fontWeight: "800", marginTop: 4 },
  });
}
