import React, { useCallback, useLayoutEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { Searchbar, Snackbar, Switch, Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { useAppTheme } from "../hooks/useAppTheme";
import { useAuth } from "../context/AuthContext";
import type { AuthUser } from "../types/auth";
import type { MainStackParamList } from "../navigation/types";
import { FadeIn } from "../components/mahal/MahalUi";
import { listHistory, type HistoryItem, type HistoryPage } from "../api/history";

/**
 * Moitech history for the admin (same as the website): every receipt, expense, gift and "moi we gave" entry
 * that was added, edited, deleted or restored, and every handover. Read only.
 */

const ACTIONS: Record<string, { label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; color: string }> = {
  Added: { label: "Added", icon: "plus-circle-outline", color: "#16a34a" },
  Edited: { label: "Edited", icon: "pencil-outline", color: "#d97706" },
  Deleted: { label: "Deleted", icon: "delete-outline", color: "#dc2626" },
  Restored: { label: "Restored", icon: "restore", color: "#0ea5e9" },
  Handover: { label: "Handover", icon: "handshake-outline", color: "#8b5cf6" },
};
const TABS = ["", "Edited", "Deleted", "Added", "Restored", "Handover"];
const ENTITIES = [
  { value: "", label: "Everything" },
  { value: "Receipt", label: "Receipts" },
  { value: "Expense", label: "Expenses" },
  { value: "Others", label: "Gifts" },
  { value: "Handover", label: "Handovers" },
  { value: "Given", label: "Moi we gave" },
];
const ENTITY_WORD: Record<string, string> = { Receipt: "a receipt", Expense: "an expense", Others: "a gift", Handover: "a handover", Given: "a \"moi we gave\" entry" };
const FIELD_LABEL: Record<string, string> = {
  place: "Place", initial: "Surname", name: "Name", oldAmount: "Old amount", newAmount: "New amount", amount: "Amount",
  others: "Count", othersType: "Gift type", othersRemark: "Gift details", phone: "Mobile", remarks: "Remarks",
  returnStatus: "Return status", returnRemark: "Return remark", active: "Active", eventName: "Their function", eventDate: "Function date",
};
const MONEY = new Set(["oldAmount", "newAmount", "amount"]);
const PAGE = 50;

const inr = (n?: number | null) => `₹${Math.round(Number(n || 0)).toLocaleString("en-IN")}`;
const when = (v?: string) => (v ? new Date(v).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "numeric", minute: "2-digit" }) : "");
const show = (f: string, v?: string | null) => (v === null || v === undefined || v === "" ? "—" : MONEY.has(f) ? inr(Number(v)) : v);

export default function HistoryScreen() {
  const { t } = useTranslation();
  const { theme } = useAppTheme();
  const c = theme.colors;
  const navigation = useNavigation();
  const route = useRoute<RouteProp<MainStackParamList, "History">>();
  const { user } = useAuth();
  const me = user as AuthUser;

  const [action, setAction] = useState(route.params?.action ?? "");
  const [entity, setEntity] = useState("");
  const [person, setPerson] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [applied, setApplied] = useState("");
  const [allFunctions, setAllFunctions] = useState(false);
  const [data, setData] = useState<HistoryPage | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");

  useLayoutEffect(() => navigation.setOptions({ title: t("history", { defaultValue: "History" }) }), [navigation, t]);

  const load = useCallback(
    async (pageNo = 1) => {
      setLoading(true);
      const r = await listHistory({
        function_id: allFunctions ? undefined : me.functionId || undefined,
        action: action || undefined,
        entity: entity || undefined,
        changed_by: person ?? undefined,
        search: applied || undefined,
        page: pageNo,
        page_size: PAGE,
      });
      setLoading(false);
      setRefreshing(false);
      if (!r.ok || !r.data) return setMessage(r.message);
      setPage(pageNo);
      setData((d) => (pageNo === 1 || !d ? r.data! : { ...r.data!, items: [...d.items, ...r.data!.items] }));
    },
    [allFunctions, me.functionId, action, entity, person, applied]
  );

  useFocusEffect(
    useCallback(() => {
      void load(1);
    }, [load])
  );

  const counts = data?.counts;
  const countOf = (k: string) => (counts ? (k ? counts[k.toLowerCase() as keyof typeof counts] : counts.all) ?? 0 : 0);

  const header = (
    <View style={{ gap: 10, marginBottom: 6 }}>
      <View style={[styles.note, { backgroundColor: `${c.primary}12` }]}>
        <MaterialCommunityIcons name="lock-outline" size={18} color={c.primary} />
        <Text style={{ color: c.text, flex: 1, fontSize: 13 }}>Saved automatically for every add, edit, delete and handover. No one can change or delete it.</Text>
      </View>

      {!!data?.people?.length && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
          {data.people.map((p, i) => {
            const on = person === p.changedById;
            const flagged = p.deleted > 0 || p.reduced > 0;
            return (
              <FadeIn key={`${p.changedById}-${i}`} index={i}>
                <Pressable
                  onPress={() => setPerson(on ? null : p.changedById ?? null)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  style={[styles.person, { backgroundColor: on ? `${c.primary}14` : c.card, borderColor: on ? c.primary : flagged ? "#dc262680" : c.border }]}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={[styles.avatar, { backgroundColor: flagged ? "#dc2626" : c.primary }]}>
                      <Text style={{ color: "#fff", fontWeight: "800" }}>{(p.name || "?").charAt(0).toUpperCase()}</Text>
                    </View>
                    <Text style={{ color: c.text, fontWeight: "800", flexShrink: 1 }} numberOfLines={1}>{p.name || "Unknown user"}</Text>
                  </View>
                  <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 6 }}>
                    {p.added} added · <Text style={{ color: p.edited ? "#d97706" : c.textMuted, fontWeight: p.edited ? "800" : "400" }}>{p.edited} edited</Text> · <Text style={{ color: p.deleted ? "#dc2626" : c.textMuted, fontWeight: p.deleted ? "800" : "400" }}>{p.deleted} deleted</Text>
                  </Text>
                  {p.reduced > 0 && <Text style={{ color: "#dc2626", fontWeight: "800", marginTop: 4 }}>{inr(p.reduced)} reduced</Text>}
                </Pressable>
              </FadeIn>
            );
          })}
        </ScrollView>
      )}

      <Searchbar
        placeholder="Search name, place or person"
        value={search}
        onChangeText={setSearch}
        onSubmitEditing={() => setApplied(search.trim())}
        onClearIconPress={() => { setSearch(""); setApplied(""); }}
        style={{ borderRadius: 14, backgroundColor: c.card }}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {TABS.map((k) => {
          const on = action === k;
          const col = k ? ACTIONS[k].color : c.primary;
          return (
            <Pressable key={k || "all"} onPress={() => setAction(k)} style={[styles.pill, { backgroundColor: on ? col : c.card, borderColor: on ? col : c.border }]}>
              <Text style={{ color: on ? "#fff" : c.text, fontWeight: on ? "800" : "600", fontSize: 13 }}>{k ? ACTIONS[k].label : "All"} ({countOf(k)})</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, alignItems: "center" }}>
        {ENTITIES.map((e) => {
          const on = entity === e.value;
          return (
            <Pressable key={e.value || "all"} onPress={() => setEntity(e.value)} style={[styles.pillSm, { borderColor: on ? c.primary : c.border, backgroundColor: on ? `${c.primary}14` : "transparent" }]}>
              <Text style={{ color: on ? c.primary : c.textMuted, fontWeight: "700", fontSize: 12 }}>{e.label}</Text>
            </Pressable>
          );
        })}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginLeft: 4 }}>
          <Switch value={allFunctions} onValueChange={setAllFunctions} color={c.primary} accessibilityLabel="All functions" />
          <Text style={{ color: c.text, fontSize: 12 }}>All functions</Text>
        </View>
      </ScrollView>
    </View>
  );

  const renderItem = ({ item: h, index }: { item: HistoryItem; index: number }) => {
    const meta = ACTIONS[h.action] ?? ACTIONS.Edited;
    const reduced = h.entity !== "Handover" && h.amountBefore != null && (h.action === "Deleted" || (h.amountAfter != null && h.amountAfter < h.amountBefore));
    const same = h.amountBefore != null && h.amountAfter != null && Number(h.amountBefore) === Number(h.amountAfter);
    const gift = h.entity === "Others" && h.snapshot?.others ? [`${h.snapshot.others} ${h.snapshot.othersType ?? ""}`.trim(), h.snapshot.othersRemark].filter(Boolean).join(" · ") : "";
    const claimed = h.claimedBy && /^\d+$/.test(h.claimedBy) && h.changedById && Number(h.claimedBy) !== h.changedById;
    const what = h.entity === "Handover"
      ? h.action === "Handover" ? `recorded the handover from ${h.name || "a helper"}` : `changed the handover from ${h.name || "a helper"}`
      : `${meta.label.toLowerCase()} ${ENTITY_WORD[h.entity] ?? "an entry"}`;
    return (
      <FadeIn index={index % PAGE}>
        <View style={[styles.item, { backgroundColor: reduced ? "#dc26260a" : c.card, borderLeftColor: meta.color }]}>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={[styles.icon, { backgroundColor: `${meta.color}1f` }]}>
              <MaterialCommunityIcons name={meta.icon} size={20} color={meta.color} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ color: c.text }}>
                <Text style={{ fontWeight: "900" }}>{h.changedByName || "Unknown user"}</Text> {what}
              </Text>
              <Text style={{ color: c.textMuted, fontSize: 12 }}>
                {h.entity === "Handover" ? (h.place ? `Received by ${h.place} · ` : "") : [h.name, h.place].filter(Boolean).join(" · ") + " · "}
                {when(h.changedAt)}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                {!!gift && <Text style={[styles.tag, { color: "#8b5cf6", borderColor: "#8b5cf6" }]}>{gift}</Text>}
                {h.amountBefore != null && !same && (
                  <Text style={{ color: h.action === "Deleted" ? "#dc2626" : c.textMuted, fontWeight: "700", textDecorationLine: h.action === "Deleted" ? "line-through" : "none" }}>{inr(h.amountBefore)}</Text>
                )}
                {h.amountBefore != null && h.amountAfter != null && !same && <MaterialCommunityIcons name="arrow-right" size={14} color={c.textMuted} />}
                {h.amountAfter != null && !(gift && Number(h.amountAfter) === 0) && <Text style={{ color: c.text, fontWeight: "900" }}>{inr(h.amountAfter)}</Text>}
                {reduced && (
                  <View style={styles.less}>
                    <MaterialCommunityIcons name="alert-outline" size={12} color="#fff" />
                    <Text style={{ color: "#fff", fontWeight: "800", fontSize: 12 }}>{inr(Number(h.amountBefore) - (h.action === "Deleted" ? 0 : Number(h.amountAfter)))} less</Text>
                  </View>
                )}
                {claimed && <Text style={[styles.tag, { color: "#d97706", borderColor: "#d97706" }]}>Request said user #{h.claimedBy}</Text>}
              </View>
              {h.action !== "Deleted" && !!h.changes?.length && (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                  {h.changes.map((ch) => (
                    <Text key={ch.field} style={[styles.tag, { color: c.text, borderColor: c.border }]}>
                      <Text style={{ fontWeight: "800" }}>{FIELD_LABEL[ch.field] ?? ch.field}:</Text> <Text style={{ textDecorationLine: "line-through", color: c.textMuted }}>{show(ch.field, ch.from)}</Text> → {show(ch.field, ch.to)}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          </View>
        </View>
      </FadeIn>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <FlatList
        data={data?.items ?? []}
        keyExtractor={(h) => String(h.id)}
        renderItem={renderItem}
        ListHeaderComponent={header}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(1); }} />}
        onEndReachedThreshold={0.4}
        onEndReached={() => !loading && data && data.items.length < data.total && void load(page + 1)}
        ListEmptyComponent={
          loading ? <ActivityIndicator style={{ marginTop: 40 }} color={c.primary} /> : (
            <FadeIn style={{ alignItems: "center", padding: 28 }}>
              <MaterialCommunityIcons name="history" size={48} color={c.textMuted} />
              <Text style={{ color: c.text, fontWeight: "800", marginTop: 8 }}>Nothing here yet</Text>
              <Text style={{ color: c.textMuted, textAlign: "center", marginTop: 4 }}>Changes appear as soon as anyone adds, edits or deletes an entry or records a handover.</Text>
            </FadeIn>
          )
        }
        ListFooterComponent={loading && !!data?.items.length ? <ActivityIndicator color={c.primary} /> : null}
      />
      <Snackbar visible={!!message} onDismiss={() => setMessage("")}>{message}</Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  note: { flexDirection: "row", gap: 8, alignItems: "center", padding: 12, borderRadius: 12 },
  person: { width: 200, borderRadius: 14, borderWidth: 1.5, padding: 12 },
  avatar: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  pill: { height: 34, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, justifyContent: "center" },
  pillSm: { height: 30, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, justifyContent: "center" },
  item: { borderRadius: 14, padding: 12, marginBottom: 10, borderLeftWidth: 4, elevation: 1, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  icon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  tag: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, fontSize: 12, overflow: "hidden" },
  less: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#dc2626", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
});
