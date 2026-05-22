import React, { useLayoutEffect } from "react";
import { StyleSheet, View } from "react-native";
import { Card, Text, Switch, Divider } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import { useAppTheme } from "../hooks/useAppTheme";

export default function ThemeSettingsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { mode, theme, setMode, toggleMode } = useAppTheme();
  const c = theme.colors;

  useLayoutEffect(() => {
    navigation.setOptions({
      title: t("Theme Settings", { defaultValue: "Theme" }),
    });
  }, [navigation, t]);

  return (
    <View style={[styles.screen, { backgroundColor: c.background }]}>
      <Card style={[styles.card, { backgroundColor: c.card }]}>
        <Card.Content>
          <View style={styles.row}>
            <View style={[styles.iconWrap, { backgroundColor: c.primaryMuted }]}>
              <MaterialCommunityIcons name="white-balance-sunny" size={28} color={c.primary} />
            </View>
            <View style={styles.flex}>
              <Text variant="titleMedium" style={{ color: c.text }}>
                {t("mobile_theme_light", { defaultValue: "Light theme" })}
              </Text>
              <Text variant="bodySmall" style={{ color: c.textMuted }}>
                {t("mobile_theme_light_desc", { defaultValue: "Bright backgrounds for daytime use" })}
              </Text>
            </View>
            <Switch value={mode === "light"} onValueChange={() => void setMode("light")} />
          </View>

          <Divider style={[styles.div, { backgroundColor: c.border }]} />

          <View style={styles.row}>
            <View style={[styles.iconWrap, { backgroundColor: c.primaryMuted }]}>
              <MaterialCommunityIcons name="weather-night" size={28} color={c.secondary} />
            </View>
            <View style={styles.flex}>
              <Text variant="titleMedium" style={{ color: c.text }}>
                {t("mobile_theme_dark", { defaultValue: "Dark blue theme" })}
              </Text>
              <Text variant="bodySmall" style={{ color: c.textMuted }}>
                {t("mobile_theme_dark_desc", {
                  defaultValue: "Deep blue tones — easier on eyes at night",
                })}
              </Text>
            </View>
            <Switch value={mode === "dark"} onValueChange={() => void setMode("dark")} />
          </View>
        </Card.Content>
      </Card>

      <Card style={[styles.card, { backgroundColor: c.card }]}>
        <Card.Content>
          <Text variant="bodyMedium" style={{ color: c.textMuted }}>
            {t("mobile_theme_hint", {
              defaultValue: "Theme applies to menus, lists, forms, and dashboard.",
            })}
          </Text>
          <Text
            variant="labelLarge"
            style={{ color: c.primary, marginTop: 12 }}
            onPress={() => void toggleMode()}
          >
            {t("mobile_toggle_theme", { defaultValue: "Tap to switch quickly" })}
          </Text>
        </Card.Content>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16 },
  card: { marginBottom: 14, borderRadius: 16 },
  row: { flexDirection: "row", alignItems: "center" },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  flex: { flex: 1 },
  div: { marginVertical: 14 },
});
