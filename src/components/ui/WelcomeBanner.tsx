import React from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Rise } from "./AuthUi";
import type { HeroArtKind } from "./Motion";
import { Floaty, greeting } from "../../screens/school/schoolUi";
import { useAppTheme } from "../../hooks/useAppTheme";

/** Floating emoji per product: DigiMoi (moi, gifts, lamps) or Mahal (hall, rings, celebration). */
const EMOJI: Record<string, [string, string, string, string]> = {
  mahal: ["🏛️", "💍", "🎉", "🪔"],
  success: ["💐", "🪔", "🎁", "💰"],
};

/**
 * The "welcome" card at the top of a dashboard (header colour of the chosen theme): greeting by time of day, name,
 * role, today's date and gently floating festive emoji. Extra content (e.g. buttons) goes in `children`.
 */
export default function WelcomeBanner({
  label,
  name,
  role,
  art = "success",
  style,
  children,
}: {
  label: string;
  name: string;
  role?: string;
  art?: HeroArtKind;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}) {
  const { theme } = useAppTheme();
  const e = EMOJI[art] ?? EMOJI.success;
  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
  return (
    <Rise style={[styles.card, { backgroundColor: theme.colors.header }, style]}>
      <View style={[styles.blob, { width: 200, height: 200, borderRadius: 100, top: -110, left: -60, backgroundColor: "rgba(255,255,255,0.12)" }]} />
      <View style={[styles.blob, { width: 160, height: 160, borderRadius: 80, bottom: -90, right: -30, backgroundColor: "rgba(0,0,0,0.14)" }]} />
      <Floaty emoji={e[0]} size={30} delay={0} style={{ right: 18, top: 14 }} />
      <Floaty emoji={e[1]} size={24} delay={400} style={{ right: 70, top: 44 }} />
      <Floaty emoji={e[2]} size={26} delay={800} style={{ right: 24, top: 74 }} />
      <Floaty emoji={e[3]} size={20} delay={1200} style={{ right: 80, top: 92 }} />
      <View style={styles.row}>
        <View style={{ flex: 1, minWidth: 0, paddingRight: 104 }}>
          <Text style={styles.label}>{greeting()} · {label}</Text>
          <Text style={styles.name} numberOfLines={1} adjustsFontSizeToFit>
            {name || "—"}
          </Text>
          {role ? (
            <View style={styles.role}>
              <MaterialCommunityIcons name="shield-account-outline" size={13} color="#fff" />
              <Text style={styles.roleText} numberOfLines={1}>{role}</Text>
            </View>
          ) : null}
          <Text style={styles.date}>📅 {today}</Text>
        </View>
      </View>
      {children}
    </Rise>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 18,
    marginBottom: 18,
    overflow: "hidden",
    shadowColor: "#7a0a3a",
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  blob: { position: "absolute" },
  row: { flexDirection: "row", alignItems: "center" },
  label: { color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: "700" },
  name: { color: "#fff", fontSize: 24, fontWeight: "900", marginTop: 2 },
  role: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, marginTop: 8 },
  roleText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  date: { color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: "600", marginTop: 8 },
});
