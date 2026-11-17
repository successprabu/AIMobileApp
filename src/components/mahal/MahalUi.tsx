import React, { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppTheme } from "../../hooks/useAppTheme";
import { effectiveStatus, fmtRange, STATUS_LABEL, type Booking, type MahalBookingStatus } from "../../api/mahal";
import { formatInr } from "../../utils/formatCurrency";

/** Fades and slides its children in; `index` staggers items in a list. */
export function FadeIn({ index = 0, style, children }: { index?: number; style?: StyleProp<ViewStyle>; children: React.ReactNode }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 320, delay: Math.min(index, 10) * 45, useNativeDriver: true }).start();
  }, [index, v]);
  return (
    <Animated.View style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }]}>
      {children}
    </Animated.View>
  );
}

const EVENT_STYLE: Record<string, { icon: keyof typeof MaterialCommunityIcons.glyphMap; color: string }> = {
  Marriage: { icon: "heart-outline", color: "#e11d48" },
  Reception: { icon: "party-popper", color: "#7c3aed" },
  Engagement: { icon: "diamond-stone", color: "#db2777" },
  Birthday: { icon: "cake-variant-outline", color: "#f59e0b" },
  "Baby shower": { icon: "baby-face-outline", color: "#10b981" },
  "Ear piercing": { icon: "star-four-points-outline", color: "#0ea5e9" },
  "House warming": { icon: "home-heart", color: "#f97316" },
  Corporate: { icon: "briefcase-outline", color: "#475569" },
  Other: { icon: "calendar-star", color: "#6366f1" },
};
export const eventStyle = (type?: string | null) => EVENT_STYLE[type ?? ""] ?? EVENT_STYLE.Other;

export function StatusPill({ status }: { status: MahalBookingStatus }) {
  const { theme } = useAppTheme();
  const c = theme.colors;
  const color: Record<MahalBookingStatus, string> = {
    Pending: c.warning,
    Confirmed: c.success,
    Completed: "#0ea5e9",
    Cancelled: c.textMuted,
    Rejected: c.danger,
  };
  const col = color[status];
  return (
    <View style={[styles.pill, { borderColor: col, backgroundColor: `${col}1a` }]}>
      <Text style={[styles.pillText, { color: col }]}>{STATUS_LABEL[status]}</Text>
    </View>
  );
}

/** One booking in a list: date tile, customer, event, status and balance. */
export function BookingCard({ booking: b, index, onPress }: { booking: Booking; index: number; onPress: () => void }) {
  const { theme } = useAppTheme();
  const c = theme.colors;
  const ev = eventStyle(b.eventType);
  const d = new Date(b.fromDate);
  const status = effectiveStatus(b);
  return (
    <FadeIn index={index}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Booking for ${b.customerName}`}
        style={({ pressed }) => [styles.card, { backgroundColor: c.card, borderLeftColor: ev.color, opacity: pressed ? 0.85 : 1 }]}
      >
        <View style={[styles.dateTile, { backgroundColor: `${ev.color}1a` }]}>
          <Text style={[styles.dateMonth, { color: ev.color }]}>{d.toLocaleDateString("en-IN", { month: "short" }).toUpperCase()}</Text>
          <Text style={[styles.dateDay, { color: c.text }]}>{d.getDate()}</Text>
          <Text style={[styles.dateWeek, { color: c.textMuted }]}>{d.toLocaleDateString("en-IN", { weekday: "short" })}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={styles.row}>
            <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>{b.customerName}</Text>
            {b.source === "online" && <MaterialCommunityIcons name="web" size={14} color={c.textMuted} />}
          </View>
          <Text style={{ color: c.textMuted, fontSize: 13 }} numberOfLines={1}>
            {b.eventType || "Event"} · {fmtRange(b.fromDate, b.toDate)}
          </Text>
          <Text style={{ color: c.textMuted, fontSize: 12 }} numberOfLines={1}>{b.mahalName}</Text>
        </View>
        <View style={{ alignItems: "flex-end", gap: 6 }}>
          <StatusPill status={status} />
          {b.balance > 0 && status !== "Rejected" && status !== "Cancelled" && (
            <Text style={{ color: c.warning, fontWeight: "700", fontSize: 12 }}>{formatInr(b.balance)} due</Text>
          )}
        </View>
      </Pressable>
    </FadeIn>
  );
}

/** Small labelled number tile used on the mahal dashboard. */
export function StatTile({ label, value, icon, color, onPress }: { label: string; value: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; color: string; onPress?: () => void }) {
  const { theme } = useAppTheme();
  const c = theme.colors;
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [styles.tile, { backgroundColor: c.card, opacity: pressed ? 0.85 : 1 }]}>
      <View style={[styles.tileIcon, { backgroundColor: `${color}1f` }]}>
        <MaterialCommunityIcons name={icon} size={20} color={color} />
      </View>
      <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 8 }}>{label}</Text>
      <Text style={{ color: c.text, fontSize: 20, fontWeight: "800" }}>{value}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 2 },
  pillText: { fontSize: 12, fontWeight: "700" },
  card: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 14, borderLeftWidth: 4, marginBottom: 10, elevation: 1, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  dateTile: { width: 54, alignItems: "center", paddingVertical: 6, borderRadius: 10 },
  dateMonth: { fontSize: 11, fontWeight: "800" },
  dateDay: { fontSize: 20, fontWeight: "800", lineHeight: 24 },
  dateWeek: { fontSize: 11 },
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: { fontWeight: "700", fontSize: 15, flexShrink: 1 },
  tile: { flex: 1, minWidth: 150, padding: 14, borderRadius: 14, elevation: 1, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  tileIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
});
