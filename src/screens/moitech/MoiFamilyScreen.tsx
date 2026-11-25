import React, { useCallback, useLayoutEffect, useState } from "react";
import { Share, ScrollView, View } from "react-native";
import { Button, SegmentedButtons, Snackbar, Text, TextInput } from "react-native-paper";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useAppTheme } from "../../hooks/useAppTheme";
import { useAuth } from "../../context/AuthContext";
import { useTx } from "../../i18n/site";
import { getGold, getLiveShare, inr, setGoldRate, setLiveShare, type Gold, type LiveShare } from "../../api/moitech";
import { moiStyles } from "./moiUi";

const PAVUN = 8;

/** Family tools for the current function: the PIN-protected live totals link, and gold gifts valued at today's rate. */
export default function MoiFamilyScreen() {
  const { theme } = useAppTheme();
  const c = theme.colors;
  const tx = useTx();
  const navigation = useNavigation();
  const { user } = useAuth();
  const functionId = Number(user?.functionId) || 0;
  const [live, setLive] = useState<LiveShare | null>(null);
  const [pin, setPin] = useState("");
  const [gold, setGold] = useState<Gold | null>(null);
  const [rate, setRate] = useState("");
  const [unit, setUnit] = useState("g");
  const [message, setMessage] = useState("");

  useLayoutEffect(() => navigation.setOptions({ title: tx("Family live link") }), [navigation, tx]);
  const load = useCallback(async () => {
    if (!functionId) return setMessage(tx("Choose one of your functions first."));
    const [a, b] = await Promise.all([getLiveShare(functionId), getGold(functionId)]);
    if (a.ok && a.data) setLive(a.data);
    else setMessage(tx(a.message));
    if (b.ok && b.data) {
      setGold(b.data);
      setRate(b.data.rate ? String(b.data.rate) : "");
    }
  }, [functionId, tx]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const savePin = async (off = false) => {
    if (!off && !/^\d{4,6}$/.test(pin)) return setMessage(tx("The PIN must be 4 to 6 digits."));
    const r = await setLiveShare({ functionId, pin: off ? null : pin, off });
    setMessage(tx(r.message));
    if (r.ok && r.data) {
      setLive((l) => ({ ...(l as LiveShare), ...r.data }));
      setPin("");
    }
  };
  const saveRate = async () => {
    const r = await setGoldRate(functionId, rate === "" ? null : Number(rate));
    if (r.ok && r.data) {
      setGold(r.data);
      setMessage(tx("Saved"));
    } else setMessage(tx(r.message));
  };
  const w = (g: number) => (unit === "g" ? `${g.toLocaleString("en-IN")} g` : `${(g / PAVUN).toLocaleString("en-IN", { maximumFractionDigits: 2 })} ${tx("pavun")}`);

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <View style={[moiStyles.card, { backgroundColor: c.card, gap: 10 }]}>
          <Text style={{ color: c.text, fontWeight: "800", fontSize: 17 }}>{tx("Family live link")}</Text>
          <Text style={{ color: c.textMuted }}>{tx("Family abroad or elders at home can see the total, the count and the latest gifts as they come in. They need the PIN to open it.")}</Text>
          {live?.enabled && live.url ? (
            <>
              <Text selectable style={{ color: c.primary }}>{live.url}</Text>
              <Button icon="share-variant" mode="contained" buttonColor="#16a34a"
                onPress={() => void Share.share({ message: `${live.functionName}: ${tx("See the moi totals live")} ${live.url}` })}>{tx("Share on WhatsApp")}</Button>
              <Text style={{ color: c.textMuted, fontSize: 12 }}>{tx("Send the PIN separately, by call or message.")}</Text>
            </>
          ) : <Text style={{ color: c.textMuted }}>{tx("Not shared yet. Set a PIN to make the link.")}</Text>}
          {live?.canChange ? (
            <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
              <TextInput dense mode="outlined" keyboardType="number-pad" label={tx(live.enabled ? "New PIN" : "PIN (4 to 6 digits)")} value={pin}
                onChangeText={(v) => setPin(v.replace(/\D/g, "").slice(0, 6))} style={{ flex: 1 }} />
              <Button mode="contained" onPress={() => void savePin(false)}>{tx(live.enabled ? "Change PIN" : "Make link")}</Button>
            </View>
          ) : live ? <Text style={{ color: c.textMuted }}>{tx("Only the account owner can change the family link.")}</Text> : null}
          {live?.enabled && live.canChange && <Button textColor={c.danger} onPress={() => void savePin(true)}>{tx("Turn off link")}</Button>}
        </View>

        <View style={[moiStyles.card, { backgroundColor: c.card, gap: 8 }]}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ color: c.text, fontWeight: "800", fontSize: 17 }}>{tx("Gold value")}</Text>
            <SegmentedButtons density="small" style={{ width: 170 }} value={unit} onValueChange={setUnit} buttons={[{ value: "g", label: tx("grams") }, { value: "p", label: tx("pavun") }]} />
          </View>
          <Text style={{ color: c.textMuted }}>{tx("Gold gifts in Others are valued at the gold rate you set, using the weight in grams typed for each gift.")}</Text>
          {gold?.canChange && (
            <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
              <TextInput dense mode="outlined" keyboardType="numeric" label={tx("Gold rate per gram")} value={rate} onChangeText={(v) => setRate(v.replace(/[^\d.]/g, ""))} style={{ flex: 1 }} left={<TextInput.Affix text="₹" />} />
              <Button mode="contained" onPress={saveRate}>{tx("Save")}</Button>
            </View>
          )}
          {gold?.items.map((i) => (
            <View key={i.type ?? "-"} style={moiStyles.row}>
              <Text style={{ color: c.text, flex: 1 }}>{tx(i.type || "others")} × {i.count}</Text>
              <Text style={{ color: c.textMuted }}>{i.gold && i.weight > 0 ? w(i.weight) : ""}</Text>
              <Text style={{ color: c.text, fontWeight: "700", minWidth: 80, textAlign: "right" }}>{i.gold ? (gold.rate ? inr(i.value) : "—") : ""}</Text>
            </View>
          ))}
          {gold && (
            <>
              <View style={moiStyles.row}><Text style={{ color: c.text, flex: 1 }}>{tx("Moi (cash and online)")}</Text><Text style={{ color: c.text, fontWeight: "700" }}>{inr(gold.moi)}</Text></View>
              <View style={moiStyles.row}><Text style={{ color: c.text, flex: 1 }}>{tx("Gold")} ({w(gold.goldWeight)})</Text><Text style={{ color: c.text, fontWeight: "700" }}>{gold.rate ? inr(gold.goldValue) : "—"}</Text></View>
              <View style={moiStyles.row}><Text style={{ color: c.text, flex: 1, fontWeight: "800" }}>{tx("Total with gold")}</Text><Text style={{ color: c.text, fontWeight: "800", fontSize: 18 }}>{inr(gold.total)}</Text></View>
              {gold.unweighed > 0 && <Text style={{ color: "#b45309", fontSize: 12 }}>{tx("{{n}} gold gifts were recorded without a weight, so they are not valued.", { n: gold.unweighed })}</Text>}
            </>
          )}
        </View>
      </ScrollView>
      <Snackbar visible={!!message} onDismiss={() => setMessage("")}>{message}</Snackbar>
    </View>
  );
}
