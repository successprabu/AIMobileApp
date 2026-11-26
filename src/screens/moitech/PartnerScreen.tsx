import React, { useCallback, useLayoutEffect, useState } from "react";
import { ActivityIndicator, Image, Linking, ScrollView, Share, View } from "react-native";
import { Button, Chip, Snackbar, Text, TextInput } from "react-native-paper";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useAppTheme } from "../../hooks/useAppTheme";
import { useTx } from "../../i18n/site";
import { applyPartner, getMyPartner, inr, qrImageUrl, type Partner } from "../../api/moitech";
import { dayText, Empty, moiStyles, Stat } from "./moiUi";

const KINDS = ["Printer", "Organiser", "Hall", "Shop", "Other"];

/** Resellers and partners: apply, share the signup link, see families brought in and the share earned. */
export default function PartnerScreen() {
  const { theme } = useAppTheme();
  const c = theme.colors;
  const tx = useTx();
  const navigation = useNavigation();
  const [data, setData] = useState<{ applied: boolean; partner?: Partner } | null>(null);
  const [form, setForm] = useState({ kind: "Printer", town: "", upiId: "", note: "" });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useLayoutEffect(() => navigation.setOptions({ title: tx("Partner dashboard") }), [navigation, tx]);
  const load = useCallback(async () => {
    const r = await getMyPartner();
    if (r.ok && r.data) {
      setData(r.data);
      const p = r.data.partner;
      if (p) setForm({ kind: p.kind, town: p.town ?? "", upiId: p.upiId ?? "", note: "" });
    } else setMessage(tx(r.message));
  }, [tx]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const apply = async () => {
    setBusy(true);
    const r = await applyPartner(form);
    setBusy(false);
    setMessage(tx(r.message));
    if (r.ok) void load();
  };
  const p = data?.partner;

  const formCard = (
    <View style={[moiStyles.card, { backgroundColor: c.card, gap: 8 }]}>
      <Text style={{ color: c.text, fontWeight: "800" }}>{tx(p ? "Your details" : "Become a partner")}</Text>
      {!p && <Text style={{ color: c.textMuted }}>{tx("Printers, function organisers, halls and shops: sign families up for DigiMoi and Mahal Management, and earn a share of every payment they make.")}</Text>}
      <Text style={{ color: c.textMuted, fontSize: 12 }}>{tx("You are a")}</Text>
      <View style={moiStyles.wrap}>{KINDS.map((k) => <Chip key={k} selected={form.kind === k} onPress={() => setForm({ ...form, kind: k })}>{tx(k)}</Chip>)}</View>
      <TextInput dense mode="outlined" label={tx("Town")} value={form.town} onChangeText={(v) => setForm({ ...form, town: v })} />
      <TextInput dense mode="outlined" label={tx("UPI ID for your share")} value={form.upiId} onChangeText={(v) => setForm({ ...form, upiId: v })} autoCapitalize="none" />
      {!p && <TextInput dense mode="outlined" label={tx("Anything we should know (optional)")} value={form.note} onChangeText={(v) => setForm({ ...form, note: v })} />}
      <Button mode="contained" loading={busy} disabled={busy} onPress={apply}>{tx(p ? "Save" : "Apply")}</Button>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text style={{ color: c.textMuted, marginBottom: 10 }}>{tx("Bring families and halls to MySuccess and earn a share of what they pay.")}</Text>
        {!data ? <ActivityIndicator color={c.primary} /> : !p ? formCard : (
          <>
            {p.status === "Pending" && <Text style={{ color: c.primary, marginBottom: 10 }}>{tx("Thank you for applying. We will call you and switch on your partner account.")}</Text>}
            {p.status === "Stopped" && <Text style={{ color: "#b45309", marginBottom: 10 }}>{tx("Your partner account is paused. Please contact us.")}</Text>}
            {p.status === "Active" && (
              <>
                <View style={[moiStyles.wrap, { marginBottom: 12 }]}>
                  <Stat label={tx("Families signed up")} value={p.familyCount} color={c.primary} />
                  <Stat label={tx("Paid by them")} value={inr(p.paidByFamilies)} color="#0ea5e9" />
                  <Stat label={tx("Your share ({{n}}%)", { n: p.sharePercent })} value={inr(p.earned)} color="#16a34a" />
                  <Stat label={tx("To be paid to you")} value={inr(p.balance)} color="#b45309" />
                </View>
                <View style={[moiStyles.card, { backgroundColor: c.card, alignItems: "center", gap: 8 }]}>
                  <Text style={{ color: c.text, fontWeight: "800" }}>{tx("Your code")}: {p.code}</Text>
                  <Image source={{ uri: qrImageUrl(p.moitechLink) }} style={{ width: 170, height: 170, backgroundColor: "#fff" }} />
                  <Text style={{ color: c.textMuted, fontSize: 12, textAlign: "center" }}>{tx("Families who sign up from your link or QR within 60 days are counted for you.")}</Text>
                  <View style={moiStyles.wrap}>
                    <Button mode="contained" icon="whatsapp" buttonColor="#16a34a"
                      onPress={() => void Linking.openURL(`https://wa.me/?text=${encodeURIComponent(`${tx("Record moi on your phone with DigiMoi. Free trial:")} ${p.moitechLink}`)}`)}>{tx("Share on WhatsApp")}</Button>
                    <Button icon="share-variant" onPress={() => void Share.share({ message: p.mahalLink })}>Mahal</Button>
                  </View>
                </View>
                <Text style={{ color: c.text, fontWeight: "800", marginBottom: 6 }}>{tx("Families")}</Text>
                {!p.families?.length ? <Empty icon="handshake-outline" title={tx("No families yet")} text={tx("Share your link or QR with families planning a function.")} /> : (
                  <View style={[moiStyles.card, { backgroundColor: c.card }]}>
                    {p.families.map((f, i) => (
                      <View key={`${f.phone}-${i}`} style={moiStyles.row}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: c.text, fontWeight: "700" }}>{f.name}</Text>
                          <Text style={{ color: c.textMuted, fontSize: 12 }}>{f.product} · {f.phone} · {dayText(f.joined)}</Text>
                        </View>
                        <Text style={{ color: c.text, fontWeight: "700" }}>{f.paid ? inr(f.paid) : tx("Trial")}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}
            {formCard}
          </>
        )}
      </ScrollView>
      <Snackbar visible={!!message} onDismiss={() => setMessage("")}>{message}</Snackbar>
    </View>
  );
}
