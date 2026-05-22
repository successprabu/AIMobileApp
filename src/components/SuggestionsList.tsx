import React, { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { useAppTheme } from "../hooks/useAppTheme";

type Props = {
  suggestions: string[];
  selectedIndex: number;
  onSelect: (value: string) => void;
};

export default function SuggestionsList({
  suggestions,
  selectedIndex,
  onSelect,
}: Props) {
  const { theme } = useAppTheme();
  const c = theme.colors;
  const styles = useMemo(() => makeStyles(c), [c]);

  if (!suggestions.length) return null;

  return (
    <View style={styles.container}>
      {suggestions.map((item, index) => (
        <Pressable
          key={`${item}-${index}`}
          onPress={() => onSelect(item)}
          style={[
            styles.item,
            index === selectedIndex && styles.itemSelected,
          ]}
        >
          <Text variant="bodyMedium" style={{ color: c.text }}>
            {item}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function makeStyles(c: ReturnType<typeof useAppTheme>["theme"]["colors"]) {
  return StyleSheet.create({
    container: {
      marginTop: 4,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 8,
      backgroundColor: c.inputBg,
      maxHeight: 160,
      overflow: "hidden",
    },
    item: {
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    itemSelected: {
      backgroundColor: c.primaryMuted,
    },
  });
}
