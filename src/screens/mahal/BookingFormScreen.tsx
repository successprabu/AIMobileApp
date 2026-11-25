import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { getQuote, listPackages, type PackageItem, type Quote } from "../../api/mahalPlus";
import { useTx } from "../../i18n/site";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Button, Chip, HelperText, Snackbar, Text, TextInput } from "react-native-paper";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useAppTheme } from "../../hooks/useAppTheme";
import type { MainStackParamList } from "../../navigation/types";
import { EVENT_TYPES, getBooking, listMyMahals, PAY_METHODS, saveBooking, toLocalIso, type Mahal } from "../../api/mahal";
import { eventStyle, FadeIn } from "../../components/mahal/MahalUi";
import { formatInr } from "../../utils/formatCurrency";
import AiBookingCard from "./AiBookingCard";
import { aiEnabled, type BookingDraft } from "../../api/mahalAi";

/** "2026-12-12" + "06:00" as a local date-time. */
const at = (day: string, time: string) => {
  const [y, m, d] = day.split("-").map(Number);
  const [h, min] = time.split(":").map(Number);
  return new Date(y, m - 1, d, h, min, 0, 0);
};

type Nav = NativeStackNavigationProp<MainStackParamList>;

const defaultStart = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(6, 0, 0, 0);
  return d;
};

/** Add a booking the hall took directly, or edit one. */
export default function BookingFormScreen() {
  const { theme } = useAppTheme();
  const c = theme.colors;
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<MainStackParamList, "BookingForm">>();
  const bookingId = route.params?.bookingId;
  const [mahals, setMahals] = useState<Mahal[]>([]);
  const [form, setForm] = useState(() => {
    const from = defaultStart();
    const to = new Date(from);
    to.setHours(22, 0, 0, 0);
    return {
      id: 0,
      mahalId: route.params?.mahalId ?? 0,
      customerName: "",
      primary_phone: "",
      email: "",
      eventType: "Marriage",
      guestCount: "",
      fromDate: from,
      toDate: to,
      totalAmount: "",
      discount: "",
      advance: "",
      payMethod: "Cash",
      remarks: "",
      rcdAmount: 0,
      packageId: null as number | null,
      addonIds: [] as number[],
    };
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [picker, setPicker] = useState<{ field: "fromDate" | "toDate"; mode: "date" | "time" } | null>(null);

  useLayoutEffect(() => navigation.setOptions({ title: bookingId ? "Edit booking" : "New booking" }), [navigation, bookingId]);

  useEffect(() => {
    void listMyMahals().then((r) => {
      const list = r.ok ? r.data ?? [] : [];
      setMahals(list);
      if (list.length === 1) setForm((f) => (f.mahalId ? f : { ...f, mahalId: list[0].id }));
    });
    if (bookingId) {
      void getBooking(bookingId).then((r) => {
        if (!r.ok || !r.data) {
          setMessage(r.message);
          return;
        }
        const b = r.data;
        setForm({
          id: b.id,
          mahalId: b.mahalId,
          customerName: b.customerName,
          primary_phone: b.primary_phone,
          email: b.email ?? "",
          eventType: b.eventType ?? "Other",
          guestCount: b.guestCount ? String(b.guestCount) : "",
          fromDate: new Date(b.fromDate),
          toDate: new Date(b.toDate),
          totalAmount: b.totalAmount ? String(b.totalAmount) : "",
          discount: b.discount ? String(b.discount) : "",
          advance: b.advance ? String(b.advance) : "",
          payMethod: b.payMethod ?? "Cash",
          remarks: b.remarks ?? "",
          rcdAmount: b.rcdAmount ?? 0,
          packageId: b.packageId ?? null,
          addonIds: b.addonIds ?? [],
        });
      });
    }
  }, [bookingId]);

  const mahal = mahals.find((m) => m.id === form.mahalId);
  const [ai, setAi] = useState(false);
  const [aiNote, setAiNote] = useState("");
  useEffect(() => {
    if (!bookingId) void aiEnabled().then(setAi);
  }, [bookingId]);

  /** Fills the form from what the owner typed or said (the AI's draft); the owner checks it and saves. */
  const applyDraft = (d: BookingDraft) => {
    setForm((f) => {
      const n = { ...f };
      if (d.mahalId) n.mahalId = d.mahalId;
      if (d.customerName) n.customerName = d.customerName;
      if (d.phone) n.primary_phone = d.phone;
      if (d.eventType) n.eventType = d.eventType;
      if (d.guestCount) n.guestCount = String(d.guestCount);
      if (d.fromDate) {
        n.fromDate = at(d.fromDate, d.startTime ?? "06:00");
        let to = at(d.toDate ?? d.fromDate, d.endTime ?? "22:00");
        if (to <= n.fromDate) {
          to = new Date(n.fromDate);
          to.setDate(to.getDate() + 1);
          to.setHours(6, 0, 0, 0);
        }
        n.toDate = to;
      }
      if (d.totalAmount != null) n.totalAmount = String(d.totalAmount);
      if (d.discount != null) n.discount = String(d.discount);
      if (d.advance != null) n.advance = String(d.advance);
      if (d.payMethod) n.payMethod = d.payMethod;
      if (d.remarks) n.remarks = d.remarks;
      return n;
    });
    const e: Record<string, string> = {};
    for (const m of d.missing) {
      if (m === "hall") e.mahalId = "Choose the hall";
      if (m === "customer name") e.customerName = "Not in your note: please type it";
      if (m === "phone") e.primary_phone = "Not in your note: please type it";
      if (m === "date") e.fromDate = "Not in your note: please choose";
    }
    setErrors(e);
    setAiNote(`Filled by AI. Please check every detail before saving.${d.note ? ` ${d.note}` : ""}`);
  };

  const set = (k: keyof typeof form, v: unknown) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: "" }));
  };
  const money = (v: string) => v.replace(/[^\d.]/g, "").slice(0, 10);

  // Packages and add-ons of the hall, and the price-list quote (weekend, muhurtham, extras) for the dates (Phase 2).
  const tx = useTx();
  const [extras, setExtras] = useState<PackageItem[]>([]);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [rentTyped, setRentTyped] = useState(!!bookingId);
  useEffect(() => {
    if (!form.mahalId) {
      setExtras([]);
      return;
    }
    void listPackages(form.mahalId).then((r) => setExtras(r.ok ? (r.data ?? []).filter((x) => x.isActive) : []));
  }, [form.mahalId]);
  const addonKey = form.addonIds.join(",");
  useEffect(() => {
    if (!form.mahalId || form.toDate <= form.fromDate) {
      setQuote(null);
      return undefined;
    }
    let live = true;
    const t = setTimeout(async () => {
      const r = await getQuote({ mahalId: form.mahalId, from: toLocalIso(form.fromDate), to: toLocalIso(form.toDate), packageId: form.packageId, addonIds: form.addonIds });
      if (!live) return;
      if (r.ok && r.data) setQuote(r.data);
      else if (mahal?.pricePerDay) {
        // Older server without the price list: rent × days, as before.
        const days = Math.max(1, Math.ceil((form.toDate.getTime() - form.fromDate.getTime()) / 86400000));
        setQuote({ total: mahal.pricePerDay * days, rent: mahal.pricePerDay * days, days: [], package: null, addons: [] });
      } else setQuote(null);
    }, 300);
    return () => {
      live = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.mahalId, form.fromDate, form.toDate, form.packageId, addonKey, mahal?.pricePerDay]);
  // New bookings take the price-list total until the owner types their own rent.
  useEffect(() => {
    if (bookingId || rentTyped || !quote?.total) return;
    setForm((f) => ({ ...f, totalAmount: String(quote.total), advance: f.advance || (mahal?.advanceAmount ? String(mahal.advanceAmount) : "") }));
  }, [bookingId, rentTyped, quote, mahal]);
  const muhurthamDays = (quote?.days ?? []).filter((d) => d.kind === "muhurtham").length;
  const packages = extras.filter((x) => x.kind === "package");
  const addons = extras.filter((x) => x.kind === "addon");

  const balance = useMemo(
    () => Math.max(0, (Number(form.totalAmount) || 0) - (Number(form.discount) || 0) - (Number(form.advance) || 0) - (form.rcdAmount || 0)),
    [form.totalAmount, form.discount, form.advance, form.rcdAmount]
  );

  const onPicked = (e: DateTimePickerEvent, value?: Date) => {
    if (!picker) return;
    const { field, mode } = picker;
    if (Platform.OS === "android") setPicker(null);
    if (e.type !== "set" || !value) return;
    const base = new Date(form[field]);
    if (mode === "date") base.setFullYear(value.getFullYear(), value.getMonth(), value.getDate());
    else base.setHours(value.getHours(), value.getMinutes(), 0, 0);
    set(field, base);
    if (field === "fromDate" && base >= form.toDate) {
      const end = new Date(base);
      end.setHours(Math.min(23, base.getHours() + 12), 0, 0, 0);
      set("toDate", end);
    }
    // After the date on Android, ask for the time too.
    if (Platform.OS === "android" && mode === "date") setTimeout(() => setPicker({ field, mode: "time" }), 50);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.mahalId) e.mahalId = "Choose the hall";
    if (form.customerName.trim().length < 2) e.customerName = "Enter the customer name";
    if (form.primary_phone.replace(/\D/g, "").length < 10) e.primary_phone = "Enter a valid phone number";
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) e.email = "Enter a valid email";
    if (form.toDate <= form.fromDate) e.toDate = "Must be after the start";
    if ((Number(form.discount) || 0) > (Number(form.totalAmount) || 0)) e.discount = "More than the rent";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = async () => {
    if (saving || !validate()) return;
    setSaving(true);
    const r = await saveBooking({
      id: form.id,
      mahalId: form.mahalId,
      customerName: form.customerName.trim(),
      primary_phone: form.primary_phone.trim(),
      email: form.email.trim() || null,
      eventType: form.eventType,
      guestCount: form.guestCount ? Number(form.guestCount) : null,
      fromDate: toLocalIso(form.fromDate),
      toDate: toLocalIso(form.toDate),
      totalAmount: Number(form.totalAmount) || 0,
      discount: Number(form.discount) || 0,
      advance: Number(form.advance) || 0,
      payMethod: form.payMethod,
      remarks: form.remarks,
      packageId: form.packageId,
      addonIds: form.addonIds,
    });
    setSaving(false);
    if (r.ok) navigation.goBack();
    else setMessage(r.message);
  };

  const dateButton = (field: "fromDate" | "toDate", label: string) => (
    <View style={{ flex: 1 }}>
      <Text style={[styles.label, { color: c.textMuted }]}>{label}</Text>
      <View style={{ flexDirection: "row", gap: 6 }}>
        <Pressable onPress={() => setPicker({ field, mode: "date" })} style={[styles.dateBtn, { borderColor: errors[field] ? c.danger : c.border, backgroundColor: c.inputBg, flex: 1.4 }]}>
          <MaterialCommunityIcons name="calendar" size={16} color={c.primary} />
          <Text style={{ color: c.text }}>{form[field].toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</Text>
        </Pressable>
        <Pressable onPress={() => setPicker({ field, mode: "time" })} style={[styles.dateBtn, { borderColor: c.border, backgroundColor: c.inputBg, flex: 1 }]}>
          <MaterialCommunityIcons name="clock-outline" size={16} color={c.primary} />
          <Text style={{ color: c.text }}>{form[field].toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}</Text>
        </Pressable>
      </View>
      {!!errors[field] && <HelperText type="error">{errors[field]}</HelperText>}
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        {ai && !bookingId ? <AiBookingCard mahalId={form.mahalId || undefined} onDraft={applyDraft} /> : null}
        {aiNote ? (
          <FadeIn style={[styles.aiNote, { backgroundColor: c.primaryMuted }]}>
            <MaterialCommunityIcons name="creation" size={18} color={c.primary} />
            <Text style={{ color: c.text, flex: 1, fontWeight: "600" }}>{aiNote}</Text>
          </FadeIn>
        ) : null}
        <FadeIn style={[styles.card, { backgroundColor: c.card }]}>
          <Text style={[styles.section, { color: c.text }]}>Hall and dates</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
            {mahals.map((m) => (
              <Chip key={m.id} icon="office-building" selected={form.mahalId === m.id} onPress={() => set("mahalId", m.id)} style={{ marginRight: 6 }}>
                {m.mahalName}
              </Chip>
            ))}
          </ScrollView>
          {!!errors.mahalId && <HelperText type="error">{errors.mahalId}</HelperText>}
          <View style={{ gap: 10, marginTop: 6 }}>
            {dateButton("fromDate", "From")}
            {dateButton("toDate", "To")}
          </View>
        </FadeIn>

        <FadeIn index={1} style={[styles.card, { backgroundColor: c.card }]}>
          <Text style={[styles.section, { color: c.text }]}>Event</Text>
          <View style={styles.wrap}>
            {EVENT_TYPES.map((e) => {
              const st = eventStyle(e);
              const on = form.eventType === e;
              return (
                <Chip
                  key={e}
                  icon={({ size }) => <MaterialCommunityIcons name={st.icon} size={size} color={on ? "#fff" : st.color} />}
                  selected={on}
                  onPress={() => set("eventType", e)}
                  style={{ backgroundColor: on ? st.color : c.chipBg }}
                  textStyle={{ color: on ? "#fff" : c.text }}
                  showSelectedCheck={false}
                >
                  {e}
                </Chip>
              );
            })}
          </View>
          <TextInput mode="outlined" label="Customer name *" value={form.customerName} onChangeText={(v) => set("customerName", v)} error={!!errors.customerName} style={styles.input} />
          {!!errors.customerName && <HelperText type="error">{errors.customerName}</HelperText>}
          <View style={{ flexDirection: "row", gap: 10 }}>
            <TextInput mode="outlined" label="Phone *" keyboardType="phone-pad" value={form.primary_phone} onChangeText={(v) => set("primary_phone", v)} error={!!errors.primary_phone} style={[styles.input, { flex: 1.6 }]} />
            <TextInput mode="outlined" label="Guests" keyboardType="number-pad" value={form.guestCount} onChangeText={(v) => set("guestCount", v.replace(/\D/g, "").slice(0, 6))} style={[styles.input, { flex: 1 }]} />
          </View>
          {!!errors.primary_phone && <HelperText type="error">{errors.primary_phone}</HelperText>}
          <TextInput mode="outlined" label="Email" keyboardType="email-address" autoCapitalize="none" value={form.email} onChangeText={(v) => set("email", v)} error={!!errors.email} style={styles.input} />
        </FadeIn>

        {extras.length > 0 && (
          <FadeIn index={2} style={[styles.card, { backgroundColor: c.card }]}>
            <Text style={[styles.section, { color: c.text }]}>{tx("Packages and add-ons")}</Text>
            {packages.length > 0 && (
              <View style={styles.wrap}>
                <Chip selected={!form.packageId} onPress={() => set("packageId", null)}>{tx("Hall only")}</Chip>
                {packages.map((x) => (
                  <Chip key={x.id} selected={form.packageId === x.id} onPress={() => set("packageId", x.id)}>{`${x.name} +${formatInr(x.price)}/${tx("day")}`}</Chip>
                ))}
              </View>
            )}
            {addons.length > 0 && (
              <View style={[styles.wrap, { marginTop: 8 }]}>
                {addons.map((x) => {
                  const on = form.addonIds.includes(x.id);
                  return (
                    <Chip key={x.id} selected={on} icon={on ? "check" : "plus"} showSelectedCheck={false}
                      onPress={() => set("addonIds", on ? form.addonIds.filter((i) => i !== x.id) : [...form.addonIds, x.id])}>
                      {`${x.name} ${formatInr(x.price)}${x.unit === "event" ? "" : `/${tx("day")}`}`}
                    </Chip>
                  );
                })}
              </View>
            )}
          </FadeIn>
        )}

        <FadeIn index={2} style={[styles.card, { backgroundColor: c.card }]}>
          <Text style={[styles.section, { color: c.text }]}>Payment</Text>
          {!!quote?.total && (
            <View style={[styles.quote, { backgroundColor: `${c.primary}12` }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: c.text, fontWeight: "700" }}>Price list: {formatInr(quote.total)}</Text>
                <Text style={{ color: c.textMuted, fontSize: 12 }}>
                  {[quote.days.length ? `rent ${formatInr(quote.rent)}` : "", muhurthamDays ? tx("includes {{n}} muhurtham day(s)", { n: muhurthamDays }) : "",
                    quote.package ? `${quote.package.name} ${formatInr(quote.package.amount)}` : "", ...quote.addons.map((a) => `${a.name} ${formatInr(a.amount)}`)].filter(Boolean).join(" · ")}
                </Text>
              </View>
              {Number(form.totalAmount) !== quote.total && (
                <Button compact onPress={() => { setRentTyped(true); set("totalAmount", String(quote.total)); }}>Use it</Button>
              )}
            </View>
          )}
          <View style={{ flexDirection: "row", gap: 10 }}>
            <TextInput mode="outlined" label="Total rent" keyboardType="numeric" value={form.totalAmount} onChangeText={(v) => { setRentTyped(true); set("totalAmount", money(v)); }} left={<TextInput.Affix text="₹" />} style={[styles.input, { flex: 1 }]} />
            <TextInput mode="outlined" label="Discount" keyboardType="numeric" value={form.discount} onChangeText={(v) => set("discount", money(v))} left={<TextInput.Affix text="₹" />} error={!!errors.discount} style={[styles.input, { flex: 1 }]} />
          </View>
          <TextInput mode="outlined" label="Advance received" keyboardType="numeric" value={form.advance} onChangeText={(v) => set("advance", money(v))} left={<TextInput.Affix text="₹" />} style={styles.input} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
            {PAY_METHODS.map((m) => (
              <Chip key={m} selected={form.payMethod === m} onPress={() => set("payMethod", m)} style={{ marginRight: 6 }}>{m}</Chip>
            ))}
          </ScrollView>
          <View style={[styles.balance, { backgroundColor: c.primaryMuted }]}>
            <Text style={{ color: c.textMuted }}>Balance due{form.rcdAmount > 0 ? ` (after ${formatInr(form.rcdAmount)} received)` : ""}</Text>
            <Text style={{ color: c.primary, fontWeight: "800", fontSize: 20 }}>{formatInr(balance)}</Text>
          </View>
          <TextInput mode="outlined" label="Notes" multiline value={form.remarks} onChangeText={(v) => set("remarks", v)} style={styles.input} />
        </FadeIn>

        <Button mode="contained" icon="content-save" onPress={save} loading={saving} disabled={saving} style={styles.save} contentStyle={{ height: 52 }} labelStyle={{ fontSize: 16, fontWeight: "700" }}>
          {form.id ? "Save changes" : "Save booking"}
        </Button>
      </ScrollView>

      {picker && Platform.OS !== "web" && (
        <DateTimePicker value={form[picker.field]} mode={picker.mode} onChange={onPicked} minimumDate={picker.field === "toDate" && picker.mode === "date" ? form.fromDate : undefined} />
      )}
      {picker && Platform.OS === "ios" && (
        <Button onPress={() => setPicker(null)} style={{ marginBottom: 20 }}>Done</Button>
      )}
      <Snackbar visible={!!message} onDismiss={() => setMessage("")} duration={4000}>{message}</Snackbar>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  quote: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 12, marginBottom: 8 },
  aiNote: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 14, marginBottom: 12 },
  card: { borderRadius: 16, padding: 16, marginBottom: 14, elevation: 1, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  section: { fontWeight: "800", fontSize: 16, marginBottom: 10 },
  label: { fontSize: 12, marginBottom: 4 },
  dateBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, height: 46 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 6 },
  input: { marginTop: 8 },
  balance: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 14, borderRadius: 12, marginTop: 12 },
  save: { borderRadius: 14, marginTop: 4 },
});
