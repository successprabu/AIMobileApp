import React, { useEffect, useLayoutEffect, useState } from "react";
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { Button, Chip, HelperText, Menu, Snackbar, Switch, Text, TextInput } from "react-native-paper";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useAppTheme } from "../../hooks/useAppTheme";
import type { MainStackParamList } from "../../navigation/types";
import { AMENITIES, EVENT_TYPES, getDistricts, getStates, listMyMahals, saveMahal } from "../../api/mahal";
import { FadeIn } from "../../components/mahal/MahalUi";

type Nav = NativeStackNavigationProp<MainStackParamList>;
type Option = { id: number; name: string };

const blank = {
  id: 0,
  mahalName: "",
  description: "",
  contactPerson: "",
  contactNumber: "",
  country: 1,
  state: 0,
  district: 0,
  addressLine1: "",
  addressLine2: "",
  landmark: "",
  pincode: "",
  capacity: "",
  diningCapacity: "",
  roomCount: "",
  pricePerDay: "",
  advanceAmount: "",
  amenities: [] as string[],
  eventTypes: ["Marriage", "Reception", "Engagement", "Birthday"] as string[],
  imageUrl: "",
  isOnlineBooking: true,
  isActive: true,
};

const digits = (v: string, max: number) => v.replace(/\D/g, "").slice(0, max);
const num = (v: string) => (v === "" ? null : Number(v));

/** Add or edit a hall: details shown on the booking site, capacity, rent, address and contact. */
export default function MahalFormScreen() {
  const { theme } = useAppTheme();
  const c = theme.colors;
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<MainStackParamList, "MahalForm">>();
  const mahalId = route.params?.mahalId;
  const [form, setForm] = useState(blank);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [states, setStates] = useState<Option[]>([]);
  const [districts, setDistricts] = useState<Option[]>([]);
  const [menu, setMenu] = useState<"state" | "district" | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useLayoutEffect(() => navigation.setOptions({ title: mahalId ? "Edit mahal" : "Add mahal" }), [navigation, mahalId]);

  useEffect(() => {
    void getStates(1).then((r) => setStates((r.data ?? []).map((s) => ({ id: s.id, name: s.stateName }))));
    if (mahalId) {
      void listMyMahals().then((r) => {
        const m = r.data?.find((x) => x.id === mahalId);
        if (!m) return;
        setForm({
          ...blank,
          ...m,
          description: m.description ?? "",
          contactPerson: m.contactPerson ?? "",
          contactNumber: m.contactNumber ?? "",
          state: m.state ?? 0,
          district: m.district ?? 0,
          addressLine1: m.addressLine1 ?? "",
          addressLine2: m.addressLine2 ?? "",
          landmark: m.landmark ?? "",
          pincode: m.pincode ? String(m.pincode) : "",
          capacity: m.capacity ? String(m.capacity) : "",
          diningCapacity: m.diningCapacity ? String(m.diningCapacity) : "",
          roomCount: m.roomCount ? String(m.roomCount) : "",
          pricePerDay: m.pricePerDay ? String(m.pricePerDay) : "",
          advanceAmount: m.advanceAmount ? String(m.advanceAmount) : "",
          amenities: m.amenities ?? [],
          eventTypes: m.eventTypes ?? [],
          imageUrl: m.imageUrl ?? "",
          isOnlineBooking: !!m.isOnlineBooking,
          isActive: m.isActive !== false,
        });
      });
    }
  }, [mahalId]);

  useEffect(() => {
    if (!form.state) {
      setDistricts([]);
      return;
    }
    void getDistricts(form.state).then((r) => setDistricts((r.data ?? []).map((d) => ({ id: d.id, name: d.districtName }))));
  }, [form.state]);

  const set = (k: keyof typeof blank, v: unknown) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: "" }));
  };
  const toggle = (k: "amenities" | "eventTypes", item: string) =>
    set(k, form[k].includes(item) ? form[k].filter((x) => x !== item) : [...form[k], item]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (form.mahalName.trim().length < 2) e.mahalName = "Enter the hall name";
    if (!form.addressLine1.trim()) e.addressLine1 = "Enter the address";
    if (!form.state) e.state = "Choose the state";
    if (!form.district) e.district = "Choose the district";
    if (form.pincode.length !== 6) e.pincode = "6 digit pincode";
    if (form.contactNumber && form.contactNumber.replace(/\D/g, "").length < 10) e.contactNumber = "Enter a valid phone number";
    if (form.imageUrl && !/^https?:\/\//i.test(form.imageUrl)) e.imageUrl = "Paste a link starting with https://";
    if (form.isOnlineBooking && form.eventTypes.length === 0) e.eventTypes = "Pick at least one event";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = async () => {
    if (saving || !validate()) {
      if (!saving) setMessage("Please check the highlighted fields.");
      return;
    }
    setSaving(true);
    const r = await saveMahal({
      ...form,
      pincode: Number(form.pincode),
      capacity: num(form.capacity),
      diningCapacity: num(form.diningCapacity),
      roomCount: num(form.roomCount),
      pricePerDay: num(form.pricePerDay),
      advanceAmount: num(form.advanceAmount),
    });
    setSaving(false);
    if (r.ok) navigation.goBack();
    else setMessage(r.message);
  };

  const field = (k: keyof typeof blank, label: string, extra: Partial<React.ComponentProps<typeof TextInput>> = {}) => (
    <>
      <TextInput mode="outlined" label={label} value={String(form[k] ?? "")} onChangeText={(v) => set(k, v)} error={!!errors[k]} style={styles.input} {...extra} />
      {!!errors[k] && <HelperText type="error">{errors[k]}</HelperText>}
    </>
  );

  const picker = (kind: "state" | "district", label: string, options: Option[], value: number) => (
    <View style={{ flex: 1 }}>
      <Menu
        visible={menu === kind}
        onDismiss={() => setMenu(null)}
        anchor={
          <Button mode="outlined" icon="chevron-down" contentStyle={{ flexDirection: "row-reverse", justifyContent: "space-between" }} style={[styles.input, { borderRadius: 8, borderColor: errors[kind] ? c.danger : c.border }]} disabled={kind === "district" && !form.state} onPress={() => setMenu(kind)}>
            {options.find((o) => o.id === value)?.name ?? label}
          </Button>
        }
      >
        <ScrollView style={{ maxHeight: 320 }}>
          {options.map((o) => (
            <Menu.Item key={o.id} title={o.name} onPress={() => { setMenu(null); if (kind === "state") setForm((f) => ({ ...f, state: o.id, district: 0 })); else set("district", o.id); }} />
          ))}
        </ScrollView>
      </Menu>
      {!!errors[kind] && <HelperText type="error">{errors[kind]}</HelperText>}
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <FadeIn style={[styles.card, { backgroundColor: form.isOnlineBooking ? c.primaryMuted : c.card }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.text, fontWeight: "800" }}>Take bookings online</Text>
              <Text style={{ color: c.textMuted, fontSize: 13 }}>Show this hall on the booking site so customers can check dates and send requests.</Text>
            </View>
            <Switch value={form.isOnlineBooking} onValueChange={(v) => set("isOnlineBooking", v)} color={c.primary} />
          </View>
        </FadeIn>

        <FadeIn index={1} style={[styles.card, { backgroundColor: c.card }]}>
          <Text style={[styles.section, { color: c.text }]}>About the hall</Text>
          {field("mahalName", "Mahal name *")}
          {field("description", "About the hall", { multiline: true, numberOfLines: 3, maxLength: 1000 })}
          <View style={styles.rowBetween}>
            <Text style={{ color: c.text }}>Active (shown and bookable)</Text>
            <Switch value={form.isActive} onValueChange={(v) => set("isActive", v)} color={c.primary} />
          </View>
        </FadeIn>

        <FadeIn index={2} style={[styles.card, { backgroundColor: c.card }]}>
          <Text style={[styles.section, { color: c.text }]}>Capacity and price</Text>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>{field("capacity", "Seating", { keyboardType: "number-pad", onChangeText: (v) => set("capacity", digits(v, 6)) })}</View>
            <View style={{ flex: 1 }}>{field("diningCapacity", "Dining", { keyboardType: "number-pad", onChangeText: (v) => set("diningCapacity", digits(v, 6)) })}</View>
            <View style={{ flex: 0.8 }}>{field("roomCount", "Rooms", { keyboardType: "number-pad", onChangeText: (v) => set("roomCount", digits(v, 4)) })}</View>
          </View>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>{field("pricePerDay", "Rent per day", { keyboardType: "number-pad", left: <TextInput.Affix text="₹" />, onChangeText: (v) => set("pricePerDay", digits(v, 9)) })}</View>
            <View style={{ flex: 1 }}>{field("advanceAmount", "Advance", { keyboardType: "number-pad", left: <TextInput.Affix text="₹" />, onChangeText: (v) => set("advanceAmount", digits(v, 9)) })}</View>
          </View>
          <Text style={[styles.sub, { color: c.text }]}>Events you host</Text>
          <View style={styles.wrap}>
            {EVENT_TYPES.map((e) => (
              <Chip key={e} selected={form.eventTypes.includes(e)} onPress={() => toggle("eventTypes", e)} style={form.eventTypes.includes(e) ? { backgroundColor: c.primaryMuted } : undefined}>{e}</Chip>
            ))}
          </View>
          {!!errors.eventTypes && <HelperText type="error">{errors.eventTypes}</HelperText>}
          <Text style={[styles.sub, { color: c.text }]}>Facilities</Text>
          <View style={styles.wrap}>
            {AMENITIES.map((a) => (
              <Chip key={a} selected={form.amenities.includes(a)} onPress={() => toggle("amenities", a)} style={form.amenities.includes(a) ? { backgroundColor: c.primaryMuted } : undefined}>{a}</Chip>
            ))}
          </View>
        </FadeIn>

        <FadeIn index={3} style={[styles.card, { backgroundColor: c.card }]}>
          <Text style={[styles.section, { color: c.text }]}>Address</Text>
          {field("addressLine1", "Address line 1 *")}
          {field("addressLine2", "Address line 2")}
          {field("landmark", "Landmark / area")}
          <View style={styles.row}>
            {picker("state", "State *", states, form.state)}
            {picker("district", "District *", districts, form.district)}
          </View>
          {field("pincode", "Pincode *", { keyboardType: "number-pad", onChangeText: (v) => set("pincode", digits(v, 6)) })}
        </FadeIn>

        <FadeIn index={4} style={[styles.card, { backgroundColor: c.card }]}>
          <Text style={[styles.section, { color: c.text }]}>Contact and photo</Text>
          {field("contactPerson", "Contact person")}
          {field("contactNumber", "Contact number (shown to customers)", { keyboardType: "phone-pad" })}
          {field("imageUrl", "Photo link (https://…)", { autoCapitalize: "none", keyboardType: "url" })}
          {/^https?:\/\//i.test(form.imageUrl) && <Image source={{ uri: form.imageUrl }} style={styles.preview} resizeMode="cover" />}
        </FadeIn>

        <Button mode="contained" icon="content-save" onPress={save} loading={saving} disabled={saving} style={styles.save} contentStyle={{ height: 52 }} labelStyle={{ fontSize: 16, fontWeight: "700" }}>
          {form.id ? "Save changes" : "Add mahal"}
        </Button>
      </ScrollView>
      <Snackbar visible={!!message} onDismiss={() => setMessage("")} duration={4000}>{message}</Snackbar>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, padding: 16, marginBottom: 14, elevation: 1, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  section: { fontWeight: "800", fontSize: 16, marginBottom: 4 },
  sub: { fontWeight: "700", marginTop: 14, marginBottom: 8 },
  input: { marginTop: 8 },
  row: { flexDirection: "row", gap: 10 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  preview: { height: 140, borderRadius: 12, marginTop: 10 },
  save: { borderRadius: 14, marginTop: 4 },
});
