import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Linking, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { Button, Chip, FAB, IconButton, Menu, Portal, Snackbar, Text, TextInput } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useAppTheme } from "../../hooks/useAppTheme";
import type { MainStackParamList } from "../../navigation/types";
import {
  effectiveStatus,
  fmtDateTime,
  fmtRange,
  getBooking,
  listBookings,
  listMyMahals,
  PAY_METHODS,
  recordPayment,
  setBookingStatus,
  toDay,
  type Booking,
  type BookingCounts,
  type Mahal,
  type MahalBookingStatus,
} from "../../api/mahal";
import { BookingCard, eventStyle, FadeIn, StatusPill } from "../../components/mahal/MahalUi";
import { formatInr } from "../../utils/formatCurrency";
import { useAuth } from "../../context/AuthContext";
import { getInvoice, markReminder } from "../../api/mahalOps";
import { hallMessage, invoiceMessage, openWhatsApp, shareInvoicePdf } from "../../utils/hallMessages";
import { useMessageLang, useTx } from "../../i18n/site";

const TABS: { key: string; label: string; count: keyof BookingCounts }[] = [
  { key: "Pending", label: "Requests", count: "Pending" },
  { key: "Upcoming", label: "Upcoming", count: "Upcoming" },
  { key: "Completed", label: "Completed", count: "Completed" },
  { key: "Cancelled", label: "Cancelled", count: "Cancelled" },
  { key: "", label: "All", count: "All" },
];
const PAGE = 20;
const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const waDigits = (p: string) => {
  const d = (p || "").replace(/\D/g, "");
  return d.length === 10 ? `91${d}` : d;
};

type Nav = NativeStackNavigationProp<MainStackParamList>;

/** Owner: bookings of their halls — requests to answer, upcoming events, calendar, payments. */
export default function MahalBookingsScreen() {
  const { theme } = useAppTheme();
  const c = theme.colors;
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<MainStackParamList, "MahalBookings">>();
  const [tab, setTab] = useState(route.params?.tab ?? "Upcoming");
  const [view, setView] = useState<"list" | "calendar">("list");
  const [mahals, setMahals] = useState<Mahal[]>([]);
  const [mahalId, setMahalId] = useState<number | undefined>(undefined);
  const [mahalMenu, setMahalMenu] = useState(false);
  const [items, setItems] = useState<Booking[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<Partial<BookingCounts>>({});
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [snack, setSnack] = useState({ visible: false, message: "" });
  const [openId, setOpenId] = useState<number | null>(null);

  useLayoutEffect(() => navigation.setOptions({ title: "Bookings" }), [navigation]);
  const toast = (message: string) => setSnack({ visible: true, message });

  useEffect(() => {
    void listMyMahals().then((r) => r.ok && setMahals(r.data ?? []));
  }, []);

  const load = useCallback(
    async (pageNo = 1) => {
      setLoading(true);
      const r = await listBookings({ status: tab || undefined, mahalId, page: pageNo, pageSize: PAGE });
      setLoading(false);
      setRefreshing(false);
      if (!r.ok || !r.data) {
        toast(r.message);
        if (pageNo === 1) setItems([]);
        return;
      }
      setItems((prev) => (pageNo === 1 ? r.data!.items : [...prev, ...r.data!.items]));
      setTotal(r.data.total);
      setCounts(r.data.counts ?? {});
      setPage(pageNo);
    },
    [tab, mahalId]
  );

  // Reload whenever the screen comes back (e.g. after adding or editing a booking).
  useFocusEffect(
    useCallback(() => {
      void load(1);
    }, [load])
  );

  const mahalName = mahals.find((m) => m.id === mahalId)?.mahalName;

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsBar} contentContainerStyle={styles.tabs}>
        {TABS.map((tb) => {
          const on = tab === tb.key && view === "list";
          const n = counts[tb.count];
          return (
            <Pressable
              key={tb.label}
              onPress={() => {
                setView("list");
                setTab(tb.key);
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              style={[styles.tab, { backgroundColor: on ? c.primary : c.card, borderColor: on ? c.primary : c.border }]}
            >
              <Text style={{ color: on ? "#fff" : c.text, fontWeight: on ? "800" : "600" }}>{tb.label}</Text>
              {n != null && (
                <View style={[styles.tabCount, { backgroundColor: on ? "rgba(255,255,255,0.25)" : tb.key === "Pending" && n > 0 ? c.warning : c.chipBg }]}>
                  <Text style={{ color: on || (tb.key === "Pending" && n > 0) ? "#fff" : c.textMuted, fontSize: 12, fontWeight: "700" }}>{n}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
      <View style={styles.toolbar}>
        {mahals.length > 1 ? (
          <Menu
            visible={mahalMenu}
            onDismiss={() => setMahalMenu(false)}
            anchor={<Button compact icon="office-building" onPress={() => setMahalMenu(true)}>{mahalName ?? "All mahals"}</Button>}
          >
            <Menu.Item title="All mahals" onPress={() => { setMahalId(undefined); setMahalMenu(false); }} />
            {mahals.map((m) => (
              <Menu.Item key={m.id} title={m.mahalName} onPress={() => { setMahalId(m.id); setMahalMenu(false); }} />
            ))}
          </Menu>
        ) : (
          <View />
        )}
        <View style={{ flexDirection: "row" }}>
          <IconButton icon="format-list-bulleted" selected={view === "list"} onPress={() => setView("list")} accessibilityLabel="List" iconColor={view === "list" ? c.primary : c.textMuted} />
          <IconButton icon="calendar-month" selected={view === "calendar"} onPress={() => setView("calendar")} accessibilityLabel="Calendar" iconColor={view === "calendar" ? c.primary : c.textMuted} />
        </View>
      </View>

      {view === "calendar" ? (
        <CalendarView mahalId={mahalId} onOpen={setOpenId} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(b) => String(b.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: 96 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(1); }} />}
          renderItem={({ item, index }) => <BookingCard booking={item} index={index % PAGE} onPress={() => setOpenId(item.id)} />}
          onEndReachedThreshold={0.4}
          onEndReached={() => !loading && items.length < total && void load(page + 1)}
          ListEmptyComponent={
            loading ? (
              <ActivityIndicator style={{ marginTop: 40 }} color={c.primary} />
            ) : (
              <FadeIn style={styles.empty}>
                <MaterialCommunityIcons name="calendar-blank-outline" size={48} color={c.textMuted} />
                <Text style={{ color: c.text, fontWeight: "700", fontSize: 16, marginTop: 8 }}>
                  {mahals.length === 0 ? "Add your mahal first" : tab === "Pending" ? "No requests waiting" : "No bookings here"}
                </Text>
                <Text style={{ color: c.textMuted, textAlign: "center", marginTop: 4 }}>
                  {mahals.length === 0 ? "Bookings belong to a hall. Add your hall under My mahals." : "Requests from the booking site and bookings you add appear here."}
                </Text>
              </FadeIn>
            )
          }
          ListFooterComponent={loading && items.length > 0 ? <ActivityIndicator color={c.primary} /> : null}
        />
      )}

      <FAB
        icon="plus"
        label="New booking"
        style={[styles.fab, { backgroundColor: c.primary }]}
        color="#fff"
        disabled={mahals.length === 0}
        onPress={() => navigation.navigate("BookingForm", { mahalId })}
      />

      <BookingDetail
        id={openId}
        onClose={() => setOpenId(null)}
        onChanged={(msg) => {
          toast(msg);
          void load(1);
        }}
        onEdit={(b) => {
          setOpenId(null);
          navigation.navigate("BookingForm", { bookingId: b.id });
        }}
      />
      <Snackbar visible={snack.visible} onDismiss={() => setSnack({ visible: false, message: "" })} duration={3500}>
        {snack.message}
      </Snackbar>
    </View>
  );
}

/** Month view: each day shows who booked it; tap a name to open the booking. */
function CalendarView({ mahalId, onOpen }: { mahalId?: number; onOpen: (id: number) => void }) {
  const { theme } = useAppTheme();
  const c = theme.colors;
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [items, setItems] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setLoading(true);
    const from = new Date(month.getFullYear(), month.getMonth(), 1);
    const to = new Date(month.getFullYear(), month.getMonth() + 1, 1);
    void listBookings({ status: "Active", mahalId, from: toDay(from), to: toDay(to), pageSize: 500 }).then((r) => {
      if (!live) return;
      setLoading(false);
      setItems(r.ok ? r.data?.items ?? [] : []);
    });
    return () => {
      live = false;
    };
  }, [month, mahalId]);

  const byDay = useMemo(() => {
    const map = new Map<string, Booking[]>();
    items.forEach((b) => {
      const end = new Date(b.toDate);
      for (let d = new Date(new Date(b.fromDate).setHours(0, 0, 0, 0)); d < end; d.setDate(d.getDate() + 1)) {
        const k = toDay(d);
        map.set(k, [...(map.get(k) ?? []), b]);
      }
    });
    return map;
  }, [items]);

  const lead = month.getDay();
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1))];
  const today = toDay(new Date());
  const list = picked ? byDay.get(picked) ?? [] : [];

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 96 }}>
      <View style={[styles.calCard, { backgroundColor: c.card }]}>
        <View style={styles.calHead}>
          <IconButton icon="chevron-left" onPress={() => { setPicked(null); setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1)); }} accessibilityLabel="Previous month" />
          <Text style={{ color: c.text, fontWeight: "800", fontSize: 16 }}>{month.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</Text>
          <IconButton icon="chevron-right" onPress={() => { setPicked(null); setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1)); }} accessibilityLabel="Next month" />
        </View>
        <View style={styles.grid}>
          {WEEKDAYS.map((w, i) => (
            <Text key={`${w}${i}`} style={[styles.weekday, { color: c.textMuted }]}>{w}</Text>
          ))}
        </View>
        <View style={styles.grid}>
          {cells.map((d, i) => {
            if (!d) return <View key={`x${i}`} style={styles.cell} />;
            const k = toDay(d);
            const bookings = byDay.get(k) ?? [];
            const pending = bookings.some((b) => b.status === "Pending");
            const confirmed = bookings.some((b) => b.status !== "Pending");
            const on = picked === k;
            return (
              <Pressable
                key={k}
                onPress={() => setPicked(on ? null : k)}
                accessibilityLabel={`${d.toDateString()}, ${bookings.length} bookings`}
                style={[styles.cell, styles.day, { borderColor: k === today ? c.primary : "transparent", backgroundColor: on ? c.primaryMuted : confirmed ? `${c.success}1f` : "transparent" }]}
              >
                <Text style={{ color: c.text, fontWeight: k === today ? "800" : "500" }}>{d.getDate()}</Text>
                <View style={{ flexDirection: "row", gap: 2, height: 6 }}>
                  {confirmed && <View style={[styles.dot, { backgroundColor: c.success }]} />}
                  {pending && <View style={[styles.dot, { backgroundColor: c.warning }]} />}
                </View>
              </Pressable>
            );
          })}
        </View>
        {loading && <ActivityIndicator style={{ marginTop: 8 }} color={c.primary} />}
        <View style={{ flexDirection: "row", gap: 16, marginTop: 10, justifyContent: "center" }}>
          <Legend color={c.success} label="Booked" />
          <Legend color={c.warning} label="Request" />
        </View>
      </View>
      {picked && (
        <View style={{ marginTop: 14 }}>
          <Text style={{ color: c.text, fontWeight: "700", marginBottom: 8 }}>
            {new Date(`${picked}T00:00:00`).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
          </Text>
          {list.length === 0 ? (
            <Text style={{ color: c.textMuted }}>Free — no bookings on this day.</Text>
          ) : (
            list.map((b, i) => <BookingCard key={b.id} booking={b} index={i} onPress={() => onOpen(b.id)} />)
          )}
        </View>
      )}
    </ScrollView>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  const { theme } = useAppTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <View style={[styles.dot, { backgroundColor: color, width: 8, height: 8 }]} />
      <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>{label}</Text>
    </View>
  );
}

/** Bottom sheet with the full booking and what the owner can do next. */
function BookingDetail({ id, onClose, onChanged, onEdit }: { id: number | null; onClose: () => void; onChanged: (msg: string) => void; onEdit: (b: Booking) => void }) {
  const { theme } = useAppTheme();
  const c = theme.colors;
  const [b, setB] = useState<Booking | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ask, setAsk] = useState<"Rejected" | "Cancelled" | null>(null);
  const [reason, setReason] = useState("");
  const [paying, setPaying] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("Cash");
  const [invoicing, setInvoicing] = useState<"" | "pdf" | "wa">("");
  const { user } = useAuth();
  const staff = user?.userType === "MS";
  const tx = useTx();
  const lang = useMessageLang();

  // Invoice: numbered the first time; then a PDF to share, or a WhatsApp summary to the customer.
  const invoice = async (how: "pdf" | "wa") => {
    if (!b) return;
    setInvoicing(how);
    const r = await getInvoice(b.id);
    if (!r.ok || !r.data) {
      setInvoicing("");
      setError(tx(r.message));
      return;
    }
    const inv = r.data;
    setB((x) => (x ? { ...x, invoiceNo: inv.invoiceNo } : x));
    try {
      if (how === "pdf") await shareInvoicePdf(inv);
      else if (!(await openWhatsApp(b.primary_phone, invoiceMessage(inv, lang)))) setError(tx("Could not open WhatsApp."));
    } catch {
      setError(tx("Could not make the invoice PDF. Please try again."));
    }
    setInvoicing("");
  };

  const offerMoitech = async () => {
    if (!b) return;
    if (await openWhatsApp(b.primary_phone, hallMessage("moitech", { ...b, mahalName: b.mahalName ?? "" }, lang))) void markReminder(b.id, "moitech");
    else setError(tx("Could not open WhatsApp."));
  };

  useEffect(() => {
    if (id == null) return;
    setB(null);
    setError("");
    setAsk(null);
    setPaying(false);
    void getBooking(id).then((r) => (r.ok ? setB(r.data ?? null) : setError(r.message)));
  }, [id]);

  const change = async (status: MahalBookingStatus, why?: string) => {
    if (!b) return;
    setBusy(true);
    const r = await setBookingStatus(b.id, status, why);
    setBusy(false);
    if (r.ok && r.data) {
      setB(r.data);
      setAsk(null);
      setReason("");
      onChanged(r.message || "Saved");
    } else setError(r.message);
  };

  const pay = async () => {
    if (!b) return;
    setBusy(true);
    const r = await recordPayment(b.id, Number(amount), method);
    setBusy(false);
    if (r.ok && r.data) {
      setB(r.data);
      setPaying(false);
      onChanged("Payment recorded");
    } else setError(r.message);
  };

  const s = b ? effectiveStatus(b) : null;
  const paid = b ? b.advance + b.rcdAmount : 0;
  const ev = eventStyle(b?.eventType);
  const due = b ? b.totalAmount - b.discount : 0;

  return (
    <Portal>
      <Modal visible={id != null} transparent animationType="slide" onRequestClose={onClose}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
        <View style={[styles.sheet, { backgroundColor: c.surface }]}>
          <View style={[styles.grabber, { backgroundColor: c.border }]} />
          {!b ? (
            error ? <Text style={{ color: c.danger, padding: 20 }}>{error}</Text> : <ActivityIndicator style={{ margin: 40 }} color={c.primary} />
          ) : (
            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 32 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={[styles.evIcon, { backgroundColor: `${ev.color}1f` }]}>
                  <MaterialCommunityIcons name={ev.icon} size={24} color={ev.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.text, fontSize: 18, fontWeight: "800" }}>{b.customerName}</Text>
                  <View style={{ flexDirection: "row", gap: 8, alignItems: "center", marginTop: 2 }}>
                    {s && <StatusPill status={s} />}
                    <Text style={{ color: c.textMuted, fontSize: 12 }}>{b.bookingRef}</Text>
                  </View>
                </View>
                <IconButton icon="close" onPress={onClose} accessibilityLabel="Close" />
              </View>

              <View style={{ flexDirection: "row", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                <Button mode="outlined" icon="phone" compact onPress={() => Linking.openURL(`tel:${b.primary_phone}`)}>Call</Button>
                <Button
                  mode="outlined"
                  icon="whatsapp"
                  compact
                  textColor="#16a34a"
                  onPress={() => Linking.openURL(`https://wa.me/${waDigits(b.primary_phone)}?text=${encodeURIComponent(`Hello ${b.customerName}, about your ${b.eventType ?? ""} booking at ${b.mahalName} on ${fmtRange(b.fromDate, b.toDate)} (ref ${b.bookingRef ?? ""}).`)}`)}
                >
                  WhatsApp
                </Button>
                <Button compact icon="pencil" onPress={() => onEdit(b)}>Edit</Button>
              </View>

              {b.status === "Pending" && (
                <View style={[styles.requestBox, { borderColor: c.warning, backgroundColor: `${c.warning}14` }]}>
                  <Text style={{ color: c.text, fontWeight: "700" }}>New booking request</Text>
                  <Text style={{ color: c.textMuted, marginBottom: 10 }}>Call the customer, then confirm to block the dates.</Text>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <Button mode="contained" icon="check" buttonColor={c.success} loading={busy} disabled={busy} onPress={() => change("Confirmed")}>Confirm</Button>
                    <Button icon="close-circle-outline" textColor={c.danger} disabled={busy} onPress={() => setAsk("Rejected")}>Decline</Button>
                  </View>
                </View>
              )}

              <Section title="Event">
                <Line label="Hall" value={b.mahalName} />
                <Line label="Event" value={b.eventType || "—"} />
                <Line label="From" value={fmtDateTime(b.fromDate)} />
                <Line label="To" value={fmtDateTime(b.toDate)} />
                {!!b.guestCount && <Line label="Guests" value={String(b.guestCount)} />}
                <Line label="Phone" value={b.primary_phone} />
                {!!b.email && <Line label="Email" value={b.email} />}
              </Section>

              <Section title="Payment">
                <Line label="Hall rent" value={formatInr(b.totalAmount)} />
                {b.discount > 0 && <Line label="Discount" value={`− ${formatInr(b.discount)}`} />}
                <Line label="Received" value={`${formatInr(paid)}${b.payMethod ? ` · ${b.payMethod}` : ""}`} />
                <View style={[styles.line, { marginTop: 4 }]}>
                  <Text style={{ color: c.text, fontWeight: "800" }}>Balance</Text>
                  <Text style={{ color: b.balance > 0 ? c.warning : c.success, fontWeight: "800", fontSize: 18 }}>{formatInr(b.balance)}</Text>
                </View>
                {due > 0 && (
                  <View style={[styles.progress, { backgroundColor: c.border }]}>
                    <View style={{ width: `${Math.min(100, (paid / due) * 100)}%`, backgroundColor: c.success, height: "100%", borderRadius: 4 }} />
                  </View>
                )}
                {(b.status === "Confirmed" || b.status === "Completed") && b.balance > 0 && !paying && (
                  <Button mode="outlined" icon="cash-plus" style={{ marginTop: 12 }} onPress={() => { setAmount(String(b.balance)); setPaying(true); }}>Record payment</Button>
                )}
                {paying && (
                  <View style={{ marginTop: 12, gap: 8 }}>
                    <TextInput mode="outlined" label="Amount received" keyboardType="numeric" value={amount} onChangeText={(v) => setAmount(v.replace(/[^\d.]/g, ""))} left={<TextInput.Affix text="₹" />} />
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {PAY_METHODS.map((m) => (
                        <Chip key={m} selected={method === m} onPress={() => setMethod(m)} style={{ marginRight: 6 }}>{m}</Chip>
                      ))}
                    </ScrollView>
                    <View style={{ flexDirection: "row", gap: 8, justifyContent: "flex-end" }}>
                      <Button onPress={() => setPaying(false)} disabled={busy}>Cancel</Button>
                      <Button mode="contained" onPress={pay} loading={busy} disabled={busy || !(Number(amount) > 0)}>Save</Button>
                    </View>
                  </View>
                )}
              </Section>

              {(b.status === "Confirmed" || b.status === "Completed") && (
                <View style={{ marginTop: 14, gap: 8 }}>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <Button mode="outlined" icon="file-pdf-box" style={{ flex: 1 }} loading={invoicing === "pdf"} disabled={!!invoicing} onPress={() => void invoice("pdf")}>
                      {tx("Invoice")}
                    </Button>
                    <Button mode="outlined" icon="whatsapp" textColor="#16a34a" style={{ flex: 1 }} loading={invoicing === "wa"} disabled={!!invoicing} onPress={() => void invoice("wa")}>
                      {tx("Send invoice")}
                    </Button>
                  </View>
                  {!!b.invoiceNo && <Text style={{ color: c.textMuted, fontSize: 12 }}>{tx("Invoice no. {{n}}", { n: b.invoiceNo })}</Text>}
                  {b.status === "Confirmed" && s !== "Completed" && (
                    <Button icon="hand-heart-outline" onPress={() => void offerMoitech()}>{tx("Offer Moitech free to this family")}</Button>
                  )}
                </View>
              )}

              {!!b.remarks && (
                <Section title="Notes">
                  <Text style={{ color: c.text }}>{b.remarks}</Text>
                </Section>
              )}
              {!!b.cancelReason && <Text style={{ color: c.textMuted, marginTop: 12 }}>Reason: {b.cancelReason}</Text>}

              {ask && (
                <View style={{ marginTop: 16, gap: 8 }}>
                  <Text style={{ color: c.text, fontWeight: "700" }}>{ask === "Rejected" ? "Decline this request?" : "Cancel this booking?"}</Text>
                  <TextInput mode="outlined" label="Reason (the customer sees this)" value={reason} onChangeText={setReason} multiline />
                  <View style={{ flexDirection: "row", gap: 8, justifyContent: "flex-end" }}>
                    <Button onPress={() => setAsk(null)} disabled={busy}>Back</Button>
                    <Button mode="contained" buttonColor={c.danger} loading={busy} disabled={busy || reason.trim().length < 3} onPress={() => change(ask, reason.trim())}>
                      {ask === "Rejected" ? "Decline" : "Cancel booking"}
                    </Button>
                  </View>
                </View>
              )}

              {!ask && (
                <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 16 }}>
                  {b.status === "Confirmed" && s === "Completed" && <Button icon="check-all" onPress={() => change("Completed")} disabled={busy}>Mark completed</Button>}
                  {b.status === "Confirmed" && !staff && <Button icon="calendar-remove" textColor={c.danger} onPress={() => setAsk("Cancelled")} disabled={busy}>Cancel booking</Button>}
                  {b.status === "Cancelled" && <Button icon="undo" onPress={() => change("Confirmed")} disabled={busy}>Restore booking</Button>}
                  {b.status === "Rejected" && <Button icon="undo" onPress={() => change("Pending")} disabled={busy}>Reopen request</Button>}
                  {b.status === "Completed" && <Button icon="undo" onPress={() => change("Confirmed")} disabled={busy}>Mark not completed</Button>}
                </View>
              )}
              {!!error && <Text style={{ color: c.danger, marginTop: 10 }}>{error}</Text>}
              <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 16 }}>
                {b.source === "online" ? "Requested online" : "Added by the hall"}{b.createdDt ? ` on ${fmtDateTime(b.createdDt)}` : ""}
              </Text>
            </ScrollView>
          )}
        </View>
      </Modal>
    </Portal>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { theme } = useAppTheme();
  return (
    <View style={{ marginTop: 18 }}>
      <Text style={{ color: theme.colors.textMuted, fontSize: 12, fontWeight: "700", letterSpacing: 1, marginBottom: 6 }}>{title.toUpperCase()}</Text>
      {children}
    </View>
  );
}

function Line({ label, value }: { label: string; value?: string | null }) {
  const { theme } = useAppTheme();
  return (
    <View style={styles.line}>
      <Text style={{ color: theme.colors.textMuted }}>{label}</Text>
      <Text style={{ color: theme.colors.text, fontWeight: "600", flexShrink: 1, textAlign: "right" }}>{value ?? ""}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tabsBar: { flexGrow: 0, flexShrink: 0 },
  tabs: { paddingHorizontal: 12, paddingTop: 12, gap: 8, alignItems: "center" },
  tab: { flexDirection: "row", alignItems: "center", gap: 6, height: 38, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1 },
  tabCount: { minWidth: 22, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  toolbar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 8 },
  empty: { alignItems: "center", padding: 32 },
  fab: { position: "absolute", right: 16, bottom: 20 },
  calCard: { borderRadius: 16, padding: 10, elevation: 1 },
  calHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: "center", justifyContent: "center", textAlign: "center" },
  day: { borderRadius: 10, borderWidth: 1.5 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  weekday: { width: `${100 / 7}%`, textAlign: "center", fontWeight: "700", fontSize: 12, paddingVertical: 4 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: { maxHeight: "88%", borderTopLeftRadius: 22, borderTopRightRadius: 22 },
  grabber: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginTop: 8 },
  evIcon: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  requestBox: { marginTop: 16, padding: 14, borderRadius: 14, borderWidth: 1 },
  line: { flexDirection: "row", justifyContent: "space-between", gap: 12, paddingVertical: 5 },
  progress: { height: 8, borderRadius: 4, overflow: "hidden", marginTop: 8 },
});
