import React from "react";
import { View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

/** For a card heading (Card.Title `left`): a coloured rounded icon chip. */
export function sectionIcon(icon: keyof typeof MaterialCommunityIcons.glyphMap, color: string) {
  return function SectionIconChip() {
    return (
      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: `${color}1f`, alignItems: "center", justifyContent: "center" }}>
        <MaterialCommunityIcons name={icon} size={22} color={color} />
      </View>
    );
  };
}

/** Bold card heading text, used with sectionIcon. */
export const sectionTitleStyle = { fontWeight: "800" as const, fontSize: 17 };
