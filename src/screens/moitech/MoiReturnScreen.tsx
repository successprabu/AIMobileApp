import React, { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { ActivityIndicator, Alert, Linking, RefreshControl, ScrollView, View } from "react-native";
import { Button, Chip, FAB, SegmentedButtons, Snackbar, Text, TextInput } from "react-native-paper";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useAppTheme } from "../../hooks/useAppTheme";
import { useTx } from "../../i18n/site";
import Sheet from "../../components/ui/Sheet";
import { compareGiven } from "../../api/moiGiven";
import { deleteInvite, fullName, inr, listInvites, saveInvite, setInviteStatus, type Invite, type InviteList } from "../../api/moitech";
import { dayText, Empty, moiStyles } from "./moiUi";

type Form = { id: number; name: string; initial: string; place: string; phone: string; eventName: string; eventDate: string; plannedAmount: string; remarks: string };
const blank: Form = { id: 0, name: "", initial: "", place: "", phone: "", eventName: "", eventDate: "", plannedAmount: "", remarks: "" };
type Hist = { key: string; name: string; initial?: string | null; place?: string | null; phone?: string | null; theyGave: number; weGave: number };

const calendarLink = (e: Invite) => {
  const d = e.eventDate.slice(0, 10).replace(/-/g, "");
  const next = new Date(new Date(e.eventDate.slice(0, 10)).getTime() + 86400000).toISOString().slice(0, 10).replace(/-/g, "");
  const text = `Moi: ${fullName(e)}${e.eventName ? ` - ${e.eventName}` : ""}`;
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(text)}&dates=${d}/${next}&details=${encodeURIComponent(`They gave us ${inr(e.theyGave)}`)}`;
};

/** Moi to return: invitations we got, with what each person gave us before, so the family knows what to give back. */
export default function MoiReturnScreen() {
  const { theme } = useAppTheme();
  const c = theme.colors;
  const tx = useTx();
  const navigation = useNavigation();
  const [tab, setTab] = useState("Planned");
  const [data, setData] = useState<InviteList | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [hist, setHist] = useState<Hist[] | null>(null);
  const [giving, setGiving] = useState<Invite | null>(null);
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  useLayoutEffect(() => navigation.setOptions({ title: tx("Moi to return") }), [navigation, tx]);
  const load = useCallback(async () => {
    const r = await listInvites(tab);
    setRefreshing(false);
    if (r.ok && r.data) setData(r.data);
    else {
      setData({ items: [], planned: 0, given: 0, skipped: 0, dueWeek: 0 });
      setMessage(tx(r.message));
    }
  }, [tab, tx]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  useEffect(() => {
    if (!form) return undefined;
    const q = (form.phone.replace(/\D/g, "").length >= 10 ? form.phone : form.name).trim();
    if (q.length < 3) {
      setHist(null);
      return undefined;
    }
    const t = setTimeout(async () => {
      const r = await compareGiven(undefined, q);
      if (r.ok && r.data) setHist(((r.data as unknown as { items: Hist[] }).items ?? []).slice(0, 4));
    }, 400);
    return () => clearTimeout(t);
  }, [form?.name, form?.phone]);

  const save = async () => {
    if (!form) return;
    if (form.name.trim().length < 2) return setMessage(tx("Enter the name."));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.eventDate)) return setMessage(tx("Enter the function date."));
    const r = await saveInvite({ ...form, plannedAmount: form.plannedAmount === "" ? null : Number(form.plannedAmount) });
    setMessage(tx(r.message || "Saved"));
    if (r.ok) {
      setForm(null);
      void load();
    }
  };
  const status = async (e: Invite, s: string, amt?: number) => {
    const r = await setInviteStatus({ id: e.id, status: s, amount: amt });
    setMessage(tx(r.message || "Saved"));
    if (r.ok) {
      setGiving(null);
      void load();
    }
  };
  const more = (e: Invite) =>
    Alert.alert(fullName(e), undefined, [
      ...(e.status !== "Given" ? [{ text: tx("Edit"), onPress: () => setForm({ ...blank, ...e, initial: e.initial ?? "", place: e.place ?? "", phone: e.phone ?? "", eventName: e.eventName ?? "", eventDate: e.eventDate.slice(0, 10), plannedAmount: e.plannedAmount ? String(e.plannedAmount) : "", remarks: e.remarks ?? "" }) }] : []),
      ...(e.status === "Skipped" ? [{ text: tx("Move back to To attend"), onPress: () => void status(e, "Planned") }] : []),
      { text: tx("Delete"), style: "destructive" as const, onPress: async () => { const r = await deleteInvite(e.id); if (r.ok) void load(); else setMessage(tx(r.message)); } },
      { text: tx("Close"), style: "cancel" as const },
    ]);
  const due = (n: number) => (n < 0 ? tx("{{n}} days ago", { n: -n }) : n === 0 ? tx("Today") : n === 1 ? tx("Tomorrow") : tx("In {{n}} days", { n }));

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 96 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} />}>
        <Text style={{ color: c.textMuted, marginBottom: 10 }}>{tx("When you get an invitation, add it here. You will see what that person gave at your functions and what you gave them before.")}</Text>
        {!!data?.dueWeek && tab === "Planned" && <Text style={{ color: "#b45309", fontWeight: "700", marginBottom: 8 }}>{tx("{{n}} functions to attend in the next 7 days.", { n: data.dueWeek })}</Text>}
        <SegmentedButtons value={tab} onValueChange={(v) => { setData(null); setTab(v); }} style={{ marginBottom: 12 }}
          buttons={[{ value: "Planned", label: `${tx("To attend")} (${data?.planned ?? "…"})` }, { value: "Given", label: tx("Given") }, { value: "Skipped", label: tx("Skipped") }]} />
        {!data ? <ActivityIndicator color={c.primary} /> : data.items.length === 0 ? (
          <Empty icon="calendar-heart" title={tx("Nothing here yet")} text={tx("Add each invitation you get, with the date, and plan the moi to give.")} />
        ) : data.items.map((e) => (
          <View key={e.id} style={[moiStyles.card, { backgroundColor: c.card, gap: 6 }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: c.text, fontWeight: "800" }} onPress={() => more(e)}>{fullName(e)}</Text>
                <Text style={{ color: c.textMuted, fontSize: 12 }}>{[e.place, e.eventName].filter(Boolean).join(" · ")}</Text>
              </View>
              <Chip compact style={{ backgroundColor: tab === "Planned" && e.daysLeft >= 0 && e.daysLeft <= 7 ? "#fde68a" : undefined }}>
                {`${dayText(e.eventDate)}${tab === "Planned" ? ` · ${due(e.daysLeft)}` : ""}`}
              </Chip>
            </View>
            <View style={moiStyles.wrap}>
              <Chip compact icon="arrow-bottom-left">{`${tx("They gave")} ${inr(e.theyGave)}`}</Chip>
              <Chip compact icon="arrow-top-right">{`${tx("We gave")} ${inr(e.weGave)}`}</Chip>
              {!!e.plannedAmount && <Chip compact selected>{`${tx(tab === "Given" ? "Given" : "To give")} ${inr(e.plannedAmount)}`}</Chip>}
            </View>
            {tab === "Planned" && (
              <View style={{ flexDirection: "row", justifyContent: "flex-end", flexWrap: "wrap" }}>
                <Button compact icon="bell-outline" onPress={() => void Linking.openURL(calendarLink(e))}>{tx("Remind me")}</Button>
                <Button compact onPress={() => void status(e, "Skipped")}>{tx("Skip")}</Button>
                <Button compact mode="contained" buttonColor="#16a34a" onPress={() => { setGiving(e); setAmount(String(e.plannedAmount || e.theyGave || "")); }}>{tx("Mark given")}</Button>
              </View>
            )}
          </View>
        ))}
      </ScrollView>
      <FAB icon="plus" label={tx("Add invitation")} color="#fff" style={[moiStyles.fab, { backgroundColor: c.primary }]} onPress={() => { setHist(null); setForm(blank); }} />

      <Sheet visible={!!form} title={tx(form?.id ? "Edit invitation" : "New invitation")} onClose={() => setForm(null)}>
        {form && (
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TextInput dense mode="outlined" label={tx("Name")} value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} style={{ flex: 1 }} />
              <TextInput dense mode="outlined" label={tx("Initial")} value={form.initial} onChangeText={(v) => setForm({ ...form, initial: v })} style={{ width: 90 }} />
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TextInput dense mode="outlined" label={tx("Place")} value={form.place} onChangeText={(v) => setForm({ ...form, place: v })} style={{ flex: 1 }} />
              <TextInput dense mode="outlined" label={tx("Mobile")} keyboardType="phone-pad" value={form.phone} onChangeText={(v) => setForm({ ...form, phone: v })} style={{ flex: 1 }} />
            </View>
            {hist && hist.length > 0 && (
              <View style={{ backgroundColor: c.background, borderRadius: 12, padding: 8 }}>
                <Text style={{ color: c.text, fontWeight: "700", marginBottom: 4 }}>{tx("Past give & take")}</Text>
                {hist.map((p) => (
                  <View key={p.key} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={{ color: c.text, flex: 1 }} numberOfLines={1}>{fullName(p)} · {p.place}</Text>
                    <Text style={{ color: "#16a34a", fontSize: 12 }}>↙ {inr(p.theyGave)}</Text>
                    <Text style={{ color: c.textMuted, fontSize: 12 }}>↗ {inr(p.weGave)}</Text>
                    <Button compact onPress={() => setForm({ ...form, name: p.name, initial: p.initial ?? "", place: p.place ?? "", phone: p.phone ?? form.phone, plannedAmount: form.plannedAmount || (p.theyGave ? String(p.theyGave) : "") })}>{tx("Use")}</Button>
                  </View>
                ))}
              </View>
            )}
            {hist && hist.length === 0 && <Text style={{ color: c.textMuted, fontSize: 12 }}>{tx("No past moi found for this name.")}</Text>}
            <TextInput dense mode="outlined" label={tx("Their function")} placeholder={tx("e.g. Arun wedding")} value={form.eventName} onChangeText={(v) => setForm({ ...form, eventName: v })} />
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TextInput dense mode="outlined" label={`${tx("Function date")} (YYYY-MM-DD)`} value={form.eventDate} onChangeText={(v) => setForm({ ...form, eventDate: v.slice(0, 10) })} style={{ flex: 1 }} />
              <TextInput dense mode="outlined" keyboardType="numeric" label={tx("Moi to give")} value={form.plannedAmount} onChangeText={(v) => setForm({ ...form, plannedAmount: v.replace(/[^\d.]/g, "") })} style={{ flex: 1 }} />
            </View>
            <TextInput dense mode="outlined" label={tx("Note")} value={form.remarks} onChangeText={(v) => setForm({ ...form, remarks: v })} />
            <Button mode="contained" onPress={save} style={{ borderRadius: 12 }}>{tx("Save")}</Button>
          </View>
        )}
      </Sheet>
      <Sheet visible={!!giving} title={tx("How much did you give?")} onClose={() => setGiving(null)}>
        <View style={{ gap: 10 }}>
          <Text style={{ color: c.textMuted }}>{tx("It is added to Moi we gave.")}</Text>
          <TextInput mode="outlined" keyboardType="numeric" label={tx("Amount")} value={amount} onChangeText={(v) => setAmount(v.replace(/[^\d.]/g, ""))} left={<TextInput.Affix text="₹" />} />
          <Button mode="contained" buttonColor="#16a34a" disabled={!(Number(amount) > 0)} onPress={() => giving && void status(giving, "Given", Number(amount))}>{tx("Save")}</Button>
        </View>
      </Sheet>
      <Snackbar visible={!!message} onDismiss={() => setMessage("")}>{message}</Snackbar>
    </View>
  );
}
