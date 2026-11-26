import React, { useEffect, useState } from "react";
import { Linking, ScrollView, View } from "react-native";
import { ActivityIndicator, Switch, Text, TextInput } from "react-native-paper";
import { schoolError } from "../../api/school";
import { onlinePayments, saveOnlinePayments } from "../../api/schoolErp";
import { useSchoolAuth } from "../../context/SchoolAuthContext";
import { useAppTheme } from "../../hooks/useAppTheme";
import { Notice, PillButton } from "../../components/ui/AuthUi";
import type { OnlinePaymentSettings } from "../../school/erp";
import { SCHOOL_GREEN, Section, ui } from "./schoolUi";

/** Online payments: the school's own Razorpay keys, so parents can pay fees in the app and on the website. */
export default function OnlinePaymentsScreen() {
  const { school } = useSchoolAuth();
  const sid = school?.user.schoolId ?? "";
  const { theme } = useAppTheme();
  const c = theme.colors;
  const [cur, setCur] = useState<OnlinePaymentSettings | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [keyId, setKeyId] = useState("");
  const [secret, setSecret] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<{ kind: "error" | "success"; text: string } | null>(null);

  useEffect(() => {
    void onlinePayments(sid)
      .then((r) => {
        setCur(r);
        setEnabled(r.enabled);
        setKeyId(r.keyId);
      })
      .catch((e) => setNote({ kind: "error", text: schoolError(e, "Could not load.") }))
      .finally(() => setLoading(false));
  }, [sid]);

  const save = async () => {
    setSaving(true);
    setNote(null);
    try {
      const r = await saveOnlinePayments(sid, { enabled, keyId: keyId.trim(), keySecret: secret.trim() || undefined });
      setCur(r);
      setSecret("");
      setNote({ kind: "success", text: r.enabled ? "💳 Online payments are on. Parents see “Pay online” in the app and the Parent Portal." : "Online payments are off." });
    } catch (e) {
      setNote({ kind: "error", text: schoolError(e, "Could not save.") });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[ui.center, { backgroundColor: c.background }]}>
        <ActivityIndicator color={SCHOOL_GREEN} />
      </View>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={ui.wrap} keyboardShouldPersistTaps="handled">
      {note ? <Notice kind={note.kind} text={note.text} /> : null}
      <Section icon="credit-card-outline" title="💳 Razorpay (the school's own account)">
        <Text style={{ color: c.textMuted }}>
          Money goes straight to the school's bank account. Get the keys in Razorpay → Account & Settings → API keys. The secret is stored on the school server only and is never shown again.
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
          <Text style={{ color: c.text, fontWeight: "700", flex: 1 }}>Take fees online</Text>
          <Switch value={enabled} onValueChange={setEnabled} color={SCHOOL_GREEN} />
        </View>
        <TextInput mode="outlined" label="Key ID (rzp_live_…)" value={keyId} onChangeText={setKeyId} autoCapitalize="none" autoCorrect={false} style={{ marginTop: 8 }} activeOutlineColor={SCHOOL_GREEN} />
        <TextInput
          mode="outlined"
          label={cur?.hasSecret ? "Key secret (saved — type only to change)" : "Key secret"}
          value={secret}
          onChangeText={setSecret}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          style={{ marginTop: 8 }}
          activeOutlineColor={SCHOOL_GREEN}
        />
        <PillButton label="Save" icon="content-save-outline" color={SCHOOL_GREEN} onPress={() => void save()} loading={saving} disabled={saving} style={{ marginTop: 14 }} />
        <Text onPress={() => void Linking.openURL("https://dashboard.razorpay.com/app/website-app-settings/api-keys")} style={{ color: SCHOOL_GREEN, fontWeight: "700", marginTop: 10 }}>
          Open Razorpay API keys →
        </Text>
      </Section>
    </ScrollView>
  );
}
