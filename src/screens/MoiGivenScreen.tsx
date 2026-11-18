import React, { useCallback, useLayoutEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { Button, FAB, HelperText, Searchbar, Snackbar, Text, TextInput } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useAppTheme } from "../hooks/useAppTheme";
import { FadeIn } from "../components/mahal/MahalUi";
import Sheet from "../components/ui/Sheet";
import { formatDisplayDate, isValidIsoDate, normalizeDateInput } from "../utils/date";
import {
  STATUS_LABEL,
  advice,
  compareGiven,
  deleteGiven,
  inr,
  linkGiven,
  listGiven,
  saveGiven,
  type GiveCompare,
  type GivePerson,
  type GiveStatus,
  type GivenEntry,
} from "../api/moiGiven";

const TABS: ("" | GiveStatus)[] = ["", "theyMore", "weMore", "onlyWe", "onlyThey", "even"];
const fullName = (x: { initial?: string | null; name: string }) => [x.initial, x.name].filter(Boolean).join(" ");
const fmt = (v?: string | null) => (v ? new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "");

type Form = { id: number; name: string; initial: string; place: string; phone: string; amount: string; eventName: string; eventDate: string; remarks: string };
const emptyForm: Form = { id: 0, name: "", initial: "", place: "", phone: "", amount: "", eventName: "", eventDate: "", remarks: "" };

/** Moi we gave (admin): give & take per person, and the list of moi we gave at other people's functions. */
export default function MoiGivenScreen() {
  const { t } = useTranslation();
  const { theme } = useAppTheme();
  const c = theme.colors;
  const navigation = useNavigation();

  const [view, setView] = useState<"compare" | "list">("compare");
  const [functionId, setFunctionId] = useState<number | undefined>(undefined);
  const [status, setStatus] = useState<"" | GiveStatus>("");
  const [search, setSearch] = useState("");
  const [cmp, setCmp] = useState<GiveCompare | null>(null);
  const [rows, setRows] = useState<{ items: GivenEntry[]; all: number; totalAmount: number }>({ items: [], all: 0, totalAmount: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [linking, setLinking] = useState<GivePerson | null>(null);
  const [linkQ, setLinkQ] = useState("");
  const [pickFunction, setPickFunction] = useState(false);
  const [message, setMessage] = useState("");

  useLayoutEffect(() => navigation.setOptions({ title: t("moiGiven", { defaultValue: "Moi we gave" }) }), [navigation, t]);

  const load = useCallback(async () => {
    const [a, b] = await Promise.all([compareGiven(functionId), listGiven()]);
    setLoading(false);
    setRefreshing(false);
    if (a.ok && a.data) setCmp(a.data);
    else setMessage(a.message);
    if (b.ok && b.data) setRows(b.data);
  }, [functionId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const people = useMemo(() => {
    const s = search.trim().toLowerCase();
    return (cmp?.items ?? []).filter((p) => (!status || p.status === status) && (!s || `${fullName(p)} ${p.place ?? ""} ${p.phone ?? ""}`.toLowerCase().includes(s)));
  }, [cmp, status, search]);
  const listed = useMemo(() => {
    const s = search.trim().toLowerCase();
    return rows.items.filter((g) => !s || `${fullName(g)} ${g.place ?? ""} ${g.phone ?? ""} ${g.eventName ?? ""}`.toLowerCase().includes(s));
  }, [rows, search]);
  const candidates = useMemo(() => {
    const s = linkQ.trim().toLowerCase();
    return (cmp?.items ?? []).filter((p) => p.status === "onlyThey" && (!s || `${fullName(p)} ${p.place ?? ""} ${p.phone ?? ""}`.toLowerCase().includes(s)));
  }, [cmp, linkQ]);
  const toReturn = (cmp?.items ?? []).filter((p) => p.status === "theyMore" || p.status === "onlyThey").length;
  const fnName = cmp?.functions.find((f) => f.id === functionId)?.functionName;

  const edit = (g?: GivenEntry) => {
    setErrors({});
    setForm(
      g
        ? { id: g.id, name: g.name, initial: g.initial ?? "", place: g.place ?? "", phone: g.phone ?? "", amount: String(g.amount), eventName: g.eventName ?? "", eventDate: g.eventDate ? formatDisplayDate(g.eventDate.slice(0, 10)) : "", remarks: g.remarks ?? "" }
        : emptyForm
    );
  };

  const save = async () => {
    if (!form) return;
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Enter the name";
    if (!(Number(form.amount) > 0)) e.amount = "Enter the amount you gave";
    if (form.phone && form.phone.replace(/\D/g, "").length < 10) e.phone = "Enter a 10 digit mobile number, or leave it empty";
    const iso = form.eventDate ? normalizeDateInput(form.eventDate) : "";
    if (form.eventDate && !isValidIsoDate(iso)) e.eventDate = "Use DD/MM/YYYY";
    setErrors(e);
    if (Object.keys(e).length || saving) return;
    setSaving(true);
    const r = await saveGiven({ id: form.id, name: form.name, initial: form.initial, place: form.place, phone: form.phone, amount: Number(form.amount), eventName: form.eventName, eventDate: iso || null, remarks: form.remarks });
    setSaving(false);
    if (!r.ok) return setMessage(r.message);
    setForm(null);
    setMessage(form.id ? "Entry updated" : "Saved");
    void load();
  };

  const remove = (g: GivenEntry) =>
    Alert.alert("Delete this entry?", `${fullName(g)}: ${inr(g.amount)}. It is removed from the list but stays in History.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const r = await deleteGiven(g.id);
          setMessage(r.ok ? "Deleted. It stays in History." : r.message);
          void load();
        },
      },
    ]);

  const link = async (target: GivePerson) => {
    if (!linking) return;
    const r = await linkGiven(linking.gave[0].id, target.got[0].id);
    setLinking(null);
    setMessage(r.ok ? `Linked with ${fullName(target)}` : r.message);
    void load();
  };

  const set = (k: keyof Form) => (v: string) => setForm((f) => (f ? { ...f, [k]: v } : f));

  const header = (
    <View style={{ gap: 10, marginBottom: 6 }}>
      <View style={styles.stats}>
        {[
          { label: "We gave", value: inr(cmp?.totals.weGave ?? 0), icon: "call-made" as const, color: "#8b5cf6" },
          { label: fnName ? "They gave here" : "They gave us", value: inr(cmp?.totals.theyGave ?? 0), icon: "call-received" as const, color: "#16a34a" },
          { label: "People", value: String(cmp?.counts.all ?? 0), icon: "account-group-outline" as const, color: "#0ea5e9" },
          { label: "To return", value: String(toReturn), icon: "gift-outline" as const, color: "#d97706" },
        ].map((s, i) => (
          <FadeIn key={s.label} index={i} style={[styles.stat, { backgroundColor: c.card }]}>
            <MaterialCommunityIcons name={s.icon} size={18} color={s.color} />
            <Text style={{ color: c.textMuted, fontSize: 12 }}>{s.label}</Text>
            <Text style={{ color: c.text, fontWeight: "900", fontSize: 17 }}>{s.value}</Text>
          </FadeIn>
        ))}
      </View>
      <View style={[styles.seg, { backgroundColor: c.card, borderColor: c.border }]}>
        {(["compare", "list"] as const).map((v) => {
          const on = view === v;
          return (
            <Pressable key={v} onPress={() => setView(v)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={[styles.segBtn, on && { backgroundColor: c.primary }]}>
              <Text style={{ color: on ? "#fff" : c.text, fontWeight: "800" }}>{v === "compare" ? "Give & take" : `We gave (${rows.all})`}</Text>
            </Pressable>
          );
        })}
      </View>
      <Searchbar placeholder="Search name, place or mobile" value={search} onChangeText={setSearch} style={{ borderRadius: 14, backgroundColor: c.card }} />
      {view === "compare" ? (
        <>
          <Pressable onPress={() => setPickFunction(true)} style={[styles.select, { backgroundColor: c.card, borderColor: c.border }]} accessibilityRole="button">
            <MaterialCommunityIcons name="calendar-heart" size={18} color={c.primary} />
            <Text style={{ color: c.text, flex: 1, fontWeight: "600" }} numberOfLines={1}>{fnName ?? "All our functions"}</Text>
            <MaterialCommunityIcons name="chevron-down" size={20} color={c.textMuted} />
          </Pressable>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {TABS.map((k) => {
              const on = status === k;
              const col = k ? STATUS_LABEL[k].color : c.primary;
              return (
                <Pressable key={k || "all"} onPress={() => setStatus(k)} style={[styles.pill, { backgroundColor: on ? col : c.card, borderColor: on ? col : c.border }]}>
                  <Text style={{ color: on ? "#fff" : c.text, fontWeight: on ? "800" : "600", fontSize: 13 }}>
                    {k ? STATUS_LABEL[k].label : "All"} ({(k ? cmp?.counts[k] : cmp?.counts.all) ?? 0})
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </>
      ) : (
        <Text style={{ color: c.text, fontWeight: "800" }}>Total {inr(rows.totalAmount)}</Text>
      )}
    </View>
  );

  const renderPerson = ({ item: p, index }: { item: GivePerson; index: number }) => {
    const meta = STATUS_LABEL[p.status];
    const expanded = open === p.key;
    return (
      <FadeIn index={index % 20}>
        <View style={[styles.card, { backgroundColor: c.card, borderLeftColor: meta.color }]}>
          <Pressable onPress={() => setOpen(expanded ? null : p.key)} accessibilityRole="button" accessibilityState={{ expanded }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={[styles.avatar, { backgroundColor: `${meta.color}22` }]}>
                <Text style={{ color: meta.color, fontWeight: "900" }}>{(p.name || "?").charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ color: c.text, fontWeight: "800" }} numberOfLines={1}>{fullName(p)}</Text>
                <Text style={{ color: c.textMuted, fontSize: 12 }} numberOfLines={1}>{[p.place, p.phone].filter(Boolean).join(" · ")}</Text>
              </View>
              <View style={[styles.badge, { borderColor: meta.color }]}>
                <Text style={{ color: meta.color, fontSize: 11, fontWeight: "800" }}>{meta.label}</Text>
              </View>
            </View>
            <View style={styles.nums}>
              {[
                ["We gave", inr(p.weGave), c.text],
                ["They gave", inr(p.theyGave), c.text],
                ["Difference", `${p.difference > 0 ? "+" : p.difference < 0 ? "−" : ""}${inr(Math.abs(p.difference))}`, p.difference > 0 ? "#16a34a" : p.difference < 0 ? "#d97706" : c.text],
              ].map(([l, v, col]) => (
                <View key={l}>
                  <Text style={{ color: c.textMuted, fontSize: 11 }}>{l}</Text>
                  <Text style={{ color: col, fontWeight: "900" }}>{v}</Text>
                </View>
              ))}
              <MaterialCommunityIcons name={expanded ? "chevron-up" : "chevron-down"} size={22} color={c.textMuted} />
            </View>
          </Pressable>
          <Text style={{ color: c.textMuted, marginTop: 6, lineHeight: 19 }}>{advice(p)}</Text>
          {p.status === "onlyWe" && (
            <Button compact mode="outlined" icon="link-variant" style={{ alignSelf: "flex-start", marginTop: 8, borderRadius: 10 }} onPress={() => { setLinkQ(""); setLinking(p); }}>
              Gave under another name? Link
            </Button>
          )}
          {expanded && (
            <View style={{ marginTop: 10, gap: 4 }}>
              <Text style={{ color: c.text, fontWeight: "800" }}>We gave</Text>
              {p.gave.length ? p.gave.map((g) => (
                <View key={g.id} style={[styles.line, { borderColor: c.border }]}>
                  <Text style={{ color: c.text, flex: 1 }}>{g.eventName || "Their function"}{g.eventDate ? ` · ${fmt(g.eventDate)}` : ""}</Text>
                  <Text style={{ color: c.text, fontWeight: "700" }}>{inr(g.amount)}</Text>
                </View>
              )) : <Text style={{ color: c.textMuted }}>Nothing recorded.</Text>}
              <Text style={{ color: c.text, fontWeight: "800", marginTop: 6 }}>They gave at our functions</Text>
              {p.got.length ? p.got.map((g) => (
                <View key={g.id} style={[styles.line, { borderColor: c.border }]}>
                  <Text style={{ color: c.text, flex: 1 }}>{g.functionName || "Our function"}</Text>
                  <Text style={{ color: c.text, fontWeight: "700" }}>{inr(g.amount)}</Text>
                </View>
              )) : <Text style={{ color: c.textMuted }}>Nothing yet.</Text>}
            </View>
          )}
        </View>
      </FadeIn>
    );
  };

  const renderEntry = ({ item: g, index }: { item: GivenEntry; index: number }) => (
    <FadeIn index={index % 20}>
      <View style={[styles.row, { backgroundColor: c.card }]}>
        <View style={[styles.avatar, { backgroundColor: "#8b5cf622" }]}>
          <Text style={{ color: "#8b5cf6", fontWeight: "900" }}>{(g.name || "?").charAt(0).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ color: c.text, fontWeight: "800" }} numberOfLines={1}>{fullName(g)}</Text>
          <Text style={{ color: c.textMuted, fontSize: 12 }} numberOfLines={2}>{[g.place, g.phone, g.eventName, fmt(g.eventDate)].filter(Boolean).join(" · ")}</Text>
        </View>
        <Text style={{ color: c.text, fontWeight: "900" }}>{inr(g.amount)}</Text>
        <Pressable onPress={() => edit(g)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Edit ${g.name}`} style={{ padding: 4 }}>
          <MaterialCommunityIcons name="pencil-outline" size={20} color={c.primary} />
        </Pressable>
        <Pressable onPress={() => remove(g)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Delete ${g.name}`} style={{ padding: 4 }}>
          <MaterialCommunityIcons name="delete-outline" size={20} color={c.danger ?? "#dc2626"} />
        </Pressable>
      </View>
    </FadeIn>
  );

  const empty = loading ? (
    <ActivityIndicator style={{ marginTop: 40 }} color={c.primary} />
  ) : (
    <FadeIn style={{ alignItems: "center", padding: 28 }}>
      <MaterialCommunityIcons name="gift-open-outline" size={48} color={c.textMuted} />
      <Text style={{ color: c.text, fontWeight: "800", marginTop: 8 }}>{view === "compare" && (cmp?.items.length ?? 0) > 0 ? "No one here" : "Nothing yet"}</Text>
      <Text style={{ color: c.textMuted, textAlign: "center", marginTop: 4 }}>
        {view === "compare" && (cmp?.items.length ?? 0) > 0 ? "Try another filter." : "Add the moi you gave at other people's functions. Once they give at your function, you see them side by side."}
      </Text>
    </FadeIn>
  );

  const refresh = <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} />;

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      {view === "compare" ? (
        <FlatList data={people} keyExtractor={(p) => p.key} renderItem={renderPerson} ListHeaderComponent={header} ListEmptyComponent={empty} contentContainerStyle={{ padding: 16, paddingBottom: 96 }} refreshControl={refresh} keyboardShouldPersistTaps="handled" />
      ) : (
        <FlatList data={listed} keyExtractor={(g) => String(g.id)} renderItem={renderEntry} ListHeaderComponent={header} ListEmptyComponent={empty} contentContainerStyle={{ padding: 16, paddingBottom: 96 }} refreshControl={refresh} keyboardShouldPersistTaps="handled" />
      )}
      <FAB icon="plus" label="Moi we gave" color="#fff" style={[styles.fab, { backgroundColor: c.primary }]} onPress={() => edit()} />

      <Sheet visible={!!form} title={form?.id ? "Edit moi we gave" : "Add moi we gave"} onClose={() => setForm(null)}>
        {form && (
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <TextInput mode="outlined" label="Name *" value={form.name} onChangeText={set("name")} error={!!errors.name} />
            {!!errors.name && <HelperText type="error">{errors.name}</HelperText>}
            <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
              <TextInput mode="outlined" label="Surname" value={form.initial} onChangeText={set("initial")} style={{ flex: 1 }} />
              <TextInput mode="outlined" label="Place" value={form.place} onChangeText={set("place")} style={{ flex: 2 }} />
            </View>
            <TextInput mode="outlined" label="Mobile" keyboardType="phone-pad" value={form.phone} onChangeText={(v) => set("phone")(v.replace(/[^\d+ ]/g, "").slice(0, 15))} error={!!errors.phone} style={{ marginTop: 8 }} />
            <HelperText type={errors.phone ? "error" : "info"}>{errors.phone || "Best way to match them with what they give you"}</HelperText>
            <TextInput mode="outlined" label="Amount we gave *" keyboardType="numeric" value={form.amount} onChangeText={(v) => set("amount")(v.replace(/[^\d.]/g, ""))} left={<TextInput.Affix text="₹" />} error={!!errors.amount} />
            {!!errors.amount && <HelperText type="error">{errors.amount}</HelperText>}
            <TextInput mode="outlined" label="Their function" placeholder="e.g. Arun wedding" value={form.eventName} onChangeText={set("eventName")} style={{ marginTop: 8 }} />
            <TextInput mode="outlined" label="Date (DD/MM/YYYY)" keyboardType={Platform.OS === "ios" ? "numbers-and-punctuation" : "numeric"} value={form.eventDate} onChangeText={set("eventDate")} error={!!errors.eventDate} style={{ marginTop: 8 }} />
            {!!errors.eventDate && <HelperText type="error">{errors.eventDate}</HelperText>}
            <TextInput mode="outlined" label="Remarks" value={form.remarks} onChangeText={set("remarks")} multiline style={{ marginTop: 8 }} />
            <Button mode="contained" icon="content-save" onPress={save} loading={saving} disabled={saving} style={{ marginTop: 14, borderRadius: 12 }} contentStyle={{ height: 48 }}>Save</Button>
          </KeyboardAvoidingView>
        )}
      </Sheet>

      <Sheet visible={!!linking} title={linking ? `Link ${fullName(linking)}` : ""} onClose={() => setLinking(null)}>
        <Text style={{ color: c.textMuted, marginBottom: 10 }}>Choose the same person from those who gave at our functions. Their mobile (or name and place) is copied to our entry.</Text>
        <Searchbar placeholder="Search" value={linkQ} onChangeText={setLinkQ} style={{ borderRadius: 12, backgroundColor: c.background, marginBottom: 8 }} />
        {candidates.length ? candidates.slice(0, 50).map((p) => (
          <Pressable key={p.key} onPress={() => link(p)} style={({ pressed }) => [styles.pick, { borderColor: c.border, opacity: pressed ? 0.7 : 1 }]}>
            <Text style={{ color: c.text, fontWeight: "700" }}>{fullName(p)}</Text>
            <Text style={{ color: c.textMuted, fontSize: 12 }}>{[p.place, p.phone, `gave ${inr(p.theyGave)}`].filter(Boolean).join(" · ")}</Text>
          </Pressable>
        )) : <Text style={{ color: c.textMuted }}>No one found. Only people who gave at our functions and are not matched yet are listed.</Text>}
      </Sheet>

      <Sheet visible={pickFunction} title="Our function" onClose={() => setPickFunction(false)}>
        {[{ id: undefined as number | undefined, functionName: "All our functions" }, ...(cmp?.functions ?? [])].map((f) => (
          <Pressable key={String(f.id)} onPress={() => { setFunctionId(f.id); setPickFunction(false); }} style={({ pressed }) => [styles.pick, { borderColor: f.id === functionId ? c.primary : c.border, opacity: pressed ? 0.7 : 1 }]}>
            <Text style={{ color: c.text, fontWeight: f.id === functionId ? "800" : "600" }}>{f.functionName}</Text>
          </Pressable>
        ))}
      </Sheet>
      <Snackbar visible={!!message} onDismiss={() => setMessage("")}>{message}</Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  stat: { flexGrow: 1, flexBasis: "46%", borderRadius: 14, padding: 12, gap: 2, elevation: 1, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  seg: { flexDirection: "row", borderRadius: 14, borderWidth: 1, padding: 4 },
  segBtn: { flex: 1, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  select: { flexDirection: "row", alignItems: "center", gap: 8, height: 44, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12 },
  pill: { height: 34, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, justifyContent: "center" },
  card: { borderRadius: 14, padding: 14, marginBottom: 10, borderLeftWidth: 4, elevation: 1, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  badge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  nums: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 },
  line: { flexDirection: "row", gap: 8, paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 14, marginBottom: 8 },
  pick: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8 },
  fab: { position: "absolute", right: 16, bottom: 20 },
});
