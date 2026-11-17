import React, { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { ActivityIndicator, FlatList, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { Button, Searchbar, Snackbar, Text, TextInput } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useAppTheme } from "../../hooks/useAppTheme";
import type { MainStackParamList } from "../../navigation/types";
import { getEnquiry, listEnquiries, replyToEnquiry, setEnquiryStatus, timeAgo, waDigits, type Enquiry, type EnquiryStatus, type EnquirySummary } from "../../api/admin";
import { FadeIn } from "../../components/mahal/MahalUi";
import Sheet from "../../components/ui/Sheet";

type Nav = NativeStackNavigationProp<MainStackParamList>;
const TABS: { key: EnquiryStatus | ""; label: string }[] = [
  { key: "New", label: "New" },
  { key: "Replied", label: "Replied" },
  { key: "Closed", label: "Closed" },
  { key: "", label: "All" },
];
const PAGE = 20;

/** Super admin: messages from the website contact form; reply by email or WhatsApp. */
export default function EnquiriesScreen() {
  const { theme } = useAppTheme();
  const c = theme.colors;
  const navigation = useNavigation<Nav>();
  const tone: Record<EnquiryStatus, string> = { New: "#0ea5e9", Replied: c.success, Closed: c.textMuted };
  const [tab, setTab] = useState<EnquiryStatus | "">("New");
  const [search, setSearch] = useState("");
  const [applied, setApplied] = useState("");
  const [items, setItems] = useState<EnquirySummary[]>([]);
  const [counts, setCounts] = useState<Partial<Record<EnquiryStatus, number>>>({});
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  useLayoutEffect(() => navigation.setOptions({ title: "Enquiries" }), [navigation]);

  const load = useCallback(
    async (pageNo = 1) => {
      setLoading(true);
      const r = await listEnquiries({ status: tab, search: applied, page: pageNo, pageSize: PAGE });
      setLoading(false);
      setRefreshing(false);
      if (!r.ok || !r.data) {
        setMessage(r.message);
        if (pageNo === 1) setItems([]);
        return;
      }
      setItems((prev) => (pageNo === 1 ? r.data!.items : [...prev, ...r.data!.items]));
      setCounts(r.data.counts ?? {});
      setTotal(r.data.total);
      setPage(pageNo);
    },
    [tab, applied]
  );

  useFocusEffect(
    useCallback(() => {
      void load(1);
    }, [load])
  );

  const allCount = (counts.New ?? 0) + (counts.Replied ?? 0) + (counts.Closed ?? 0);

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <View style={{ padding: 16, paddingBottom: 6, gap: 10 }}>
        <Searchbar
          placeholder="Search name, phone, email or text"
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={() => setApplied(search.trim())}
          onClearIconPress={() => { setSearch(""); setApplied(""); }}
          style={{ borderRadius: 14, backgroundColor: c.card }}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8 }}>
          {TABS.map((tb) => {
            const on = tab === tb.key;
            const n = tb.key ? counts[tb.key] ?? 0 : allCount;
            return (
              <Pressable key={tb.label} onPress={() => setTab(tb.key)} style={[styles.pill, { backgroundColor: on ? c.primary : c.card, borderColor: on ? c.primary : c.border }]}>
                <Text style={{ color: on ? "#fff" : c.text, fontWeight: on ? "800" : "600" }}>{tb.label}</Text>
                <View style={[styles.count, { backgroundColor: on ? "rgba(255,255,255,0.25)" : tb.key === "New" && n > 0 ? "#0ea5e9" : c.chipBg }]}>
                  <Text style={{ color: on || (tb.key === "New" && n > 0) ? "#fff" : c.textMuted, fontSize: 12, fontWeight: "700" }}>{n}</Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
      <FlatList
        data={items}
        keyExtractor={(e) => String(e.id)}
        contentContainerStyle={{ padding: 16, paddingTop: 6, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(1); }} />}
        onEndReachedThreshold={0.4}
        onEndReached={() => !loading && items.length < total && void load(page + 1)}
        ListEmptyComponent={
          loading ? <ActivityIndicator style={{ marginTop: 40 }} color={c.primary} /> : (
            <FadeIn style={{ alignItems: "center", padding: 32 }}>
              <MaterialCommunityIcons name="inbox-outline" size={52} color={c.textMuted} />
              <Text style={{ color: c.text, fontWeight: "700", marginTop: 8 }}>{tab === "New" ? "No new enquiries" : "Nothing here"}</Text>
              <Text style={{ color: c.textMuted, textAlign: "center", marginTop: 4 }}>Messages sent from the website contact form appear here.</Text>
            </FadeIn>
          )
        }
        renderItem={({ item: e, index }) => (
          <FadeIn index={index % PAGE}>
            <Pressable onPress={() => setOpenId(e.id)} style={({ pressed }) => [styles.card, { backgroundColor: c.card, borderLeftColor: tone[e.status], opacity: pressed ? 0.85 : 1 }]} accessibilityLabel={`Enquiry from ${e.name}`}>
              <View style={styles.rowBetween}>
                <Text style={{ color: c.text, fontWeight: e.status === "New" ? "800" : "600", fontSize: 15, flex: 1 }} numberOfLines={1}>{e.name}</Text>
                <Text style={{ color: c.textMuted, fontSize: 12 }}>{timeAgo(e.createdDt)}</Text>
              </View>
              <Text style={{ color: c.primary, fontSize: 12, fontWeight: "700", marginTop: 2 }}>{e.topic}</Text>
              <Text style={{ color: c.textMuted, marginTop: 4 }} numberOfLines={2}>{e.preview}</Text>
            </Pressable>
          </FadeIn>
        )}
      />
      <EnquiryDetail id={openId} onClose={() => setOpenId(null)} onChanged={(m) => { setMessage(m); void load(1); }} />
      <Snackbar visible={!!message} onDismiss={() => setMessage("")}>{message}</Snackbar>
    </View>
  );
}

function EnquiryDetail({ id, onClose, onChanged }: { id: number | null; onClose: () => void; onChanged: (m: string) => void }) {
  const { theme } = useAppTheme();
  const c = theme.colors;
  const [e, setE] = useState<Enquiry | null>(null);
  const [error, setError] = useState("");
  const [channel, setChannel] = useState<"email" | "whatsapp">("email");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (id == null) return;
    setE(null);
    setError("");
    setText("");
    void getEnquiry(id).then((r) => {
      if (r.ok && r.data) {
        setE(r.data);
        setChannel(r.data.email ? "email" : "whatsapp");
      } else setError(r.message);
    });
  }, [id]);

  const reload = async () => {
    if (id == null) return;
    const r = await getEnquiry(id);
    if (r.ok && r.data) setE(r.data);
  };

  const send = async () => {
    if (!e || text.trim().length < 2) return;
    setBusy(true);
    const r = await replyToEnquiry(e.id, text.trim(), channel);
    setBusy(false);
    if (r.ok) {
      if (channel === "whatsapp") {
        const url = r.data?.whatsappUrl || `https://wa.me/${waDigits(e.phone)}?text=${encodeURIComponent(text.trim())}`;
        void Linking.openURL(url);
      }
      setText("");
      onChanged(r.message || "Reply sent");
      void reload();
    } else setError(r.message);
  };

  const status = async (s: EnquiryStatus) => {
    if (!e) return;
    setBusy(true);
    const r = await setEnquiryStatus(e.id, s);
    setBusy(false);
    if (r.ok) {
      onChanged(s === "Closed" ? "Enquiry closed" : "Enquiry reopened");
      void reload();
    } else setError(r.message);
  };

  return (
    <Sheet visible={id != null} title={e?.name ?? "Enquiry"} onClose={onClose}>
      {!e ? (
        error ? <Text style={{ color: c.danger }}>{error}</Text> : <ActivityIndicator color={c.primary} style={{ margin: 30 }} />
      ) : (
        <>
          <Text style={{ color: c.primary, fontWeight: "700" }}>{e.topic}</Text>
          <Text style={{ color: c.textMuted, fontSize: 12 }}>{new Date(/[zZ]$/.test(e.createdDt) ? e.createdDt : `${e.createdDt}Z`).toLocaleString("en-IN")}</Text>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            {!!e.phone && <Button compact mode="outlined" icon="phone" onPress={() => Linking.openURL(`tel:${e.phone}`)}>{e.phone}</Button>}
            {!!e.email && <Button compact mode="outlined" icon="email-outline" onPress={() => Linking.openURL(`mailto:${e.email}`)}>Email</Button>}
          </View>
          <View style={[styles.messageBox, { backgroundColor: c.chipBg }]}>
            <Text style={{ color: c.text, lineHeight: 22 }}>{e.message}</Text>
          </View>

          {!!e.replies?.length && (
            <View style={{ marginTop: 14 }}>
              <Text style={{ color: c.textMuted, fontSize: 12, fontWeight: "700", letterSpacing: 1 }}>REPLIES ({e.replies.length})</Text>
              {e.replies.map((r, i) => (
                <View key={i} style={[styles.reply, { borderColor: c.border }]}>
                  <View style={styles.rowBetween}>
                    <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
                      <MaterialCommunityIcons name={r.channel === "whatsapp" ? "whatsapp" : "email-outline"} size={16} color={r.channel === "whatsapp" ? "#16a34a" : c.primary} />
                      <Text style={{ color: c.textMuted, fontSize: 12 }}>{r.createdBy}</Text>
                    </View>
                    <Text style={{ color: c.textMuted, fontSize: 12 }}>{timeAgo(r.createdDt)}</Text>
                  </View>
                  <Text style={{ color: c.text, marginTop: 4 }}>{r.message}</Text>
                  {r.delivered === false && !!r.error && <Text style={{ color: c.danger, fontSize: 12 }}>Not delivered: {r.error}</Text>}
                </View>
              ))}
            </View>
          )}

          <Text style={{ color: c.text, fontWeight: "700", marginTop: 18, marginBottom: 8 }}>Reply</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {(["email", "whatsapp"] as const).map((ch) => {
              const on = channel === ch;
              const disabled = ch === "email" ? !e.email : !e.phone;
              return (
                <Pressable key={ch} disabled={disabled} onPress={() => setChannel(ch)} style={[styles.pill, { backgroundColor: on ? c.primary : c.card, borderColor: on ? c.primary : c.border, opacity: disabled ? 0.4 : 1 }]}>
                  <MaterialCommunityIcons name={ch === "email" ? "email-outline" : "whatsapp"} size={16} color={on ? "#fff" : c.text} />
                  <Text style={{ color: on ? "#fff" : c.text, fontWeight: "700" }}>{ch === "email" ? "Email" : "WhatsApp"}</Text>
                </Pressable>
              );
            })}
          </View>
          <TextInput mode="outlined" multiline numberOfLines={4} value={text} onChangeText={setText} placeholder={channel === "email" ? `Reply to ${e.email}` : `WhatsApp reply to ${e.phone}`} style={{ marginTop: 10 }} />
          <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 4 }}>
            {channel === "email" ? "Sent from mysuccesstechnologies@gmail.com" : "Opens WhatsApp with this text, ready to send"}
          </Text>
          <Button mode="contained" icon={channel === "email" ? "send" : "whatsapp"} onPress={send} loading={busy} disabled={busy || text.trim().length < 2} style={{ marginTop: 10, borderRadius: 12 }} contentStyle={{ height: 48 }}>
            {channel === "email" ? "Send email" : "Open WhatsApp"}
          </Button>
          <Button icon={e.status === "Closed" ? "email-open-outline" : "check-circle-outline"} onPress={() => status(e.status === "Closed" ? "New" : "Closed")} disabled={busy} style={{ marginTop: 6 }}>
            {e.status === "Closed" ? "Reopen" : "Close enquiry"}
          </Button>
          {!!error && <Text style={{ color: c.danger, marginTop: 8 }}>{error}</Text>}
        </>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  pill: { flexDirection: "row", alignItems: "center", gap: 6, height: 36, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1 },
  count: { minWidth: 22, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  card: { padding: 14, borderRadius: 14, borderLeftWidth: 4, marginBottom: 10, elevation: 1, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  messageBox: { borderRadius: 12, padding: 14, marginTop: 14 },
  reply: { borderWidth: 1, borderRadius: 12, padding: 10, marginTop: 8 },
});
