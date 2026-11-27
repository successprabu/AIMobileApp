import React, { useCallback, useEffect, useState } from "react";
import { AppState, Pressable, StyleSheet, View } from "react-native";
import { IconButton, Text } from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { useAppTheme } from "../hooks/useAppTheme";
import Sheet from "./ui/Sheet";
import { PillButton } from "./ui/AuthUi";
import { listGuestEntries, type GuestEntry } from "../api/moitech";
import { getMahalSummary, type Booking } from "../api/mahal";

type Item = { key: string; title: string; sub: string };

/**
 * DigiMoi / Mahal bell: guest moi entries waiting to be accepted (family and helpers) and new hall booking
 * requests (hall owner and staff). Checks every 2 minutes and when the app comes back.
 */
export default function MySuccessBell({ tint }: { tint: string }) {
  const { user } = useAuth();
  const { theme } = useAppTheme();
  const c = theme.colors;
  const navigation = useNavigation<{ navigate: (n: string) => void }>();
  const type = user?.userType ?? "";
  const kind: "moi" | "mahal" | null = type === "AU" || type === "NU" ? "moi" : type === "MU" || type === "MS" ? "mahal" : null;
  const functionId = Number(user?.functionId) || 0;
  const [items, setItems] = useState<Item[]>([]);
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      if (kind === "moi" && functionId) {
        const r = await listGuestEntries(functionId, "Pending");
        if (!r.ok || !r.data) return;
        setCount(r.data.pending);
        setItems(r.data.items.slice(0, 10).map((g: GuestEntry) => ({ key: `g${g.id}`, title: `💐 ${g.name} (${g.villageName})`, sub: `₹${Math.round(g.amount).toLocaleString("en-IN")} · ${g.payMode}` })));
      } else if (kind === "mahal") {
        const r = await getMahalSummary();
        if (!r.ok || !r.data) return;
        setCount(r.data.pendingRequests);
        setItems(r.data.pending.slice(0, 10).map((b: Booking) => ({ key: `b${b.id}`, title: `🏛️ ${b.customerName} · ${b.eventType ?? ""}`, sub: `${new Date(b.fromDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} · ${b.mahalName ?? ""}` })));
      }
    } catch {
      /* the bell is optional */
    }
  }, [kind, functionId]);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 120_000);
    const sub = AppState.addEventListener("change", (st) => st === "active" && void load());
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [load]);

  if (!kind) return null;
  const target = kind === "moi" ? "GuestEntries" : "MahalBookings";
  return (
    <View>
      <IconButton icon={count ? "bell-ring" : "bell-outline"} iconColor={tint} onPress={() => { setOpen(true); void load(); }} accessibilityLabel={`Notifications, ${count} new`} />
      {count ? (
        <View style={styles.badge} pointerEvents="none">
          <Text style={styles.badgeText}>{count > 9 ? "9+" : count}</Text>
        </View>
      ) : null}
      <Sheet visible={open} title={kind === "moi" ? `🔔 Guest entries waiting (${count})` : `🔔 New booking requests (${count})`} onClose={() => setOpen(false)}>
        {items.length ? (
          items.map((i) => (
            <Pressable key={i.key} onPress={() => { setOpen(false); navigation.navigate(target); }} style={[styles.item, { borderColor: c.border }]}>
              <Text style={{ color: c.text, fontWeight: "700" }}>{i.title}</Text>
              <Text style={{ color: c.textMuted, fontSize: 12 }}>{i.sub}</Text>
            </Pressable>
          ))
        ) : (
          <Text style={{ color: c.textMuted }}>{kind === "moi" && !functionId ? "Choose the active function first." : "🎉 Nothing waiting."}</Text>
        )}
        <PillButton
          label={kind === "moi" ? "Open guest entries" : "Open bookings"}
          icon={kind === "moi" ? "account-multiple-check" : "calendar-check"}
          onPress={() => {
            setOpen(false);
            navigation.navigate(target);
          }}
          style={{ marginTop: 14 }}
        />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { position: "absolute", top: 6, right: 6, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: "#f59e0b", alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  badgeText: { color: "#1f1300", fontSize: 11, fontWeight: "800" },
  item: { borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 10 },
});
