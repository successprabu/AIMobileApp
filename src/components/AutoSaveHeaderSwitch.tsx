import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { Switch, Text } from "react-native-paper";
import { useTranslation } from "react-i18next";
import { useAutoSave } from "../context/AutoSaveContext";
import { PRIMARY_PINK_DARK } from "../theme/themes";

/** Contrasts with pink app header — white track when on, pink thumb. */
const TRACK_OFF = "rgba(255, 255, 255, 0.4)";
const TRACK_ON = "#ffffff";
const THUMB_OFF = "#ffffff";
const THUMB_ON = PRIMARY_PINK_DARK;

type Props = {
  /** Called when the user turns auto-save on (not on initial load). */
  onEnabled?: () => void;
};

/** Header top-right toggle for form auto-save. */
export default function AutoSaveHeaderSwitch({ onEnabled }: Props) {
  const { t } = useTranslation();
  const { autoSaveEnabled, setAutoSaveEnabled, loaded } = useAutoSave();

  if (!loaded) return null;

  return (
    <View style={styles.row}>
      <Text variant="labelSmall" style={styles.label} numberOfLines={1}>
        {t("autoSave")}
      </Text>
      <Switch
        value={autoSaveEnabled}
        onValueChange={(value) => {
          setAutoSaveEnabled(value);
          if (value) onEnabled?.();
        }}
        accessibilityLabel={t("autoSave")}
        thumbColor={autoSaveEnabled ? THUMB_ON : THUMB_OFF}
        trackColor={{ false: TRACK_OFF, true: TRACK_ON }}
        ios_backgroundColor={TRACK_OFF}
        color={TRACK_ON}
        style={Platform.OS === "android" ? styles.androidSwitch : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 4,
    maxWidth: 120,
  },
  label: {
    marginRight: 4,
    color: "#fff",
    fontWeight: "600",
  },
  androidSwitch: {
    marginVertical: -4,
  },
});
