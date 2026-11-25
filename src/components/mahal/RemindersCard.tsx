import React, { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useAppTheme } from "../../hooks/useAppTheme";
import { fmtRange } from "../../api/mahal";
import { listReminders, markReminder, type Reminder, type ReminderKind } from "../../api/mahalOps";
import { hallMessage, openWhatsApp } from "../../utils/hallMessages";
import { useMessageLang, useTx } from "../../i18n/site";
import { formatInr } from "../../utils/formatCurrency";
import { FadeIn } from "./MahalUi";

type Icon = keyof typeof MaterialCommunityIcons.glyphMap;
const KIND: Record<ReminderKind, { label: string; icon: Icon; color: string }> = {
  tomorrow: { label: "Event tomorrow", icon: "calendar-alert", color: "#0ea5e9" },
  balance: { label: "Balance due", icon: "cash-clock", color: "#f59e0b" },
  thanks: { label: "Say thank you", icon: "heart-outline", color: "#e11d48" },
  moitech: { label: "Offer Moitech free", icon: "hand-heart-outline", color: "#6366f1" },
};

/**
 * "Send today" on the mahal dashboard: WhatsApp reminders (event tomorrow, balance due, thank-you) and the free Moitech
 * offer. One tap opens WhatsApp with the message ready (in English or Tamil) and marks it sent.
 */
export default function RemindersCard({ onMessage }: { onMessage: (m: string) => void }) {
  const { theme } = useAppTheme();
  const c = theme.colors;
  const tx = useTx();
  const appLang = useMessageLang();
  const [lang, setLang] = useState<"en" | "ta">(appLang);
  const [items, setItems] = useState<Reminder[] | null>(null);
  const [error, setError] = useState("");

  useFocusEffect(
    useCallback(() => {
      void listReminders().then((r) => {
        setItems(r.ok ? r.data ?? [] : []);
        setError(r.ok ? "" : r.message);
      });
    }, [])
  );

  const send = async (r: Reminder) => {
    const opened = await openWhatsApp(r.phone, hallMessage(r.kind, r, lang));
    if (!opened) {
      onMessage(tx("Could not open WhatsApp."));
      return;
    }
    setItems((list) => (list ?? []).filter((x) => !(x.bookingId === r.bookingId && x.kind === r.kind)));
    void markReminder(r.bookingId, r.kind);
  };

  return (
    <View style={[styles.card, { backgroundColor: c.card }]}>
      <View style={styles.head}>
        <MaterialCommunityIcons name="bell-ring-outline" size={20} color={c.primary} />
        <Text style={{ color: c.text, fontWeight: "800", fontSize: 16, flex: 1 }}>
          {tx("Send today")}{items?.length ? ` · ${items.length}` : ""}
        </Text>
        {(["en", "ta"] as const).map((l) => (
          <Pressable key={l} onPress={() => setLang(l)} accessibilityRole="button" accessibilityLabel={tx("Message language")}
            style={[styles.lang, { borderColor: c.primary, backgroundColor: lang === l ? c.primary : "transparent" }]}>
            <Text style={{ color: lang === l ? "#fff" : c.primary, fontWeight: "700", fontSize: 12 }}>{l === "en" ? "EN" : "தமிழ்"}</Text>
          </Pressable>
        ))}
      </View>
      {items === null ? (
        <ActivityIndicator color={c.primary} style={{ margin: 12 }} />
      ) : error ? (
        <Text style={{ color: c.textMuted }}>{tx(error)}</Text>
      ) : items.length === 0 ? (
        <Text style={{ color: c.textMuted }}>{tx("All caught up. Reminders for upcoming events appear here.")}</Text>
      ) : (
        items.slice(0, 12).map((r, i) => {
          const k = KIND[r.kind] ?? KIND.tomorrow;
          return (
            <FadeIn key={`${r.kind}-${r.bookingId}`} index={i} style={[styles.row, { backgroundColor: `${k.color}10` }]}>
              <View style={[styles.icon, { backgroundColor: `${k.color}26` }]}>
                <MaterialCommunityIcons name={k.icon} size={20} color={k.color} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ color: c.text, fontWeight: "700" }} numberOfLines={1}>{tx(k.label)} · {r.customerName}</Text>
                <Text style={{ color: c.textMuted, fontSize: 12 }} numberOfLines={1}>
                  {fmtRange(r.fromDate, r.toDate)} · {r.mahalName}{r.kind === "balance" ? ` · ${formatInr(r.balance)}` : ""}
                </Text>
              </View>
              <Pressable onPress={() => void send(r)} accessibilityRole="button" accessibilityLabel={`${tx("Send")} ${r.customerName}`}
                style={({ pressed }) => [styles.send, { opacity: pressed ? 0.8 : 1 }]}>
                <MaterialCommunityIcons name="whatsapp" size={18} color="#fff" />
                <Text style={{ color: "#fff", fontWeight: "800" }}>{tx("Send")}</Text>
              </Pressable>
            </FadeIn>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, padding: 16, marginBottom: 14, elevation: 1, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  head: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  lang: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: 12, marginBottom: 8 },
  icon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  send: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#16a34a", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, minHeight: 40 },
});
