import React, { useCallback, useLayoutEffect, useState } from "react";
import { ActivityIndicator, Image, Linking, RefreshControl, ScrollView, Share, View } from "react-native";
import { Button, Chip, SegmentedButtons, Snackbar, Text } from "react-native-paper";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useAppTheme } from "../../hooks/useAppTheme";
import { useAuth } from "../../context/AuthContext";
import { useTx } from "../../i18n/site";
import { getInvite, qrImageUrl, type InviteInfo } from "../../api/moitech";
import { Empty, moiStyles, Stat } from "./moiUi";

const longDay = (d?: string) => (d ? new Date(d).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "");

/** Invitations: send the function invitation on WhatsApp; guests reply coming or not, with how many people. */
export default function InvitationsScreen() {
  const { theme } = useAppTheme();
  const c = theme.colors;
  const tx = useTx();
  const navigation = useNavigation();
  const { user } = useAuth();
  const functionId = Number(user?.functionId) || 0;
  const [data, setData] = useState<InviteInfo | null>(null);
  const [tab, setTab] = useState("coming");
  const [message, setMessage] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  useLayoutEffect(() => navigation.setOptions({ title: tx("Invitations") }), [navigation, tx]);
  const load = useCallback(async () => {
    if (!functionId) return setMessage(tx("Choose one of your functions first."));
    const r = await getInvite(functionId);
    setRefreshing(false);
    if (r.ok && r.data) setData(r.data);
    else setMessage(tx(r.message));
  }, [functionId, tx]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const text = data ? [
    `🙏 ${data.functionName}`, data.funPersionNames, `📅 ${longDay(data.functionDate)}`, data.mahalName ? `📍 ${data.mahalName}` : null, data.funMessage, "",
    `${tx("Please let us know if you are coming")}: ${data.url}`,
  ].filter((x) => x !== null && x !== undefined).join("\n") : "";
  const shown = (data?.replies ?? []).filter((r) => (tab === "coming" ? r.coming : !r.coming));

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} />}>
        <Text style={{ color: c.textMuted, marginBottom: 10 }}>{tx("Send the invitation on WhatsApp. Guests reply coming or not, so you know how many to cook for.")}</Text>
        {!data ? (functionId ? <ActivityIndicator color={c.primary} /> : null) : (
          <>
            <View style={[moiStyles.card, { backgroundColor: c.card, gap: 10 }]}>
              <Text style={{ color: c.text, fontWeight: "800" }}>{tx("Invitation message")}</Text>
              <Text selectable style={{ color: c.text, backgroundColor: c.background, padding: 10, borderRadius: 10 }}>{text}</Text>
              <View style={moiStyles.wrap}>
                <Button mode="contained" icon="whatsapp" buttonColor="#16a34a" onPress={() => void Linking.openURL(`https://wa.me/?text=${encodeURIComponent(text)}`)}>{tx("Share on WhatsApp")}</Button>
                <Button icon="share-variant" onPress={() => void Share.share({ message: text })}>{tx("Share")}</Button>
                <Button icon="open-in-new" onPress={() => void Linking.openURL(data.url)}>{tx("Open page")}</Button>
              </View>
              <Text style={{ color: c.text, fontWeight: "700" }}>{tx("QR for printed invitations")}</Text>
              <Image source={{ uri: qrImageUrl(data.url) }} style={{ width: 160, height: 160, backgroundColor: "#fff", alignSelf: "center" }} />
            </View>
            <View style={[moiStyles.wrap, { marginBottom: 12 }]}>
              <Stat label={tx("Families coming")} value={data.coming} color="#16a34a" />
              <Stat label={tx("Expected guests")} value={data.expectedGuests} color={c.primary} />
              <Stat label={tx("Not coming")} value={data.notComing} color="#b45309" />
            </View>
            <SegmentedButtons value={tab} onValueChange={setTab} style={{ marginBottom: 12 }}
              buttons={[{ value: "coming", label: `${tx("Coming")} (${data.coming})` }, { value: "not", label: `${tx("Not coming")} (${data.notComing})` }]} />
            {shown.length === 0 ? <Empty icon="email-outline" title={tx("No replies yet")} text={tx("Replies appear here as guests answer the invitation.")} /> : (
              <View style={[moiStyles.card, { backgroundColor: c.card }]}>
                {shown.map((r) => (
                  <View key={r.id} style={moiStyles.row}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: c.text, fontWeight: "700" }}>{r.name}</Text>
                      <Text style={{ color: c.textMuted, fontSize: 12 }}>{[r.place, r.phone, r.note].filter(Boolean).join(" · ")}</Text>
                    </View>
                    {r.coming && <Chip compact>{tx("{{n}} people", { n: r.guests })}</Chip>}
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
      <Snackbar visible={!!message} onDismiss={() => setMessage("")}>{message}</Snackbar>
    </View>
  );
}
