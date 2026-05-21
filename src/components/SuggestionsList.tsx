import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

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
          <Text variant="bodyMedium">{item}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    backgroundColor: "#fff",
    maxHeight: 160,
    overflow: "hidden",
  },
  item: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e0e0e0",
  },
  itemSelected: {
    backgroundColor: "#e8f4fc",
  },
});
