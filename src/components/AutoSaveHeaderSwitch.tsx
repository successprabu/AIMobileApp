import React from "react";
import { StyleSheet, View } from "react-native";
import { Switch, Text } from "react-native-paper";
import { useTranslation } from "react-i18next";
import { useAutoSave } from "../context/AutoSaveContext";

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
    marginRight: 2,
    color: "#fff",
    fontWeight: "600",
  },
});
