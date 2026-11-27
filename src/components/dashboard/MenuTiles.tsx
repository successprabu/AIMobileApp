import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { appMenuFor } from "../../constants/appMenu";
import { screenEmoji } from "../../constants/screenIcons";
import { useAppTheme } from "../../hooks/useAppTheme";
import { Rise } from "../ui/AuthUi";

/** Groups shown on the dashboard (Home and More stay in the side menu). */
const SKIP = new Set(["home", "more"]);

/** Every screen of the role as emoji tiles, grouped like the side menu (same look as the School app's home). */
export default function MenuTiles({ role }: { role: string }) {
  const { t } = useTranslation();
  const { theme } = useAppTheme();
  const c = theme.colors;
  const navigation = useNavigation<{ navigate: (name: string, params?: object) => void }>();
  const groups = appMenuFor(role).filter((g) => !SKIP.has(g.key));
  let n = 0;
  return (
    <View>
      {groups.map((g) => (
        <View key={g.key}>
          <Text style={[styles.section, { color: c.textMuted }]}>{t(g.titleKey, { defaultValue: g.titleKey }).toUpperCase()}</Text>
          <View style={styles.grid}>
            {g.items.map((it) => {
              const e = screenEmoji(it.screen);
              const label = t(it.titleKey, { defaultValue: it.titleKey });
              return (
                <Rise key={`${g.key}-${it.screen}-${it.titleKey}`} delay={n++ * 25} style={styles.cell}>
                  <Pressable onPress={() => navigation.navigate(it.screen)} style={({ pressed }) => [styles.card, { backgroundColor: c.card, borderColor: c.border, opacity: pressed ? 0.85 : 1 }]} accessibilityRole="button" accessibilityLabel={label}>
                    <View style={[styles.tile, { backgroundColor: e.tint }]}>
                      <Text style={{ fontSize: 24 }}>{e.emoji}</Text>
                    </View>
                    <Text style={{ color: c.text, fontWeight: "700", textAlign: "center", fontSize: 12 }} numberOfLines={2}>
                      {label}
                    </Text>
                  </Pressable>
                </Rise>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { fontWeight: "800", fontSize: 12, letterSpacing: 0.8, marginTop: 12, marginBottom: 2, marginLeft: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -5 },
  cell: { width: "33.33%", padding: 5 },
  card: { borderWidth: 1, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 6, alignItems: "center", gap: 6, minHeight: 104 },
  tile: { width: 48, height: 48, borderRadius: 15, alignItems: "center", justifyContent: "center" },
});
