import React, { useCallback, useLayoutEffect, useState } from "react";
import { ActivityIndicator, FlatList, Linking, Pressable, RefreshControl, StyleSheet, View } from "react-native";
import { Button, FAB, Searchbar, Snackbar, Switch, Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useAppTheme } from "../../hooks/useAppTheme";
import type { MainStackParamList } from "../../navigation/types";
import { listCustomers, updateCustomer, USER_TYPE_LABEL, waDigits, type Customer } from "../../api/admin";
import { FadeIn } from "../../components/mahal/MahalUi";
import Sheet from "../../components/ui/Sheet";

type Nav = NativeStackNavigationProp<MainStackParamList>;
const FILTERS = [
  { key: "active", label: "Active", value: true },
  { key: "inactive", label: "Inactive", value: false },
  { key: "all", label: "All", value: undefined },
] as const;
const TYPE_COLOR: Record<string, string> = { SU: "#7c3aed", AU: "#6366f1", NU: "#0ea5e9", MU: "#f59e0b" };
const PAGE = 25;

/** Super admin: every client account, search, activate / deactivate, and register new ones. */
export default function ClientListScreen() {
  const { theme } = useAppTheme();
  const c = theme.colors;
  const navigation = useNavigation<Nav>();
  const [search, setSearch] = useState("");
  const [applied, setApplied] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("active");
  const [rows, setRows] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [open, setOpen] = useState<Customer | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useLayoutEffect(() => navigation.setOptions({ title: "Clients" }), [navigation]);

  const load = useCallback(
    async (pageNo = 1) => {
      setLoading(true);
      const digits = applied.replace(/\D/g, "");
      const isPhone = digits.length >= 4 && digits.length === applied.replace(/\s/g, "").length;
      const r = await listCustomers({
        id: null,
        customer_name: isPhone ? "" : applied,
        mobile: isPhone ? digits : "",
        isactive: FILTERS.find((f) => f.key === filter)?.value ?? null,
        current_page: pageNo,
        page_size: PAGE,
      });
      setLoading(false);
      setRefreshing(false);
      if (!r.ok || !r.data) {
        setMessage(r.message);
        return;
      }
      setRows((prev) => (pageNo === 1 ? r.data!.customers ?? [] : [...prev, ...(r.data!.customers ?? [])]));
      setTotal(r.data.totalRecords ?? 0);
      setPage(pageNo);
    },
    [applied, filter]
  );

  useFocusEffect(
    useCallback(() => {
      void load(1);
    }, [load])
  );

  const toggleActive = async (cust: Customer) => {
    setSaving(true);
    const updated = { ...cust, isActive: !cust.isActive };
    const r = await updateCustomer(updated);
    setSaving(false);
    if (r.ok) {
      setOpen(updated);
      setRows((rs) => rs.map((x) => (x.id === cust.id ? updated : x)));
      setMessage(updated.isActive ? "Account activated" : "Account deactivated");
    } else setMessage(r.message);
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <View style={{ padding: 16, paddingBottom: 6, gap: 10 }}>
        <Searchbar
          placeholder="Search name or mobile"
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={() => setApplied(search.trim())}
          onClearIconPress={() => { setSearch(""); setApplied(""); }}
          style={{ borderRadius: 14, backgroundColor: c.card }}
        />
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          {FILTERS.map((f) => {
            const on = filter === f.key;
            return (
              <Pressable key={f.key} onPress={() => setFilter(f.key)} style={[styles.pill, { backgroundColor: on ? c.primary : c.card, borderColor: on ? c.primary : c.border }]}>
                <Text style={{ color: on ? "#fff" : c.text, fontWeight: on ? "800" : "600" }}>{f.label}</Text>
              </Pressable>
            );
          })}
          <Text style={{ color: c.textMuted, marginLeft: "auto" }}>{total} clients</Text>
        </View>
      </View>
      <FlatList
        data={rows}
        keyExtractor={(x) => String(x.id)}
        contentContainerStyle={{ padding: 16, paddingTop: 6, paddingBottom: 96 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(1); }} />}
        onEndReachedThreshold={0.4}
        onEndReached={() => !loading && rows.length < total && void load(page + 1)}
        ListEmptyComponent={
          loading ? <ActivityIndicator style={{ marginTop: 40 }} color={c.primary} /> : (
            <FadeIn style={{ alignItems: "center", padding: 32 }}>
              <MaterialCommunityIcons name="account-search-outline" size={48} color={c.textMuted} />
              <Text style={{ color: c.text, fontWeight: "700", marginTop: 8 }}>No clients found</Text>
            </FadeIn>
          )
        }
        ListFooterComponent={loading && rows.length > 0 ? <ActivityIndicator color={c.primary} /> : null}
        renderItem={({ item, index }) => {
          const col = TYPE_COLOR[item.userType ?? ""] ?? c.primary;
          return (
            <FadeIn index={index % PAGE}>
              <Pressable onPress={() => setOpen(item)} style={({ pressed }) => [styles.card, { backgroundColor: c.card, opacity: pressed ? 0.85 : item.isActive ? 1 : 0.65 }]} accessibilityLabel={`Client ${item.name}`}>
                <View style={[styles.avatar, { backgroundColor: `${col}22` }]}>
                  <Text style={{ color: col, fontWeight: "800", fontSize: 18 }}>{(item.name || "?").trim().charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ color: c.text, fontWeight: "700", fontSize: 15 }} numberOfLines={1}>{item.name}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <MaterialCommunityIcons name={item.is_primary_phone_whatsup ? "whatsapp" : "phone-outline"} size={14} color={item.is_primary_phone_whatsup ? "#16a34a" : c.textMuted} />
                    <Text style={{ color: c.textMuted }}>{item.primary_phone}</Text>
                  </View>
                </View>
                <View style={{ alignItems: "flex-end", gap: 4 }}>
                  <View style={[styles.badge, { backgroundColor: `${col}1f` }]}>
                    <Text style={{ color: col, fontSize: 11, fontWeight: "800" }}>{USER_TYPE_LABEL[item.userType ?? ""] ?? item.userType}</Text>
                  </View>
                  {!item.isActive && <Text style={{ color: c.textMuted, fontSize: 11 }}>Inactive</Text>}
                </View>
              </Pressable>
            </FadeIn>
          );
        }}
      />
      <FAB icon="account-plus" label="Register client" color="#fff" style={[styles.fab, { backgroundColor: c.primary }]} onPress={() => navigation.navigate("RegisterClient", {})} />

      <Sheet visible={!!open} title={open?.name} onClose={() => setOpen(null)}>
        {open && (
          <>
            <Text style={{ color: c.textMuted }}>{USER_TYPE_LABEL[open.userType ?? ""] ?? open.userType} · {open.appName}</Text>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
              <Button mode="outlined" icon="phone" onPress={() => Linking.openURL(`tel:${open.primary_phone}`)}>Call</Button>
              <Button mode="outlined" icon="whatsapp" textColor="#16a34a" onPress={() => Linking.openURL(`https://wa.me/${waDigits(open.primary_phone)}`)}>WhatsApp</Button>
            </View>
            {[
              ["Mobile", open.primary_phone],
              ["Email", open.email],
              ["Registered", open.createdDt ? new Date(open.createdDt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : ""],
              ["Plan until", open.activated_To ? new Date(open.activated_To).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : ""],
            ]
              .filter(([, v]) => v)
              .map(([l, v]) => (
                <View key={l as string} style={styles.line}>
                  <Text style={{ color: c.textMuted }}>{l}</Text>
                  <Text style={{ color: c.text, fontWeight: "600" }}>{v as string}</Text>
                </View>
              ))}
            <View style={[styles.line, { marginTop: 10, alignItems: "center" }]}>
              <View>
                <Text style={{ color: c.text, fontWeight: "700" }}>Account active</Text>
                <Text style={{ color: c.textMuted, fontSize: 12 }}>Inactive accounts cannot sign in.</Text>
              </View>
              <Switch value={!!open.isActive} onValueChange={() => toggleActive(open)} disabled={saving} color={c.primary} />
            </View>
          </>
        )}
      </Sheet>
      <Snackbar visible={!!message} onDismiss={() => setMessage("")}>{message}</Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { height: 34, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, justifyContent: "center" },
  card: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 14, marginBottom: 10, elevation: 1, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  line: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, gap: 12 },
  fab: { position: "absolute", right: 16, bottom: 20 },
});
