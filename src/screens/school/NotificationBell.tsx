import React, { useCallback, useEffect, useState } from "react";
import { AppState, StyleSheet, View } from "react-native";
import { IconButton, Text } from "react-native-paper";
import { bell, type BellItem } from "../../api/schoolErp";
import { parentCampus, parentCirculars } from "../../api/school";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Pressable } from "react-native";
import { useSchoolAuth } from "../../context/SchoolAuthContext";
import { useAppTheme } from "../../hooks/useAppTheme";
import Sheet from "../../components/ui/Sheet";
import { PillButton } from "../../components/ui/AuthUi";
import { openSchoolScreen } from "../../school/schoolMenu";
import { SCHOOL_GREEN, day } from "./schoolUi";

const SEEN_KEY = "parentBusAlertsSeen";
type ParentItem = { key: string; title: string; sub: string; section: "notices" | "bus" };

/** Parents: unread homework / circulars / exam notices and today's bus alerts; tap to open that part of the home page. */
function ParentBell() {
  const { theme } = useAppTheme();
  const c = theme.colors;
  const [items, setItems] = useState<ParentItem[]>([]);
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState<string[]>([]);

  const load = useCallback(async () => {
    try {
      const [posts, campus, seenRaw] = await Promise.all([parentCirculars().catch(() => []), parentCampus().catch(() => []), AsyncStorage.getItem(SEEN_KEY)]);
      const seenIds = seenRaw ? (JSON.parse(seenRaw) as string[]) : [];
      setSeen(seenIds);
      const today = new Date().toISOString().slice(0, 10);
      const label = { homework: "📚 Homework", exam: "📝 Exam", circular: "📢 Circular" } as const;
      // One list for all children (a notice for two classes shows once).
      const all = [...new Map(posts.flatMap((g) => g.items).map((p) => [p.id, p])).values()];
      const unread: ParentItem[] = all
        .filter((p) => !p.read)
        .slice(0, 15)
        .map((p) => ({ key: `c${p.id}`, title: `${label[p.type]}: ${p.title}`, sub: `${day(p.date)}${p.dueDate ? ` · submit by ${day(p.dueDate)}` : ""}`, section: "notices" }));
      const alerts: ParentItem[] = campus
        .flatMap((x) => x.bus.alerts)
        .filter((a) => a.at.slice(0, 10) === today)
        .map((a) => ({ key: `b${a.id}`, title: `🚌 ${a.routeName}: ${a.text}`, sub: new Date(a.at).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }), section: "bus" }));
      setItems([...alerts, ...unread]);
    } catch {
      /* the bell is optional */
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 120_000);
    const sub = AppState.addEventListener("change", (st) => st === "active" && void load());
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [load]);

  // Bus alerts count until the bell is opened; notices count until they are read on the home page.
  const count = items.filter((i) => i.section === "notices" || !seen.includes(i.key)).length;
  const openBell = () => {
    setOpen(true);
    const busKeys = items.filter((i) => i.section === "bus").map((i) => i.key);
    if (busKeys.length) {
      const next = [...new Set([...seen, ...busKeys])].slice(-100);
      setSeen(next);
      void AsyncStorage.setItem(SEEN_KEY, JSON.stringify(next));
    }
  };
  const go = (section: "notices" | "bus") => {
    setOpen(false);
    openSchoolScreen("SchoolHome", { section, at: Date.now() });
  };

  return (
    <View>
      <IconButton icon={count ? "bell-ring" : "bell-outline"} iconColor="#fff" onPress={openBell} accessibilityLabel={`Notifications, ${count} new`} />
      {count ? (
        <View style={styles.badge} pointerEvents="none">
          <Text style={styles.badgeText}>{count > 9 ? "9+" : count}</Text>
        </View>
      ) : null}
      <Sheet visible={open} title={`🔔 Notifications (${items.length})`} onClose={() => setOpen(false)}>
        {items.length ? (
          items.map((i) => (
            <Pressable key={i.key} onPress={() => go(i.section)} style={[styles.item, { borderColor: c.border }]}>
              <Text style={{ color: c.text, fontWeight: "700" }}>{i.title}</Text>
              <Text style={{ color: c.textMuted, fontSize: 12 }}>{i.sub}</Text>
            </Pressable>
          ))
        ) : (
          <Text style={{ color: c.textMuted }}>🎉 You are all caught up.</Text>
        )}
        <PillButton label="Open notices & homework" icon="bullhorn-outline" color={SCHOOL_GREEN} onPress={() => go("notices")} style={{ marginTop: 14 }} />
      </Sheet>
    </View>
  );
}

/** Header bell. Staff: new website enquiries (like the website's bell). Parents: see ParentBell. */
export default function NotificationBell() {
  const { school: who } = useSchoolAuth();
  if (who?.user.role === "parent") return <ParentBell />;
  return <StaffBell />;
}

function StaffBell() {
  const { school } = useSchoolAuth();
  const { theme } = useAppTheme();
  const c = theme.colors;
  const sid = school?.user.schoolId ?? "";
  const allowed = !!school && school.user.role !== "parent" && sid !== "*" && (school.user.role === "superadmin" || school.permissions.includes("enquiries"));
  const [data, setData] = useState<{ count: number; items: BellItem[] }>({ count: 0, items: [] });
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    if (!allowed) return;
    try {
      setData(await bell(sid));
    } catch {
      /* the bell is optional */
    }
  }, [allowed, sid]);
  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 120_000);
    const sub = AppState.addEventListener("change", (st) => st === "active" && void load());
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [load]);

  if (!allowed) return null;
  return (
    <View>
      <IconButton icon={data.count ? "bell-ring" : "bell-outline"} iconColor="#fff" onPress={() => { setOpen(true); void load(); }} accessibilityLabel={`Notifications, ${data.count} new`} />
      {data.count ? (
        <View style={styles.badge} pointerEvents="none">
          <Text style={styles.badgeText}>{data.count > 9 ? "9+" : data.count}</Text>
        </View>
      ) : null}
      <Sheet visible={open} title={`🔔 New enquiries (${data.count})`} onClose={() => setOpen(false)}>
        {data.items.length ? (
          data.items.map((e) => (
            <View key={e.id} style={[styles.item, { borderColor: c.border }]}>
              <Text style={{ color: c.text, fontWeight: "700" }}>
                {e.type === "admission" ? "🎒 Admission" : e.type === "alumni" ? "🎓 Alumni" : "✉️ Message"} · {e.parentName}
              </Text>
              <Text style={{ color: c.textMuted, fontSize: 12 }}>
                {e.grade ? `${e.grade} · ` : ""}
                {day(e.createdAt)}
              </Text>
            </View>
          ))
        ) : (
          <Text style={{ color: c.textMuted }}>🎉 No new enquiries.</Text>
        )}
        <PillButton
          label="Open enquiries"
          icon="inbox-arrow-down"
          color={SCHOOL_GREEN}
          onPress={() => {
            setOpen(false);
            openSchoolScreen("SchoolAdmissions");
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
