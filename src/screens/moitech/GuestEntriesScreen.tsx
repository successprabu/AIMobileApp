import React, { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, Linking, RefreshControl, ScrollView, Share, View } from "react-native";
import { Button, Chip, SegmentedButtons, Snackbar, Text, TextInput } from "react-native-paper";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useAppTheme } from "../../hooks/useAppTheme";
import { useAuth } from "../../context/AuthContext";
import { useTx } from "../../i18n/site";
import Sheet from "../../components/ui/Sheet";
import { decideGuestEntry, getGuestQr, inr, listGuestEntries, qrImageUrl, resetGuestQr, type GuestEntry, type GuestQr } from "../../api/moitech";
import { Empty, esc, moiStyles, sharePdf } from "./moiUi";

type Edit = { villageName: string; initial: string; name: string; amount: string; payMode: string };

function EntryCard({ e, onDone }: { e: GuestEntry; onDone: (msg: string, id: number) => void }) {
  const { theme } = useAppTheme();
  const c = theme.colors;
  const tx = useTx();
  const [f, setF] = useState<Edit>({ villageName: e.villageName, initial: e.initial ?? "", name: e.name, amount: String(e.amount), payMode: e.payMode });
  const [busy, setBusy] = useState(false);
  const decide = async (accept: boolean) => {
    setBusy(true);
    const r = await decideGuestEntry({ id: e.id, accept, ...f, amount: Number(f.amount) || 0 });
    setBusy(false);
    if (r.ok) onDone(tx(r.message), e.id);
    else Alert.alert(tx(r.message));
  };
  return (
    <View style={[moiStyles.card, { backgroundColor: c.card, gap: 8 }]}>
      <TextInput dense mode="outlined" label={tx("Place")} value={f.villageName} onChangeText={(v) => setF({ ...f, villageName: v })} />
      <View style={{ flexDirection: "row", gap: 8 }}>
        <TextInput dense mode="outlined" label={tx("Initial")} value={f.initial} onChangeText={(v) => setF({ ...f, initial: v })} style={{ width: 90 }} />
        <TextInput dense mode="outlined" label={tx("Name")} value={f.name} onChangeText={(v) => setF({ ...f, name: v })} style={{ flex: 1 }} />
      </View>
      <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
        <TextInput dense mode="outlined" label={tx("Amount")} keyboardType="numeric" value={f.amount} onChangeText={(v) => setF({ ...f, amount: v.replace(/[^\d.]/g, "") })} style={{ flex: 1 }} />
        <SegmentedButtons density="small" style={{ flex: 1.3 }} value={f.payMode} onValueChange={(v) => setF({ ...f, payMode: v })}
          buttons={[{ value: "Cash", label: tx("Cash") }, { value: "Online", label: tx("Online") }]} />
      </View>
      <Text style={{ color: c.textMuted, fontSize: 12 }}>
        {[new Date(e.createdDt.endsWith("Z") ? e.createdDt : `${e.createdDt}Z`).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }), e.phoneNo, e.note, e.upiRef ? `UPI ref ${e.upiRef}` : null].filter(Boolean).join(" · ")}
      </Text>
      {f.payMode === "Online" && <Text style={{ color: c.warning ?? "#b45309", fontSize: 12 }}>{tx("Accept only after the payment shows in the family bank or UPI app. If unsure, ask the account owner to confirm.")}</Text>}
      <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8 }}>
        <Button textColor={c.danger} disabled={busy} onPress={() => decide(false)}>{tx("Reject")}</Button>
        <Button mode="contained" buttonColor="#16a34a" disabled={busy} onPress={() => decide(true)}>{tx("Accept")}</Button>
      </View>
    </View>
  );
}

/** Helpers: moi that guests typed in by scanning the counter QR; accept each as a receipt. Refreshes every 10 s. */
export default function GuestEntriesScreen() {
  const { theme } = useAppTheme();
  const c = theme.colors;
  const tx = useTx();
  const navigation = useNavigation();
  const { user } = useAuth();
  const functionId = Number(user?.functionId) || 0;
  const [tab, setTab] = useState("Pending");
  const [data, setData] = useState<{ items: GuestEntry[]; pending: number } | null>(null);
  const [message, setMessage] = useState("");
  const [qr, setQr] = useState<GuestQr | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useLayoutEffect(() => navigation.setOptions({ title: tx("Guest entries") }), [navigation, tx]);

  const load = useCallback(async () => {
    if (!functionId) {
      setData({ items: [], pending: 0 });
      setMessage(tx("Choose one of your functions first."));
      return;
    }
    const r = await listGuestEntries(functionId, tab);
    setRefreshing(false);
    if (r.ok && r.data) setData(r.data);
    else {
      setData((d) => d ?? { items: [], pending: 0 });
      setMessage(tx(r.message));
    }
  }, [functionId, tab, tx]);

  useFocusEffect(useCallback(() => {
    void load();
    const t = setInterval(() => void load(), 10000);
    return () => clearInterval(t);
  }, [load]));
  useEffect(() => setData(null), [tab]);

  const showQr = async () => {
    const r = await getGuestQr(functionId);
    if (r.ok && r.data) setQr(r.data);
    else setMessage(tx(r.message));
  };
  const reset = () =>
    Alert.alert(tx("Make a new QR? The old QR and its printed copies will stop working."), undefined, [
      { text: tx("Cancel"), style: "cancel" },
      { text: tx("New QR"), onPress: async () => { const r = await resetGuestQr(functionId); setMessage(tx(r.message)); if (r.ok && r.data) setQr(r.data); } },
    ]);
  const poster = async () => {
    if (!qr) return;
    await sharePdf(`<!doctype html><html><head><meta charset="utf-8"><style>@page{size:A4;margin:16mm} body{font-family:sans-serif;text-align:center}
      h1{font-size:30px;margin:10px 0 4px} img{width:110mm;height:110mm;margin:20px auto;display:block} .big{font-size:26px;font-weight:800}</style></head><body>
      <h1>${esc(qr.functionName)}</h1><div>${esc(qr.funPersionNames)}</div><img src="${qrImageUrl(qr.url, 12)}"/>
      <div class="big">Scan to write your moi</div><div style="font-size:22px">மொய் எழுத ஸ்கேன் செய்யுங்கள்</div></body></html>`, qr.functionName);
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} />}>
        <Text style={{ color: c.textMuted, marginBottom: 10 }}>{tx("Moi that guests typed in by scanning the QR. Check each one, fix spelling if needed, and accept it as a receipt.")}</Text>
        <Button mode="contained" icon="qrcode" onPress={showQr} disabled={!functionId} style={{ marginBottom: 12, borderRadius: 12 }}>{tx("Show guest QR")}</Button>
        <SegmentedButtons value={tab} onValueChange={setTab} style={{ marginBottom: 12 }}
          buttons={[{ value: "Pending", label: `${tx("Waiting")}${data?.pending ? ` (${data.pending})` : ""}` }, { value: "Accepted", label: tx("Accepted") }, { value: "Rejected", label: tx("Rejected") }]} />
        {!data ? <ActivityIndicator color={c.primary} /> : data.items.length === 0 ? (
          <Empty icon="account-group-outline" title={tx(tab === "Pending" ? "No guest entries waiting" : "Nothing here yet")} text={tx("Print the guest QR and keep it at the moi counter. Entries appear here as guests send them.")} />
        ) : tab === "Pending" ? data.items.map((e) => (
          <EntryCard key={e.id} e={e} onDone={(msg, id) => { setMessage(msg); setData((d) => d && { ...d, items: d.items.filter((x) => x.id !== id), pending: Math.max(0, d.pending - 1) }); }} />
        )) : (
          <View style={[moiStyles.card, { backgroundColor: c.card }]}>
            {data.items.map((e) => (
              <View key={e.id} style={moiStyles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.text, fontWeight: "700" }}>{[e.initial, e.name].filter(Boolean).join(". ")}</Text>
                  <Text style={{ color: c.textMuted, fontSize: 12 }}>{[e.villageName, e.decidedBy].filter(Boolean).join(" · ")}</Text>
                </View>
                {e.payMode === "Online" && <Chip compact>{tx("Online")}</Chip>}
                <Text style={{ color: c.text, fontWeight: "800" }}>{inr(e.amount)}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
      <Sheet visible={!!qr} title={qr?.functionName} onClose={() => setQr(null)}>
        {qr && (
          <View style={{ alignItems: "center", gap: 10 }}>
            <Text style={{ color: c.textMuted, textAlign: "center" }}>{tx("Guests scan this and type in their own moi. A helper accepts each entry.")}</Text>
            <Image source={{ uri: qrImageUrl(qr.url) }} style={{ width: 230, height: 230, backgroundColor: "#fff" }} />
            <Text style={{ color: c.textMuted, fontSize: 12 }} selectable>{qr.url}</Text>
            <View style={moiStyles.wrap}>
              <Button mode="contained" icon="printer" onPress={poster}>{tx("Print poster")}</Button>
              <Button icon="share-variant" onPress={() => void Share.share({ message: qr.url })}>{tx("Share")}</Button>
              <Button icon="open-in-new" onPress={() => void Linking.openURL(qr.url)}>{tx("Open page")}</Button>
            </View>
            {user?.userType !== "NU" && <Button textColor={c.textMuted} onPress={reset}>{tx("New QR")}</Button>}
          </View>
        )}
      </Sheet>
      <Snackbar visible={!!message} onDismiss={() => setMessage("")}>{message}</Snackbar>
    </View>
  );
}
