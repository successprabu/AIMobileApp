import React, { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { Button, Chip, IconButton, Snackbar, Text } from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { MainStackParamList } from "../../navigation/types";
import { useAppTheme } from "../../hooks/useAppTheme";
import { listMyMahals, type Mahal } from "../../api/mahal";
import { getReport, type Report } from "../../api/mahalPlus";
import { FadeIn } from "../../components/mahal/MahalUi";
import { openWhatsApp } from "../../utils/hallMessages";
import { sharePdfFromHtml, shareWorkbook } from "../../export/reportExport";
import { useTx } from "../../i18n/site";
import { formatInr } from "../../utils/formatCurrency";

const short = (ym: string) => new Date(`${ym}-01T00:00:00`).toLocaleDateString("en-IN", { month: "short" });
const day = (d: string | Date) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch] as string);

/** Owner: a year at a glance — occupancy, income and expenses per month, event types and balances due; Excel and PDF. */
export default function MahalReportsScreen() {
  const { theme } = useAppTheme();
  const c = theme.colors;
  const tx = useTx();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const [year, setYear] = useState(new Date().getFullYear());
  const [mahals, setMahals] = useState<Mahal[]>([]);
  const [mahalId, setMahalId] = useState<number | undefined>(undefined);
  const [data, setData] = useState<Report | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");
  const [sharing, setSharing] = useState("");

  useLayoutEffect(() => navigation.setOptions({ title: tx("Reports") }), [navigation, tx]);
  useEffect(() => {
    void listMyMahals().then((r) => r.ok && setMahals(r.data ?? []));
  }, []);
  const load = useCallback(async () => {
    setData(null);
    const r = await getReport(year, mahalId);
    setRefreshing(false);
    if (r.ok && r.data) {
      setData(r.data);
      setError("");
    } else setError(tx(r.message));
  }, [year, mahalId, tx]);
  useEffect(() => {
    void load();
  }, [load]);

  const hallLabel = mahalId ? mahals.find((m) => m.id === mahalId)?.mahalName ?? "" : tx("All halls");
  const title = `${tx("Hall report")} ${year} · ${hallLabel}`;

  const excel = async () => {
    if (!data) return;
    setSharing("xlsx");
    try {
      await shareWorkbook([
        {
          name: tx("Months"),
          rows: data.months.map((m) => ({
            [tx("Month")]: new Date(`${m.month}-01T00:00:00`).toLocaleDateString("en-IN", { month: "long", year: "numeric" }),
            [tx("Events")]: m.events, [tx("Booked days")]: m.bookedDays, [tx("Occupancy %")]: m.occupancy,
            [tx("Income")]: m.income, [tx("Expenses")]: m.expenses, [tx("Profit")]: m.profit,
          })),
        },
        { name: tx("Event types"), rows: data.eventTypes.map((e) => ({ [tx("Event")]: tx(e.eventType), [tx("Events")]: e.count, [tx("Income")]: e.income })) },
        {
          name: tx("Balances due"),
          rows: data.dues.map((d) => ({ [tx("Date")]: day(d.fromDate), [tx("Customer")]: d.customerName, [tx("Phone")]: d.phone, [tx("Hall")]: d.mahalName ?? "", [tx("Booking")]: d.bookingRef ?? "", [tx("Balance")]: d.balance })),
        },
      ], `hall-report-${year}.xlsx`);
    } catch {
      setMessage(tx("Something went wrong. Please try again."));
    }
    setSharing("");
  };

  const pdf = async () => {
    if (!data) return;
    setSharing("pdf");
    const t = data.totals;
    const row = (cells: unknown[], bold = false) => `<tr>${cells.map((x, i) => `<td style="text-align:${i ? "right" : "left"}${bold ? ";font-weight:700" : ""}">${esc(x)}</td>`).join("")}</tr>`;
    const html = `<!doctype html><html><head><meta charset="utf-8"><style>
      body{font-family:"Noto Sans Tamil",system-ui,sans-serif;color:#0f172a;font-size:12px;padding:16px} h1{font-size:20px;margin:0} h2{font-size:15px;margin:20px 0 6px}
      .muted{color:#64748b} table{width:100%;border-collapse:collapse} td,th{padding:6px;border-bottom:1px solid #e2e8f0} th{text-align:right;background:#f8fafc;font-size:11px} th:first-child{text-align:left}
      .tiles{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px} .tile{flex:1;min-width:90px;border:1px solid #e2e8f0;border-radius:8px;padding:8px} .tile b{display:block;font-size:15px}
    </style></head><body>
      <h1>${esc(title)}</h1><div class="muted">${esc(tx("Made on {{date}}", { date: day(new Date()) }))}</div>
      <div class="tiles">${[[tx("Events"), t.events], [tx("Occupancy"), `${t.occupancy}%`], [tx("Income"), formatInr(t.income)], [tx("Expenses"), formatInr(t.expenses)], [tx("Profit"), formatInr(t.profit)], [tx("Balances due"), formatInr(t.dues)]]
        .map(([l, v]) => `<div class="tile">${esc(l)}<b>${esc(v)}</b></div>`).join("")}</div>
      <h2>${esc(tx("Month by month"))}</h2>
      <table><tr>${[tx("Month"), tx("Events"), tx("Booked days"), tx("Occupancy %"), tx("Income"), tx("Expenses"), tx("Profit")].map((h) => `<th>${esc(h)}</th>`).join("")}</tr>
      ${data.months.map((m) => row([short(m.month), m.events, m.bookedDays, `${m.occupancy}%`, formatInr(m.income), formatInr(m.expenses), formatInr(m.profit)])).join("")}
      ${row([tx("Total"), t.events, t.bookedDays, `${t.occupancy}%`, formatInr(t.income), formatInr(t.expenses), formatInr(t.profit)], true)}</table>
      <h2>${esc(tx("Event types"))}</h2>
      <table><tr><th>${esc(tx("Event"))}</th><th>${esc(tx("Events"))}</th><th>${esc(tx("Income"))}</th></tr>${data.eventTypes.map((e) => row([tx(e.eventType), e.count, formatInr(e.income)])).join("")}</table>
      <h2>${esc(tx("Balances due"))}</h2>
      <table><tr><th>${esc(tx("Date"))}</th><th>${esc(tx("Customer"))}</th><th>${esc(tx("Hall"))}</th><th>${esc(tx("Balance"))}</th></tr>
      ${data.dues.map((d) => row([day(d.fromDate), `${d.customerName} (${d.phone})`, d.mahalName ?? "", formatInr(d.balance)])).join("")}</table>
      <p class="muted" style="margin-top:20px">My Success · mysuccess.azurewebsites.net</p></body></html>`;
    try {
      await sharePdfFromHtml(html, title);
    } catch {
      setMessage(tx("Something went wrong. Please try again."));
    }
    setSharing("");
  };

  const remind = async (d: Report["dues"][number]) => {
    const text = `Hello ${d.customerName}, a reminder from ${d.mahalName ?? ""}: the balance of ${formatInr(d.balance)} for your booking ${d.bookingRef ?? ""} on ${day(d.fromDate)} is due. Thank you.`;
    if (!(await openWhatsApp(d.phone, text))) setMessage(tx("Could not open WhatsApp."));
  };

  const maxMoney = Math.max(1, ...(data?.months ?? []).flatMap((m) => [m.income, m.expenses]));

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} />}>
        <View style={styles.yearRow}>
          <IconButton icon="chevron-left" onPress={() => setYear((y) => y - 1)} accessibilityLabel={tx("Previous year")} />
          <Text style={{ color: c.text, fontWeight: "800", fontSize: 18, minWidth: 60, textAlign: "center" }}>{year}</Text>
          <IconButton icon="chevron-right" onPress={() => setYear((y) => y + 1)} accessibilityLabel={tx("Next year")} />
          <View style={{ flex: 1 }} />
          <Button compact icon="microsoft-excel" onPress={() => void excel()} loading={sharing === "xlsx"} disabled={!data || !!sharing}>Excel</Button>
          <Button compact icon="file-pdf-box" onPress={() => void pdf()} loading={sharing === "pdf"} disabled={!data || !!sharing}>PDF</Button>
        </View>
        {mahals.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
            <Chip selected={mahalId === undefined} onPress={() => setMahalId(undefined)} style={{ marginRight: 6 }}>{tx("All halls")}</Chip>
            {mahals.map((m) => <Chip key={m.id} selected={mahalId === m.id} onPress={() => setMahalId(m.id)} style={{ marginRight: 6 }}>{m.mahalName}</Chip>)}
          </ScrollView>
        )}

        {error ? <Text style={{ color: c.textMuted }}>{error}</Text> : !data ? <ActivityIndicator color={c.primary} style={{ marginTop: 24 }} /> : (
          <>
            <View style={styles.tiles}>
              {[
                [tx("Events"), String(data.totals.events), c.primary],
                [tx("Occupancy"), `${data.totals.occupancy}%`, "#0ea5e9"],
                [tx("Income"), formatInr(data.totals.income), c.success],
                [tx("Expenses"), formatInr(data.totals.expenses), c.warning],
                [tx("Profit"), formatInr(data.totals.profit), data.totals.profit < 0 ? c.danger : c.success],
                [tx("Balances due"), formatInr(data.totals.dues), c.danger],
              ].map(([l, v, col], i) => (
                <FadeIn key={l} index={i} style={[styles.tile, { backgroundColor: c.card, borderTopColor: col }]}>
                  <Text style={{ color: c.textMuted, fontSize: 12 }}>{l}</Text>
                  <Text style={{ color: c.text, fontWeight: "800", fontSize: 17 }} numberOfLines={1} adjustsFontSizeToFit>{v}</Text>
                </FadeIn>
              ))}
            </View>

            <FadeIn index={6} style={[styles.card, { backgroundColor: c.card }]}>
              <Text style={[styles.title, { color: c.text }]}>{tx("Income and expenses")}</Text>
              <View style={styles.chart}>
                {data.months.map((m) => (
                  <View key={m.month} style={styles.barCol}>
                    <View style={styles.bars}>
                      <View style={[styles.bar, { height: `${(m.income / maxMoney) * 100}%`, backgroundColor: c.success }]} />
                      <View style={[styles.bar, { height: `${(m.expenses / maxMoney) * 100}%`, backgroundColor: c.warning }]} />
                    </View>
                    <Text style={{ color: c.textMuted, fontSize: 9 }}>{short(m.month)}</Text>
                  </View>
                ))}
              </View>
              <Text style={[styles.title, { color: c.text, marginTop: 14 }]}>{tx("Occupancy per month")}</Text>
              <View style={[styles.chart, { height: 100 }]}>
                {data.months.map((m) => (
                  <View key={m.month} style={styles.barCol}>
                    <Text style={{ color: c.textMuted, fontSize: 9 }}>{m.occupancy ? Math.round(m.occupancy) : ""}</Text>
                    <View style={[styles.bar, { width: "60%", height: `${Math.min(100, m.occupancy)}%`, backgroundColor: "#0ea5e9" }]} />
                    <Text style={{ color: c.textMuted, fontSize: 9 }}>{short(m.month)}</Text>
                  </View>
                ))}
              </View>
            </FadeIn>

            <FadeIn index={7} style={[styles.card, { backgroundColor: c.card }]}>
              <Text style={[styles.title, { color: c.text }]}>{tx("Month by month")}</Text>
              {data.months.filter((m) => m.events || m.income || m.expenses).map((m) => (
                <View key={m.month} style={[styles.line, { borderColor: c.border }]}>
                  <Text style={{ color: c.text, fontWeight: "700", width: 44 }}>{short(m.month)}</Text>
                  <Text style={{ color: c.textMuted, flex: 1, fontSize: 12 }}>{m.events} · {m.occupancy}% · {formatInr(m.income)} − {formatInr(m.expenses)}</Text>
                  <Text style={{ color: m.profit < 0 ? c.danger : c.success, fontWeight: "800" }}>{formatInr(m.profit)}</Text>
                </View>
              ))}
            </FadeIn>

            <FadeIn index={8} style={[styles.card, { backgroundColor: c.card }]}>
              <Text style={[styles.title, { color: c.text }]}>{tx("Top event types")}</Text>
              {data.eventTypes.length === 0 ? <Text style={{ color: c.textMuted }}>{tx("No events this year.")}</Text> : data.eventTypes.map((e) => (
                <View key={e.eventType} style={{ marginBottom: 8 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ color: c.text }}>{tx(e.eventType)} · {e.count}</Text>
                    <Text style={{ color: c.text, fontWeight: "700" }}>{formatInr(e.income)}</Text>
                  </View>
                  <View style={[styles.track, { backgroundColor: c.border }]}>
                    <View style={{ width: `${(e.count / data.eventTypes[0].count) * 100}%`, height: "100%", backgroundColor: c.primary }} />
                  </View>
                </View>
              ))}
            </FadeIn>

            <FadeIn index={9} style={[styles.card, { backgroundColor: c.card }]}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                <Text style={[styles.title, { color: c.text, marginBottom: 0 }]}>{tx("Balances due")}</Text>
                <Text style={{ color: c.danger, fontWeight: "800" }}>{formatInr(data.totals.dues)}</Text>
              </View>
              {data.dues.length === 0 ? <Text style={{ color: c.textMuted }}>{tx("Nobody owes money. Well done!")}</Text> : data.dues.map((d) => (
                <View key={d.id} style={[styles.line, { borderColor: c.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: c.text, fontWeight: "700" }} numberOfLines={1}>{d.customerName}{d.overdue ? ` · ${tx("Overdue")}` : ""}</Text>
                    <Text style={{ color: c.textMuted, fontSize: 12 }} numberOfLines={1}>{day(d.fromDate)} · {d.mahalName} · {d.bookingRef}</Text>
                  </View>
                  <Text style={{ color: d.overdue ? c.danger : c.text, fontWeight: "800" }}>{formatInr(d.balance)}</Text>
                  <IconButton icon="whatsapp" iconColor="#16a34a" size={20} onPress={() => void remind(d)} accessibilityLabel={tx("Remind on WhatsApp")} />
                </View>
              ))}
            </FadeIn>
          </>
        )}
      </ScrollView>
      <Snackbar visible={!!message} onDismiss={() => setMessage("")}>{message}</Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  yearRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 14 },
  tile: { flexGrow: 1, flexBasis: "30%", borderRadius: 14, padding: 12, borderTopWidth: 3, elevation: 1, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  card: { borderRadius: 16, padding: 16, marginBottom: 14, elevation: 1, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  title: { fontWeight: "800", fontSize: 16, marginBottom: 10 },
  chart: { flexDirection: "row", alignItems: "flex-end", height: 140, gap: 3 },
  barCol: { flex: 1, height: "100%", alignItems: "center", justifyContent: "flex-end", gap: 3 },
  bars: { flex: 1, width: "100%", flexDirection: "row", alignItems: "flex-end", justifyContent: "center", gap: 1 },
  bar: { width: "40%", minHeight: 2, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  line: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  track: { height: 6, borderRadius: 3, overflow: "hidden", marginTop: 4 },
});
