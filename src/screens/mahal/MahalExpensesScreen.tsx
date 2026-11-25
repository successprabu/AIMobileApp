import React, { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { ActivityIndicator, Alert, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { Button, Chip, FAB, IconButton, Snackbar, Text, TextInput } from "react-native-paper";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { MainStackParamList } from "../../navigation/types";
import { useAppTheme } from "../../hooks/useAppTheme";
import { useAuth } from "../../context/AuthContext";
import { listMyMahals, PAY_METHODS, toDay, type Mahal } from "../../api/mahal";
import {
  deleteExpense, EXPENSE_CATEGORIES, getProfit, listExpenses, saveExpense, type Expense, type ExpenseList, type Profit,
} from "../../api/mahalOps";
import { FadeIn } from "../../components/mahal/MahalUi";
import Sheet from "../../components/ui/Sheet";
import { useTx } from "../../i18n/site";
import { formatInr } from "../../utils/formatCurrency";

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#0ea5e9", "#8b5cf6", "#14b8a6", "#e11d48", "#64748b", "#a3a3a3"];

const shiftMonth = (ym: string, n: number) => {
  const d = new Date(`${ym}-01T00:00:00`);
  d.setMonth(d.getMonth() + n);
  return toDay(d).slice(0, 7);
};
const monthLabel = (ym: string, month: "long" | "short" = "long") =>
  new Date(`${ym}-01T00:00:00`).toLocaleDateString("en-IN", { month, year: "numeric" });

type Form = { id: number; mahalId: number; expenseDate: Date; category: string; amount: string; description: string; payMethod: string };

/**
 * Hall expenses (electricity, cleaning, wages, repairs…) and, for the owner, profit per month: rent from that month's
 * events minus that month's expenses. Staff logins can add and edit expenses but don't see income or profit.
 */
export default function MahalExpensesScreen() {
  const { theme } = useAppTheme();
  const c = theme.colors;
  const tx = useTx();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { user } = useAuth();
  const staff = user?.userType === "MS";
  const [month, setMonth] = useState(() => toDay(new Date()).slice(0, 7));
  const [mahalId, setMahalId] = useState<number | undefined>(undefined);
  const [mahals, setMahals] = useState<Mahal[]>([]);
  const [data, setData] = useState<ExpenseList | null>(null);
  const [profit, setProfit] = useState<Profit | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState<Form | null>(null);
  const [picking, setPicking] = useState(false);
  const [saving, setSaving] = useState(false);

  useLayoutEffect(() => navigation.setOptions({ title: tx(staff ? "Expenses" : "Expenses and profit") }), [navigation, tx, staff]);

  useEffect(() => {
    void listMyMahals().then((r) => r.ok && setMahals((r.data ?? []).filter((m) => m.isActive !== false)));
  }, []);

  const load = useCallback(async () => {
    setData(null);
    const [ex, pr] = await Promise.all([
      listExpenses({ mahalId, from: `${month}-01`, to: `${shiftMonth(month, 1)}-01` }),
      staff ? Promise.resolve(null) : getProfit(month, mahalId),
    ]);
    setRefreshing(false);
    if (ex.ok && ex.data) setData(ex.data);
    else {
      setData({ items: [], total: 0, byCategory: [], categories: [] });
      setMessage(tx(ex.message));
    }
    setProfit(pr?.ok && pr.data ? pr.data : null);
  }, [month, mahalId, staff, tx]);

  useEffect(() => {
    void load();
  }, [load]);

  const categories = data?.categories?.length ? data.categories : EXPENSE_CATEGORIES;
  const color = (cat: string) => COLORS[Math.max(0, categories.indexOf(cat)) % COLORS.length];

  const openNew = () =>
    setForm({ id: 0, mahalId: mahalId ?? mahals[0]?.id ?? 0, expenseDate: new Date(), category: categories[0], amount: "", description: "", payMethod: "Cash" });
  const openEdit = (e: Expense) =>
    setForm({ id: e.id, mahalId: e.mahalId, expenseDate: new Date(e.expenseDate), category: e.category, amount: String(e.amount), description: e.description ?? "", payMethod: e.payMethod ?? "Cash" });

  const save = async () => {
    if (!form) return;
    if (!(Number(form.amount) > 0)) {
      setMessage(tx("Enter the amount spent."));
      return;
    }
    setSaving(true);
    const r = await saveExpense({
      id: form.id, mahalId: form.mahalId, expenseDate: toDay(form.expenseDate), category: form.category,
      amount: Number(form.amount), description: form.description.trim(), payMethod: form.payMethod,
    });
    setSaving(false);
    setMessage(tx(r.message || (r.ok ? "Expense saved." : "Something went wrong. Please try again.")));
    if (r.ok) {
      setForm(null);
      void load();
    }
  };

  const remove = (e: Expense) =>
    Alert.alert(tx("Delete this expense?"), `${tx(e.category)} · ${formatInr(e.amount)}`, [
      { text: tx("Close"), style: "cancel" },
      {
        text: tx("Delete"),
        style: "destructive",
        onPress: async () => {
          const r = await deleteExpense(e.id);
          setMessage(tx(r.message));
          if (r.ok) void load();
        },
      },
    ]);

  const onDate = (e: DateTimePickerEvent, value?: Date) => {
    if (Platform.OS === "android") setPicking(false);
    if (e.type === "set" && value) setForm((f) => (f ? { ...f, expenseDate: value } : f));
  };

  const maxTrend = Math.max(1, ...(profit?.trend ?? []).flatMap((t) => [t.income, t.expenses]));

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 96 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} />}>
        <Text style={{ color: c.textMuted, marginBottom: 10 }}>{tx("Record what the hall spends. Profit = rent from events this month minus expenses.")}</Text>

        <View style={styles.monthRow}>
          <IconButton icon="chevron-left" onPress={() => setMonth((m) => shiftMonth(m, -1))} accessibilityLabel={tx("Previous month")} />
          <Text style={{ color: c.text, fontWeight: "800", fontSize: 16, minWidth: 150, textAlign: "center" }}>{monthLabel(month)}</Text>
          <IconButton icon="chevron-right" onPress={() => setMonth((m) => shiftMonth(m, 1))} accessibilityLabel={tx("Next month")} />
        </View>
        {mahals.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            <Chip selected={mahalId === undefined} onPress={() => setMahalId(undefined)} style={styles.chip}>{tx("All halls")}</Chip>
            {mahals.map((m) => (
              <Chip key={m.id} selected={mahalId === m.id} onPress={() => setMahalId(m.id)} style={styles.chip}>{m.mahalName}</Chip>
            ))}
          </ScrollView>
        )}

        {!staff && (
          <View style={styles.tiles}>
            <Figure label={tx("Events")} value={profit ? String(profit.events) : "—"} color={c.primary} icon="calendar-check" index={0} />
            <Figure label={tx("Income")} value={profit ? formatInr(profit.income) : "—"} color={c.success} icon="trending-up" index={1} />
            <Figure label={tx("Expenses")} value={data ? formatInr(data.total) : "—"} color={c.warning} icon="trending-down" index={2} />
            <Figure label={tx("Profit")} value={profit ? formatInr(profit.profit) : "—"} color={profit && profit.profit < 0 ? c.danger : c.success} icon="cash-check" index={3} />
          </View>
        )}

        {!staff && !!profit?.trend?.length && (
          <FadeIn index={4} style={[styles.card, { backgroundColor: c.card }]}>
            <Text style={[styles.title, { color: c.text }]}>{tx("Income and expenses, last 6 months")}</Text>
            <View style={styles.chart}>
              {profit.trend.map((t) => (
                <View key={t.month} style={styles.barCol}>
                  <View style={styles.bars}>
                    <View style={[styles.bar, { height: `${(t.income / maxTrend) * 100}%`, backgroundColor: c.success }]} />
                    <View style={[styles.bar, { height: `${(t.expenses / maxTrend) * 100}%`, backgroundColor: c.warning }]} />
                  </View>
                  <Text style={{ color: c.textMuted, fontSize: 10 }}>{new Date(`${t.month}-01T00:00:00`).toLocaleDateString("en-IN", { month: "short" })}</Text>
                </View>
              ))}
            </View>
            <View style={{ flexDirection: "row", gap: 14, marginTop: 6 }}>
              <Legend color={c.success} label={tx("Income")} />
              <Legend color={c.warning} label={tx("Expenses")} />
            </View>
          </FadeIn>
        )}

        {!staff && (profit?.perHall?.length ?? 0) > 1 && (
          <FadeIn index={5} style={[styles.card, { backgroundColor: c.card }]}>
            <Text style={[styles.title, { color: c.text }]}>{tx("Profit by hall")}</Text>
            {profit!.perHall.map((h) => (
              <View key={h.mahalId} style={[styles.line, { borderColor: c.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.text, fontWeight: "700" }} numberOfLines={1}>{h.mahalName}</Text>
                  <Text style={{ color: c.textMuted, fontSize: 12 }}>{tx("{{n}} events", { n: h.events })} · {formatInr(h.income)} − {formatInr(h.expenses)}</Text>
                </View>
                <Text style={{ color: h.profit < 0 ? c.danger : c.success, fontWeight: "800" }}>{formatInr(h.profit)}</Text>
              </View>
            ))}
          </FadeIn>
        )}

        <FadeIn index={6} style={[styles.card, { backgroundColor: c.card }]}>
          <Text style={[styles.title, { color: c.text }]}>{tx("Where the money went")}</Text>
          {!data ? <ActivityIndicator color={c.primary} /> : data.byCategory.length ? data.byCategory.map((x) => (
            <View key={x.category} style={{ marginBottom: 8 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ color: c.text }}>{tx(x.category)}</Text>
                <Text style={{ color: c.text, fontWeight: "700" }}>{formatInr(x.amount)}</Text>
              </View>
              <View style={[styles.track, { backgroundColor: c.border }]}>
                <View style={{ width: `${(x.amount / Math.max(1, data.total)) * 100}%`, height: "100%", borderRadius: 3, backgroundColor: color(x.category) }} />
              </View>
            </View>
          )) : <Text style={{ color: c.textMuted }}>{tx("No expenses this month.")}</Text>}
        </FadeIn>

        <FadeIn index={7} style={[styles.card, { backgroundColor: c.card }]}>
          <Text style={[styles.title, { color: c.text }]}>{tx("Expenses in {{month}}", { month: monthLabel(month) })}</Text>
          {!data ? (
            <ActivityIndicator color={c.primary} />
          ) : data.items.length === 0 ? (
            <View style={{ alignItems: "center", padding: 12 }}>
              <MaterialCommunityIcons name="receipt-text-outline" size={40} color={c.textMuted} />
              <Text style={{ color: c.text, fontWeight: "800", marginTop: 6 }}>{tx("No expenses yet")}</Text>
              <Text style={{ color: c.textMuted, textAlign: "center" }}>{tx("Add electricity, cleaning, wages and other costs to see your real profit.")}</Text>
            </View>
          ) : (
            data.items.map((e) => (
              <Pressable key={e.id} onPress={() => openEdit(e)} style={[styles.line, { borderColor: c.border }]} accessibilityRole="button" accessibilityLabel={tx("Edit")}>
                <View style={[styles.dot, { backgroundColor: color(e.category) }]} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ color: c.text, fontWeight: "700" }} numberOfLines={1}>{e.description || tx(e.category)}</Text>
                  <Text style={{ color: c.textMuted, fontSize: 12 }} numberOfLines={1}>
                    {tx(e.category)} · {new Date(e.expenseDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    {mahals.length > 1 && e.mahalName ? ` · ${e.mahalName}` : ""}{e.payMethod ? ` · ${tx(e.payMethod)}` : ""}
                  </Text>
                </View>
                <Text style={{ color: c.text, fontWeight: "800" }}>{formatInr(e.amount)}</Text>
                {!staff && <IconButton icon="delete-outline" iconColor={c.danger} size={20} onPress={() => remove(e)} accessibilityLabel={tx("Delete")} />}
              </Pressable>
            ))
          )}
        </FadeIn>
      </ScrollView>

      <FAB icon="plus" label={tx("Add expense")} color="#fff" style={[styles.fab, { backgroundColor: c.primary }]} onPress={openNew} disabled={!mahals.length} />

      <Sheet visible={!!form} title={tx(form?.id ? "Edit expense" : "Add expense")} onClose={() => !saving && setForm(null)}>
        {form && (
          <View style={{ gap: 12 }}>
            {mahals.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {mahals.map((m) => (
                  <Chip key={m.id} selected={form.mahalId === m.id} onPress={() => setForm({ ...form, mahalId: m.id })} style={styles.chip}>{m.mahalName}</Chip>
                ))}
              </ScrollView>
            )}
            <Text style={{ color: c.textMuted }}>{tx("What for")}</Text>
            <View style={styles.wrap}>
              {categories.map((cat) => (
                <Chip key={cat} selected={form.category === cat} onPress={() => setForm({ ...form, category: cat })}>{tx(cat)}</Chip>
              ))}
            </View>
            <TextInput mode="outlined" label={tx("Amount (₹)")} keyboardType="numeric" value={form.amount} autoFocus={!form.id}
              onChangeText={(v) => setForm({ ...form, amount: v.replace(/[^\d.]/g, "") })} left={<TextInput.Affix text="₹" />} />
            <Button mode="outlined" icon="calendar" onPress={() => setPicking(true)} contentStyle={{ justifyContent: "flex-start" }}>
              {tx("Date")}: {form.expenseDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </Button>
            {picking && <DateTimePicker value={form.expenseDate} mode="date" onChange={onDate} maximumDate={new Date()} />}
            {picking && Platform.OS === "ios" && <Button onPress={() => setPicking(false)}>{tx("Done")}</Button>}
            <Text style={{ color: c.textMuted }}>{tx("Paid by")}</Text>
            <View style={styles.wrap}>
              {PAY_METHODS.map((m) => (
                <Chip key={m} selected={form.payMethod === m} onPress={() => setForm({ ...form, payMethod: m })}>{tx(m)}</Chip>
              ))}
            </View>
            <TextInput mode="outlined" label={tx("Note (optional)")} value={form.description} maxLength={300} multiline
              onChangeText={(v) => setForm({ ...form, description: v })} />
            <Button mode="contained" onPress={save} loading={saving} disabled={saving} style={{ borderRadius: 12, marginTop: 4 }}>{tx("Save")}</Button>
          </View>
        )}
      </Sheet>
      <Snackbar visible={!!message} onDismiss={() => setMessage("")}>{message}</Snackbar>
    </View>
  );
}

function Figure({ label, value, color, icon, index }: { label: string; value: string; color: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; index: number }) {
  const { theme } = useAppTheme();
  const c = theme.colors;
  return (
    <FadeIn index={index} style={[styles.figure, { backgroundColor: c.card, borderTopColor: color }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <MaterialCommunityIcons name={icon} size={16} color={color} />
        <Text style={{ color: c.textMuted, fontSize: 12 }}>{label}</Text>
      </View>
      <Text style={{ color: c.text, fontWeight: "800", fontSize: 18, marginTop: 4 }} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
    </FadeIn>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  const { theme } = useAppTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: color }} />
      <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  monthRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 6 },
  chip: { marginRight: 6 },
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 14 },
  figure: { flexGrow: 1, flexBasis: "45%", borderRadius: 14, padding: 14, borderTopWidth: 3, elevation: 1, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  card: { borderRadius: 16, padding: 16, marginBottom: 14, elevation: 1, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  title: { fontWeight: "800", fontSize: 16, marginBottom: 10 },
  chart: { flexDirection: "row", alignItems: "flex-end", height: 140, gap: 6 },
  barCol: { flex: 1, height: "100%", alignItems: "center", justifyContent: "flex-end", gap: 4 },
  bars: { flex: 1, width: "100%", flexDirection: "row", alignItems: "flex-end", justifyContent: "center", gap: 2 },
  bar: { width: "38%", minHeight: 2, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  track: { height: 6, borderRadius: 3, overflow: "hidden", marginTop: 4 },
  line: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  dot: { width: 10, height: 10, borderRadius: 5 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  fab: { position: "absolute", right: 16, bottom: 20 },
});
