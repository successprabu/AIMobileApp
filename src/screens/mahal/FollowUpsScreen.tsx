import React, { useCallback, useState } from "react";
import { ActivityIndicator, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { Snackbar, Text, TextInput } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useAppTheme } from "../../hooks/useAppTheme";
import { useThemedInputProps } from "../../hooks/useThemedInputProps";
import { FadeIn } from "../../components/mahal/MahalUi";
import { PillButton } from "../../components/ui/AuthUi";
import EmptyState from "../../components/ui/EmptyState";
import { fmtRange } from "../../api/mahal";
import { draftFollowUp, listFollowUps, markFollowUp, type FollowUp, type FollowUpKind } from "../../api/mahalAi";
import { formatInr } from "../../utils/formatCurrency";

type Icon = keyof typeof MaterialCommunityIcons.glyphMap;
const KIND: Record<FollowUpKind, { label: string; icon: Icon; color: string }> = {
  balance: { label: "Balance due", icon: "cash-clock", color: "#f59e0b" },
  reminder: { label: "Event soon", icon: "calendar-alert", color: "#0ea5e9" },
  pending: { label: "Waiting request", icon: "timer-sand", color: "#8b5cf6" },
  thanks: { label: "Say thank you", icon: "party-popper", color: "#10b981" },
};

const waDigits = (phone: string) => {
  const d = (phone || "").replace(/\D/g, "");
  return d.length === 10 ? `91${d}` : d;
};

function FollowUpCard({ item, index, ai, onChanged, onMessage }: { item: FollowUp; index: number; ai: boolean; onChanged: () => void; onMessage: (m: string) => void }) {
  const { theme } = useAppTheme();
  const c = theme.colors;
  const input = useThemedInputProps();
  const meta = KIND[item.kind] ?? KIND.reminder;
  const [lang, setLang] = useState<"en" | "ta">(item.lang === "ta" ? "ta" : "en");
  const [message, setMessage] = useState(item.message ?? "");
  const [busy, setBusy] = useState("");
  const done = item.status !== "Open";

  const write = async (l = lang) => {
    setBusy("draft");
    const r = await draftFollowUp(item.id, l);
    setBusy("");
    if (r.ok && r.data) setMessage(r.data.message);
    else onMessage(r.message);
  };
  const mark = async (status: "Sent" | "Skipped" | "Open") => {
    setBusy(status);
    const r = await markFollowUp(item.id, status, status === "Sent" ? message : undefined);
    setBusy("");
    if (r.ok) onChanged();
    else onMessage(r.message);
  };
  const send = async (how: "wa" | "sms") => {
    const text = encodeURIComponent(message.trim());
    try {
      if (how === "wa") {
        const app = `whatsapp://send?phone=${waDigits(item.phone)}&text=${text}`;
        await Linking.openURL((await Linking.canOpenURL(app)) ? app : `https://wa.me/${waDigits(item.phone)}?text=${text}`);
      } else {
        await Linking.openURL(`sms:${item.phone}?body=${text}`);
      }
      void mark("Sent");
    } catch {
      onMessage(how === "wa" ? "Could not open WhatsApp." : "Could not open Messages.");
    }
  };

  return (
    <FadeIn index={index} style={[styles.card, { backgroundColor: c.card, borderLeftColor: meta.color, opacity: done ? 0.6 : 1 }]}>
      <View style={styles.top}>
        <View style={[styles.icon, { backgroundColor: `${meta.color}1f` }]}>
          <MaterialCommunityIcons name={meta.icon} size={22} color={meta.color} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>{item.customerName}</Text>
            <View style={[styles.tag, { borderColor: meta.color }]}><Text style={{ color: meta.color, fontSize: 11, fontWeight: "800" }}>{meta.label}</Text></View>
            {done ? <MaterialCommunityIcons name="check-circle" size={18} color={c.success} /> : null}
          </View>
          <Text style={{ color: c.textMuted, fontSize: 13 }}>
            {item.mahalName} · {item.eventType ?? "Event"} · {fmtRange(item.fromDate, item.toDate ?? undefined)}
          </Text>
          {item.kind === "balance" ? <Text style={{ color: c.text, fontWeight: "800", marginTop: 2 }}>Balance {formatInr(item.balance ?? 0)}</Text> : null}
        </View>
      </View>

      {done ? (
        <Pressable onPress={() => mark("Open")} disabled={!!busy} style={styles.link} accessibilityRole="button">
          <MaterialCommunityIcons name="undo" size={16} color={c.primary} />
          <Text style={{ color: c.primary, fontWeight: "700" }}>{item.status === "Sent" ? "Sent · Undo" : "Skipped · Undo"}</Text>
        </Pressable>
      ) : (
        <>
          {message ? (
            <TextInput {...input} mode="outlined" multiline value={message} onChangeText={setMessage} outlineStyle={{ borderRadius: 14 }} style={[input.style, { marginTop: 10 }]} accessibilityLabel={`Message to ${item.customerName}`} />
          ) : (
            <Text style={{ color: c.textMuted, fontStyle: "italic", marginTop: 10 }}>
              {ai ? "Let AI write the message, then send it from WhatsApp or SMS." : "Write your message, then send it from WhatsApp or SMS."}
            </Text>
          )}
          <View style={styles.actions}>
            {ai ? (
              <>
                <View style={[styles.langs, { borderColor: c.border }]}>
                  {(["en", "ta"] as const).map((l) => (
                    <Pressable
                      key={l}
                      onPress={() => {
                        setLang(l);
                        if (message) void write(l);
                      }}
                      style={[styles.lang, lang === l && { backgroundColor: c.primary }]}
                      accessibilityRole="button"
                    >
                      <Text style={{ color: lang === l ? "#fff" : c.textMuted, fontWeight: "800", fontSize: 12 }}>{l === "en" ? "EN" : "தமிழ்"}</Text>
                    </Pressable>
                  ))}
                </View>
                <PillButton label={message ? "Rewrite" : "Write with AI"} icon="creation" variant={message ? "soft" : "solid"} onPress={() => write()} loading={busy === "draft"} disabled={!!busy} style={{ flex: 1 }} />
              </>
            ) : !message ? (
              <PillButton label="Write message" icon="pencil" variant="soft" onPress={() => setMessage(" ")} style={{ flex: 1 }} />
            ) : null}
          </View>
          <View style={styles.actions}>
            <PillButton label="WhatsApp" icon="whatsapp" color="#16a34a" onPress={() => send("wa")} disabled={!message.trim() || !!busy} style={{ flex: 1 }} />
            <PillButton label="SMS" icon="message-text-outline" variant="outline" onPress={() => send("sms")} disabled={!message.trim() || !!busy} style={{ flex: 1 }} />
            <Pressable onPress={() => mark("Skipped")} disabled={!!busy} style={[styles.skip, { borderColor: c.border }]} accessibilityRole="button" accessibilityLabel="Skip">
              {busy === "Skipped" ? <ActivityIndicator size="small" color={c.textMuted} /> : <MaterialCommunityIcons name="skip-next-outline" size={22} color={c.textMuted} />}
            </Pressable>
          </View>
        </>
      )}
    </FadeIn>
  );
}

/**
 * Who to message today: balance due before an event, events in the next two days, thank-yous after an event, and
 * requests waiting for a reply. The AI writes the text; the owner sends it from their own WhatsApp or SMS.
 */
export default function FollowUpsScreen() {
  const { theme } = useAppTheme();
  const c = theme.colors;
  const [items, setItems] = useState<FollowUp[]>([]);
  const [ai, setAi] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const r = await listFollowUps();
    setLoading(false);
    setRefreshing(false);
    if (r.ok && r.data) {
      setItems(r.data.items);
      setAi(r.data.aiEnabled);
    } else setMessage(r.message);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const open = items.filter((i) => i.status === "Open").length;

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} colors={[c.primary]} />}
      >
        <FadeIn style={[styles.banner, { backgroundColor: c.primaryMuted }]}>
          <MaterialCommunityIcons name="message-badge-outline" size={22} color={c.primary} />
          <Text style={{ color: c.text, flex: 1, fontWeight: "700" }}>
            {loading ? "Checking your bookings…" : open ? `${open} customer${open === 1 ? "" : "s"} to message today` : "All caught up for today"}
          </Text>
        </FadeIn>
        {loading ? (
          <ActivityIndicator color={c.primary} style={{ marginTop: 30 }} />
        ) : items.length === 0 ? (
          <EmptyState icon="message-check-outline" text="No one to message today. Balance reminders, event reminders and thank-yous will show up here." />
        ) : (
          items.map((item, i) => <FollowUpCard key={item.id} item={item} index={i} ai={ai} onChanged={load} onMessage={setMessage} />)
        )}
      </ScrollView>
      <Snackbar visible={!!message} onDismiss={() => setMessage("")} duration={4000}>{message}</Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 16, marginBottom: 14 },
  card: { borderRadius: 18, padding: 14, marginBottom: 12, borderLeftWidth: 4, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  top: { flexDirection: "row", gap: 12 },
  icon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  name: { fontSize: 16, fontWeight: "900", flexShrink: 1 },
  tag: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 1 },
  actions: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  langs: { flexDirection: "row", borderWidth: 1, borderRadius: 999, padding: 3 },
  lang: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999 },
  skip: { width: 46, height: 46, borderRadius: 23, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  link: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 10 },
});
