import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, View } from "react-native";
import { Button, Chip, IconButton, SegmentedButtons, Switch, Text, TextInput } from "react-native-paper";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useAppTheme } from "../../hooks/useAppTheme";
import { toDay, type Mahal } from "../../api/mahal";
import { deletePackage, listPackages, savePackage, savePricing, type PackageItem } from "../../api/mahalPlus";
import Sheet from "../ui/Sheet";
import { useTx } from "../../i18n/site";
import { formatInr } from "../../utils/formatCurrency";

export type MahalPrices = Mahal;

const money = (v: string) => v.replace(/[^\d.]/g, "").slice(0, 10);
const nice = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });

/** Owner: weekend / muhurtham / weekday prices with muhurtham dates, and packages and add-ons, for one hall. */
export default function PricingSheet({ mahal, onClose, onSaved }: { mahal: MahalPrices | null; onClose: () => void; onSaved: (m: MahalPrices, msg: string) => void }) {
  const tx = useTx();
  const [tab, setTab] = useState("prices");
  useEffect(() => {
    if (mahal) setTab("prices");
  }, [mahal]);
  return (
    <Sheet visible={!!mahal} title={`${tx("Prices and packages")} · ${mahal?.mahalName ?? ""}`} onClose={onClose}>
      {mahal && (
        <View style={{ gap: 14 }}>
          <SegmentedButtons value={tab} onValueChange={setTab} buttons={[{ value: "prices", label: tx("Day prices") }, { value: "packages", label: tx("Packages and add-ons") }]} />
          {tab === "prices" ? <DayPrices mahal={mahal} onSaved={onSaved} /> : <Packages mahal={mahal} />}
        </View>
      )}
    </Sheet>
  );
}

function DayPrices({ mahal, onSaved }: { mahal: MahalPrices; onSaved: (m: MahalPrices, msg: string) => void }) {
  const { theme } = useAppTheme();
  const c = theme.colors;
  const tx = useTx();
  const [weekend, setWeekend] = useState(mahal.weekendPrice ? String(mahal.weekendPrice) : "");
  const [muhurtham, setMuhurtham] = useState(mahal.muhurthamPrice ? String(mahal.muhurthamPrice) : "");
  const [discount, setDiscount] = useState(mahal.weekdayDiscount ? String(mahal.weekdayDiscount) : "");
  const [dates, setDates] = useState<string[]>(mahal.specialDates ?? []);
  const [picking, setPicking] = useState(false);
  const [saving, setSaving] = useState(false);
  const today = toDay(new Date());
  const upcoming = dates.filter((d) => d >= today);
  const base = Number(mahal.pricePerDay) || 0;

  const onPick = (e: DateTimePickerEvent, value?: Date) => {
    if (Platform.OS === "android") setPicking(false);
    if (e.type === "set" && value) setDates((list) => [...new Set([...list, toDay(value)])].sort());
  };

  const save = async () => {
    setSaving(true);
    const r = await savePricing({
      mahalId: mahal.id,
      weekendPrice: Number(weekend) || null,
      muhurthamPrice: Number(muhurtham) || null,
      weekdayDiscount: Number(discount) || null,
      specialDates: dates.filter((d) => d >= today),
    });
    setSaving(false);
    if (r.ok && r.data) onSaved({ ...mahal, ...r.data, id: mahal.id }, tx(r.message));
    else Alert.alert(tx(r.message || "Something went wrong. Please try again."));
  };

  return (
    <View style={{ gap: 12 }}>
      <Text style={{ color: c.textMuted }}>{tx("Normal rent: {{amount}} / day (change it under Edit). Leave a box empty to use the normal rent.", { amount: formatInr(base) })}</Text>
      <TextInput mode="outlined" label={tx("Weekend rent (Sat, Sun)")} keyboardType="numeric" value={weekend} onChangeText={(v) => setWeekend(money(v))} left={<TextInput.Affix text="₹" />} />
      <TextInput mode="outlined" label={tx("Muhurtham day rent")} keyboardType="numeric" value={muhurtham} onChangeText={(v) => setMuhurtham(money(v))} left={<TextInput.Affix text="₹" />} />
      <TextInput mode="outlined" label={tx("Weekday discount")} keyboardType="numeric" value={discount} onChangeText={(v) => setDiscount(money(v).slice(0, 4))} right={<TextInput.Affix text="%" />} />
      {base > 0 && (
        <Text style={{ color: c.textMuted, fontSize: 12 }}>
          {tx("Weekday")}: {formatInr(base * (1 - (Number(discount) || 0) / 100))} · {tx("Weekend")}: {formatInr(Number(weekend) || base)} · {tx("Muhurtham day")}: {formatInr(Number(muhurtham) || base)}
        </Text>
      )}

      <View style={[styles.box, { borderColor: c.border }]}>
        <Text style={{ color: c.text, fontWeight: "800" }}>{tx("Muhurtham and peak dates")}</Text>
        <Text style={{ color: c.textMuted, fontSize: 12, marginBottom: 8 }}>
          {tx("Add the auspicious days and festival dates when you charge the muhurtham rent. Customers see these dates and the price on your hall page.")}
        </Text>
        <View style={styles.wrap}>
          {upcoming.length === 0 ? <Text style={{ color: c.textMuted }}>{tx("No dates added yet.")}</Text> : upcoming.map((d) => (
            <Chip key={d} onClose={() => setDates((list) => list.filter((x) => x !== d))} closeIcon="close">{nice(d)}</Chip>
          ))}
        </View>
        <Button icon="calendar-plus" mode="outlined" style={{ marginTop: 10, alignSelf: "flex-start" }} onPress={() => setPicking(true)}>{tx("Add date")}</Button>
        {picking && <DateTimePicker value={new Date()} mode="date" minimumDate={new Date()} onChange={onPick} />}
        {picking && Platform.OS === "ios" && <Button onPress={() => setPicking(false)}>{tx("Done")}</Button>}
      </View>
      <Button mode="contained" onPress={save} loading={saving} disabled={saving} style={{ borderRadius: 12 }}>{tx("Save prices")}</Button>
    </View>
  );
}

type Form = { id: number; kind: "package" | "addon"; name: string; description: string; price: string; unit: "day" | "event"; isActive: boolean };

function Packages({ mahal }: { mahal: MahalPrices }) {
  const { theme } = useAppTheme();
  const c = theme.colors;
  const tx = useTx();
  const [items, setItems] = useState<PackageItem[] | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const r = await listPackages(mahal.id);
    setItems(r.ok ? r.data ?? [] : []);
    if (!r.ok) Alert.alert(tx(r.message));
  };
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mahal.id]);

  const save = async () => {
    if (!form) return;
    if (!form.name.trim()) {
      Alert.alert(tx("Please enter a name."));
      return;
    }
    setSaving(true);
    const r = await savePackage({ id: form.id, mahalId: mahal.id, kind: form.kind, name: form.name.trim(), description: form.description.trim(), price: Number(form.price) || 0, unit: form.unit, isActive: form.isActive, sortOrder: 0 });
    setSaving(false);
    if (r.ok) {
      setForm(null);
      void load();
    } else Alert.alert(tx(r.message));
  };
  const remove = (x: PackageItem) =>
    Alert.alert(tx('Delete "{{name}}"? Bookings that already have it keep their amounts.', { name: x.name }), undefined, [
      { text: tx("Close"), style: "cancel" },
      { text: tx("Delete"), style: "destructive", onPress: async () => { const r = await deletePackage(x.id); if (r.ok) void load(); else Alert.alert(tx(r.message)); } },
    ]);

  if (!items) return <ActivityIndicator color={c.primary} />;

  if (form) {
    return (
      <View style={{ gap: 10 }}>
        <Text style={{ color: c.text, fontWeight: "800" }}>{tx(form.id ? "Edit" : form.kind === "addon" ? "New add-on" : "New package")}</Text>
        <TextInput mode="outlined" label={tx("Name")} value={form.name} onChangeText={(v) => setForm({ ...form, name: v.slice(0, 100) })} autoFocus />
        <TextInput mode="outlined" label={tx("Price")} keyboardType="numeric" value={form.price} onChangeText={(v) => setForm({ ...form, price: money(v) })} left={<TextInput.Affix text="₹" />} />
        {form.kind === "addon" && (
          <SegmentedButtons value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v as "day" | "event" })} buttons={[{ value: "day", label: tx("per day") }, { value: "event", label: tx("per event") }]} />
        )}
        <TextInput mode="outlined" label={tx("Short description (optional)")} value={form.description} onChangeText={(v) => setForm({ ...form, description: v.slice(0, 300) })} />
        <View style={styles.rowBetween}>
          <Text style={{ color: c.text }}>{tx("Show to customers")}</Text>
          <Switch value={form.isActive} onValueChange={(v) => setForm({ ...form, isActive: v })} />
        </View>
        <View style={{ flexDirection: "row", gap: 8, justifyContent: "flex-end" }}>
          <Button onPress={() => setForm(null)} disabled={saving}>{tx("Close")}</Button>
          <Button mode="contained" onPress={save} loading={saving} disabled={saving}>{tx("Save")}</Button>
        </View>
      </View>
    );
  }

  const group = (kind: "package" | "addon", title: string, hint: string, example: string) => (
    <View style={[styles.box, { borderColor: c.border }]}>
      <View style={styles.rowBetween}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: c.text, fontWeight: "800" }}>{tx(title)}</Text>
          <Text style={{ color: c.textMuted, fontSize: 12 }}>{tx(hint)}</Text>
        </View>
        <Button compact icon="plus" onPress={() => setForm({ id: 0, kind, name: "", description: "", price: "", unit: "day", isActive: true })}>{tx("Add")}</Button>
      </View>
      {items.filter((x) => x.kind === kind).map((x) => (
        <Pressable key={x.id} onPress={() => setForm({ id: x.id, kind: x.kind, name: x.name, description: x.description ?? "", price: String(x.price), unit: x.unit, isActive: x.isActive })}
          style={[styles.item, { backgroundColor: `${c.primary}0d`, opacity: x.isActive ? 1 : 0.5 }]} accessibilityRole="button" accessibilityLabel={`${tx("Edit")} ${x.name}`}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: c.text, fontWeight: "700" }}>{x.name}</Text>
            {!!x.description && <Text style={{ color: c.textMuted, fontSize: 12 }} numberOfLines={1}>{x.description}</Text>}
          </View>
          <Text style={{ color: c.text, fontWeight: "800" }}>{formatInr(x.price)}</Text>
          <Text style={{ color: c.textMuted, fontSize: 11, width: 60 }}>{tx(x.unit === "event" ? "per event" : "per day")}</Text>
          <IconButton icon="delete-outline" size={18} iconColor={c.danger} onPress={() => remove(x)} accessibilityLabel={tx("Delete")} />
        </Pressable>
      ))}
      {!items.some((x) => x.kind === kind) && <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 6 }}>{tx(example)}</Text>}
    </View>
  );

  return (
    <View style={{ gap: 12 }}>
      {group("package", "Packages", "Charged for every day, on top of the hall rent. The customer picks one.", "For example: Hall + dining hall, Hall + 10 rooms.")}
      {group("addon", "Add-ons", "Extras the customer can add. Charged per day or once per event.", "For example: AC, generator backup, stage decoration, sound system.")}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: 1, borderRadius: 14, padding: 12 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  item: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 10, paddingLeft: 10, marginTop: 8 },
});
