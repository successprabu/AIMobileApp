import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";
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
        });
      });
    }
  }, [bookingId]);

  const mahal = mahals.find((m) => m.id === form.mahalId);
  const set = (k: keyof typeof form, v: unknown) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: "" }));
  };
  const money = (v: string) => v.replace(/[^\d.]/g, "").slice(0, 10);

  // Suggest rent from the hall's daily price for new bookings.
  useEffect(() => {
    if (bookingId || !mahal?.pricePerDay || form.totalAmount) return;
    const days = Math.max(1, Math.ceil((form.toDate.getTime() - form.fromDate.getTime()) / 86400000));
    setForm((f) => ({ ...f, totalAmount: String(mahal.pricePerDay! * days), advance: f.advance || (mahal.advanceAmount ? String(mahal.advanceAmount) : "") }));
  }, [bookingId, mahal, form.fromDate, form.toDate, form.totalAmount]);

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

        <FadeIn index={2} style={[styles.card, { backgroundColor: c.card }]}>
          <Text style={[styles.section, { color: c.text }]}>Payment</Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <TextInput mode="outlined" label="Hall rent" keyboardType="numeric" value={form.totalAmount} onChangeText={(v) => set("totalAmount", money(v))} left={<TextInput.Affix text="₹" />} style={[styles.input, { flex: 1 }]} />
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
  card: { borderRadius: 16, padding: 16, marginBottom: 14, elevation: 1, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  section: { fontWeight: "800", fontSize: 16, marginBottom: 10 },
  label: { fontSize: 12, marginBottom: 4 },
  dateBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, height: 46 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 6 },
  input: { marginTop: 8 },
  balance: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 14, borderRadius: 12, marginTop: 12 },
  save: { borderRadius: 14, marginTop: 4 },
});
