import React, { useCallback, useEffect, useState } from "react";
import { AppState, StyleSheet, View } from "react-native";
import { IconButton, Text } from "react-native-paper";
import { bell, type BellItem } from "../../api/schoolErp";
import { useSchoolAuth } from "../../context/SchoolAuthContext";
import { useAppTheme } from "../../hooks/useAppTheme";
import Sheet from "../../components/ui/Sheet";
import { PillButton } from "../../components/ui/AuthUi";
import { openSchoolScreen } from "../../school/schoolMenu";
import { SCHOOL_GREEN, day } from "./schoolUi";

/** Header bell: new website enquiries (like the website's notification bell). Checks every 2 minutes. */
export default function NotificationBell() {
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
