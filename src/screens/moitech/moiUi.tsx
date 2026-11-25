import React from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useAppTheme } from "../../hooks/useAppTheme";

/** Shared bits for the Moitech family screens. */
export const moiStyles = StyleSheet.create({
  card: { borderRadius: 16, padding: 14, marginBottom: 12, elevation: 1, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  fab: { position: "absolute", right: 16, bottom: 20 },
  stat: { flex: 1, borderRadius: 14, padding: 12, minWidth: 140 },
});

export function Empty({ icon, title, text }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; title: string; text?: string }) {
  const { theme } = useAppTheme();
  const c = theme.colors;
  return (
    <View style={{ alignItems: "center", padding: 24 }}>
      <MaterialCommunityIcons name={icon} size={48} color={c.textMuted} />
      <Text style={{ color: c.text, fontWeight: "800", marginTop: 6, textAlign: "center" }}>{title}</Text>
      {!!text && <Text style={{ color: c.textMuted, textAlign: "center", marginTop: 4 }}>{text}</Text>}
    </View>
  );
}

export function Stat({ label, value, color }: { label: string; value: string | number; color: string }) {
  const { theme } = useAppTheme();
  return (
    <View style={[moiStyles.stat, { backgroundColor: theme.colors.card, borderLeftWidth: 4, borderLeftColor: color }]}>
      <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>{label}</Text>
      <Text style={{ color: theme.colors.text, fontWeight: "800", fontSize: 20 }}>{String(value)}</Text>
    </View>
  );
}

export const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch] as string));

/** Makes a PDF from HTML on the phone and opens the share sheet (WhatsApp, print, save…). */
export async function sharePdf(html: string, title: string): Promise<void> {
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: title, UTI: "com.adobe.pdf" });
  else await Print.printAsync({ uri });
}

export const dayText = (d?: string | null) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "");
