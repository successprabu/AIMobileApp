import React from "react";
import { Platform, StyleSheet } from "react-native";
import { Switch } from "react-native-paper";
import { PRIMARY_PINK_DARK } from "../theme/themes";

/** Switch colors that stay visible on the pink navigation header. */
const TRACK_OFF = "rgba(255, 255, 255, 0.4)";
const TRACK_ON = "#ffffff";
const THUMB_OFF = "#ffffff";
const THUMB_ON = PRIMARY_PINK_DARK;

type Props = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  accessibilityLabel: string;
};

export default function HeaderContrastSwitch({
  value,
  onValueChange,
  accessibilityLabel,
}: Props) {
  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      accessibilityLabel={accessibilityLabel}
      thumbColor={value ? THUMB_ON : THUMB_OFF}
      trackColor={{ false: TRACK_OFF, true: TRACK_ON }}
      ios_backgroundColor={TRACK_OFF}
      color={TRACK_ON}
      style={Platform.OS === "android" ? styles.androidSwitch : undefined}
    />
  );
}

const styles = StyleSheet.create({
  androidSwitch: {
    marginVertical: -4,
  },
});
