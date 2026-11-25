import React, { useCallback, useLayoutEffect, useMemo, useState } from "react";
import { ActivityIndicator, Linking, RefreshControl, ScrollView, View } from "react-native";
import { Button, IconButton, ProgressBar, SegmentedButtons, Snackbar, Text, TextInput } from "react-native-paper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useAppTheme } from "../../hooks/useAppTheme";
import { useAuth } from "../../context/AuthContext";
import { useMessageLang, useTx } from "../../i18n/site";
import { fullName, inr, listThanks, markThanked, SITE, type ThankRow, type Thanks } from "../../api/moitech";
import { Empty, moiStyles } from "./moiUi";

const TEMPLATES: Record<"ta" | "en", string> = {
  ta: "வணக்கம் {name}, {function} விழாவில் நீங்கள் வழங்கிய ₹{amount} மொய்க்கு மனமார்ந்த நன்றி. உங்கள் வருகையும் வாழ்த்தும் எங்களுக்கு பெரும் மகிழ்ச்சி.\n- {family}",
  en: "Dear {name}, thank you for your moi of ₹{amount} at {function}. Your presence and blessings meant a lot to us.\n- {family}",
};
const KEY = "moitech.thanksTemplate";
const wa = (phone: string) => {
  const d = phone.replace(/\D/g, "");
  return d.length === 10 ? `91${d}` : d;
};

/** WhatsApp thank-you to every giver with a mobile number: one tap each, or Send next down the list. */
export default function ThankGiversScreen() {
  const { theme } = useAppTheme();
  const c = theme.colors;
  const tx = useTx();
  const navigation = useNavigation();
  const { user } = useAuth();
  const functionId = Number(user?.functionId) || 0;
  const [lang, setLang] = useState<"ta" | "en">(useMessageLang());
  const [templates, setTemplates] = useState(TEMPLATES);
  const [data, setData] = useState<Thanks | null>(null);
  const [tab, setTab] = useState("todo");
  const [message, setMessage] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  useLayoutEffect(() => navigation.setOptions({ title: tx("Thank your givers") }), [navigation, tx]);

  const load = useCallback(async () => {
    const saved = await AsyncStorage.getItem(KEY);
    if (saved) setTemplates({ ...TEMPLATES, ...JSON.parse(saved) });
    if (!functionId) {
      setMessage(tx("Choose one of your functions first."));
      setData({ function: { id: 0, functionName: "" }, items: [], total: 0, withPhone: 0, thanked: 0 });
      return;
    }
    const r = await listThanks(functionId);
    setRefreshing(false);
    if (r.ok && r.data) setData(r.data);
    else setMessage(tx(r.message));
  }, [functionId, tx]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const setTemplate = (v: string) => {
    const next = { ...templates, [lang]: v };
    setTemplates(next);
    void AsyncStorage.setItem(KEY, JSON.stringify(next));
  };
  const text = (e: ThankRow) =>
    templates[lang]
      .split("{name}").join(fullName(e))
      .split("{amount}").join(Number(e.amount).toLocaleString("en-IN"))
      .split("{function}").join(data?.function.functionName ?? "")
      .split("{family}").join(data?.function.funPersionNames || user?.name || "") + `\n\nRecorded with Moitech: ${SITE}`;

  const mark = async (e: ThankRow, undo = false) => {
    const r = await markThanked(e.id, undo);
    if (!r.ok) return setMessage(tx(r.message));
    setData((d) => d && {
      ...d,
      thanked: d.thanked + (undo ? -1 : e.thankedDt ? 0 : 1),
      items: d.items.map((x) => (x.id === e.id ? { ...x, thankedDt: r.data?.thankedDt ?? null } : x)),
    });
  };
  const send = (e: ThankRow) => {
    void Linking.openURL(`https://wa.me/${wa(e.phoneNo)}?text=${encodeURIComponent(text(e))}`);
    void mark(e);
  };

  const todo = useMemo(() => (data?.items ?? []).filter((e) => !e.thankedDt), [data]);
  const shown = tab === "todo" ? todo : (data?.items ?? []).filter((e) => e.thankedDt);

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} />}>
        <Text style={{ color: c.textMuted, marginBottom: 10 }}>{tx("Send each giver a WhatsApp thank-you with their moi amount. Tap Send next to go down the list.")}</Text>
        <View style={[moiStyles.card, { backgroundColor: c.card, gap: 8 }]}>
          <SegmentedButtons density="small" value={lang} onValueChange={(v) => setLang(v as "ta" | "en")} buttons={[{ value: "ta", label: "தமிழ்" }, { value: "en", label: "English" }]} />
          <TextInput mode="outlined" multiline value={templates[lang]} onChangeText={setTemplate} />
          <Text style={{ color: c.textMuted, fontSize: 12 }}>{tx("{name}, {amount}, {function} and {family} are filled in for each giver.")}</Text>
          <Button compact onPress={() => setTemplate(TEMPLATES[lang])}>{tx("Reset message")}</Button>
          {data && (
            <>
              <Text style={{ color: c.text, fontWeight: "800" }}>{tx("Progress")}: {data.thanked} / {data.withPhone}</Text>
              <ProgressBar progress={data.withPhone ? data.thanked / data.withPhone : 0} color="#16a34a" />
              <Text style={{ color: c.textMuted, fontSize: 12 }}>{tx("{{n}} receipts have no mobile number.", { n: Math.max(0, data.total - data.withPhone) })}</Text>
            </>
          )}
        </View>
        <Button mode="contained" icon="whatsapp" buttonColor="#16a34a" disabled={!todo.length} onPress={() => send(todo[0])} style={{ marginBottom: 12, borderRadius: 12 }}>
          {`${tx("Send next")}${todo.length ? ` (${todo.length})` : ""}`}
        </Button>
        <SegmentedButtons value={tab} onValueChange={setTab} style={{ marginBottom: 12 }}
          buttons={[{ value: "todo", label: `${tx("Not yet thanked")} (${todo.length})` }, { value: "done", label: `${tx("Thanked")} (${data?.thanked ?? 0})` }]} />
        {!data ? <ActivityIndicator color={c.primary} /> : shown.length === 0 ? (
          <Empty icon={tab === "todo" && data.withPhone ? "check-circle-outline" : "hand-heart-outline"} title={tx(tab === "todo" && data.withPhone ? "Everyone is thanked" : "Nothing here yet")} text={tx("Givers appear here when their receipt has a mobile number.")} />
        ) : (
          <View style={[moiStyles.card, { backgroundColor: c.card }]}>
            {shown.map((e) => (
              <View key={e.id} style={moiStyles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.text, fontWeight: "700" }} numberOfLines={1}>{fullName(e)}</Text>
                  <Text style={{ color: c.textMuted, fontSize: 12 }} numberOfLines={1}>{e.villageName} · {e.phoneNo}</Text>
                </View>
                <Text style={{ color: c.text, fontWeight: "800" }}>{inr(e.amount)}</Text>
                <IconButton icon="whatsapp" iconColor="#16a34a" onPress={() => send(e)} accessibilityLabel={tx("Send")} />
                {!!e.thankedDt && <IconButton icon="undo" onPress={() => void mark(e, true)} accessibilityLabel={tx("Mark as not thanked")} />}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
      <Snackbar visible={!!message} onDismiss={() => setMessage("")}>{message}</Snackbar>
    </View>
  );
}
