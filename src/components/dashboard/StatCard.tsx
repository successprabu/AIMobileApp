import React, { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppTheme } from "../../hooks/useAppTheme";

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
  const { theme } = useAppTheme();
  const c = theme.colors;
  const styles = useMemo(() => makeStyles(c), [c]);

  const content = (
    <View style={[styles.card, { borderLeftColor: accent, backgroundColor: c.card }]}>
      <View style={[styles.iconWrap, { backgroundColor: `${accent}22` }]}>
        <MaterialCommunityIcons name={icon} size={26} color={accent} />
      </View>
      <View style={styles.body}>
        <Text variant="labelMedium" style={[styles.title, { color: c.textMuted }]} numberOfLines={2}>
          {title}
        </Text>
        <Text variant="headlineSmall" style={[styles.value, { color: accent }]}>
          {value}
        </Text>
        {subtitle ? (
          <Text variant="bodySmall" style={[styles.sub, { color: c.textMuted }]}>
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

function makeStyles(c: ReturnType<typeof useAppTheme>["theme"]["colors"]) {
  return StyleSheet.create({
    card: {
      flexDirection: "row",
      alignItems: "center",
      borderRadius: 14,
      padding: 14,
      marginBottom: 10,
      borderLeftWidth: 4,
      borderWidth: 1,
      borderColor: c.border,
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
    title: { marginBottom: 4 },
    value: { fontWeight: "700" },
    sub: { marginTop: 2 },
    pressed: { opacity: 0.88 },
  });
}
