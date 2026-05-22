import React from "react";
import { StyleSheet, View } from "react-native";
import { Switch, Text } from "react-native-paper";
import { useTranslation } from "react-i18next";
import { useAutoSave } from "../context/AutoSaveContext";

/** Header top-right toggle for form auto-save. */
export default function AutoSaveHeaderSwitch() {
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
        onValueChange={setAutoSaveEnabled}
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
