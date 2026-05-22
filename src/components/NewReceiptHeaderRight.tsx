import React from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { useTranslation } from "react-i18next";
import AutoSaveHeaderSwitch from "./AutoSaveHeaderSwitch";
import HeaderContrastSwitch from "./HeaderContrastSwitch";

type Props = {
  translateEnabled: boolean;
  onTranslateChange: (value: boolean) => void;
  /** When user turns translation suggestions on. */
  onTranslateEnabled?: () => void;
  onAutoSaveEnabled?: () => void;
};

/** New Receipt header: translation + auto-save toggles (pink header contrast). */
export default function NewReceiptHeaderRight({
  translateEnabled,
  onTranslateChange,
  onTranslateEnabled,
  onAutoSaveEnabled,
}: Props) {
  const { t } = useTranslation();

  return (
    <View style={styles.col}>
      <View style={styles.row}>
        <Text variant="labelSmall" style={styles.label} numberOfLines={1}>
          {t("header_translate_short", { defaultValue: "Translate" })}
        </Text>
        <HeaderContrastSwitch
          value={translateEnabled}
          onValueChange={(value) => {
            onTranslateChange(value);
            if (value) onTranslateEnabled?.();
          }}
          accessibilityLabel={t("enableTranslationSuggestions")}
        />
      </View>
      <AutoSaveHeaderSwitch onEnabled={onAutoSaveEnabled} />
    </View>
  );
}

const styles = StyleSheet.create({
  col: {
    alignItems: "flex-end",
    marginRight: 4,
    gap: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    maxWidth: 130,
  },
  label: {
    marginRight: 4,
    color: "#fff",
    fontWeight: "600",
  },
});
