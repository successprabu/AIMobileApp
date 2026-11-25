import React, { useEffect, useState } from "react";
import { Linking, StyleSheet, View } from "react-native";
import { Button, Switch, Text, TextInput } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppTheme } from "../../hooks/useAppTheme";
import type { Mahal } from "../../api/mahal";
import { saveBilling, type Billing } from "../../api/mahalOps";
import Sheet from "../ui/Sheet";
import { useTx } from "../../i18n/site";


/**
 * GST invoice details and online advance payment for one hall. Money goes to the hall's own Razorpay account: the owner
 * types the Key Id and Key Secret from the Razorpay dashboard. The secret is stored encrypted and never shown again.
 */
export default function BillingSheet({ mahal, onClose, onSaved }: { mahal: Mahal | null; onClose: () => void; onSaved: (m: Mahal, msg: string) => void }) {
  const { theme } = useAppTheme();
  const c = theme.colors;
  const tx = useTx();
  const [form, setForm] = useState<(Omit<Billing, "gstRate"> & { gstRate: string }) | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!mahal) return;
    setError("");
    setForm({
      mahalId: mahal.id,
      gstEnabled: !!mahal.gstEnabled,
      gstin: mahal.gstin ?? "",
      gstRate: String(mahal.gstRate ?? 18),
      payOnline: !!mahal.payOnline,
      razorpayKeyId: mahal.razorpayKeyId ?? "",
      razorpayKeySecret: "",
    });
  }, [mahal]);

  const save = async () => {
    if (!form || !mahal) return;
    setSaving(true);
    const r = await saveBilling({ ...form, gstRate: Number(form.gstRate) || 18, razorpayKeyId: form.razorpayKeyId.trim(), razorpayKeySecret: form.razorpayKeySecret.trim() });
    setSaving(false);
    if (r.ok) onSaved({ ...mahal, ...(r.data ?? {}), id: mahal.id }, tx(r.message));
    else setError(tx(r.message));
  };

  return (
    <Sheet visible={!!mahal} title={`${tx("Billing and online payment")} · ${mahal?.mahalName ?? ""}`} onClose={() => !saving && onClose()}>
      {form && (
        <View style={{ gap: 14 }}>
          <View style={[styles.box, { borderColor: c.border }]}>
            <View style={styles.head}>
              <MaterialCommunityIcons name="receipt-text-outline" size={20} color={c.primary} />
              <Text style={{ color: c.text, fontWeight: "800", flex: 1 }}>{tx("GST invoice")}</Text>
              <Switch value={form.gstEnabled} onValueChange={(v) => setForm({ ...form, gstEnabled: v })} accessibilityLabel={tx("Show GST on invoices")} />
            </View>
            <Text style={{ color: c.textMuted }}>{tx("Show GST on invoices")}</Text>
            {form.gstEnabled && (
              <View style={{ gap: 8, marginTop: 8 }}>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <TextInput mode="outlined" label="GSTIN" value={form.gstin} autoCapitalize="characters" placeholder="33ABCDE1234F1Z5" style={{ flex: 1 }}
                    onChangeText={(v) => setForm({ ...form, gstin: v.toUpperCase().slice(0, 15) })} />
                  <TextInput mode="outlined" label={tx("GST %")} value={form.gstRate} keyboardType="numeric" style={{ width: 96 }}
                    onChangeText={(v) => setForm({ ...form, gstRate: v.replace(/[^\d.]/g, "") })} />
                </View>
                <Text style={{ color: c.textMuted, fontSize: 12 }}>{tx("Your rent is taken as including GST. The invoice splits it into taxable value, CGST and SGST.")}</Text>
              </View>
            )}
          </View>

          <View style={[styles.box, { borderColor: c.border }]}>
            <View style={styles.head}>
              <MaterialCommunityIcons name="credit-card-outline" size={20} color={c.primary} />
              <Text style={{ color: c.text, fontWeight: "800", flex: 1 }}>{tx("Take the advance online")}</Text>
              <Switch value={form.payOnline} onValueChange={(v) => setForm({ ...form, payOnline: v })} accessibilityLabel={tx("Customers can pay online")} />
            </View>
            <Text style={{ color: c.textMuted }}>
              {tx("Customers pay by UPI, card or net banking on the booking status page. Money goes straight to your own Razorpay account, and the booking is confirmed when they pay.")}
            </Text>
            {form.payOnline && (
              <View style={{ gap: 8, marginTop: 8 }}>
                <TextInput mode="outlined" label="Razorpay Key Id" value={form.razorpayKeyId} autoCapitalize="none" autoCorrect={false} placeholder="rzp_live_..."
                  onChangeText={(v) => setForm({ ...form, razorpayKeyId: v })} />
                <TextInput mode="outlined" label="Razorpay Key Secret" value={form.razorpayKeySecret} secureTextEntry autoCapitalize="none" autoCorrect={false}
                  onChangeText={(v) => setForm({ ...form, razorpayKeySecret: v })} />
                <Text style={{ color: c.textMuted, fontSize: 12 }}>
                  {tx(mahal?.hasRazorpaySecret ? "Saved. Leave empty to keep it." : "Stored encrypted. It is never shown again.")}
                </Text>
                <Text style={{ color: c.textMuted, fontSize: 12 }}>
                  {tx("Get these from the Razorpay dashboard: Account & Settings → API keys.")}{" "}
                  <Text style={{ color: c.primary, fontWeight: "700" }} onPress={() => void Linking.openURL("https://dashboard.razorpay.com/app/website-app-settings/api-keys")}>
                    dashboard.razorpay.com
                  </Text>
                </Text>
              </View>
            )}
          </View>

          {!!error && <Text style={{ color: c.danger }}>{error}</Text>}
          <Button mode="contained" onPress={save} loading={saving} disabled={saving} style={{ borderRadius: 12 }}>{tx("Save")}</Button>
        </View>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: 1, borderRadius: 14, padding: 14 },
  head: { flexDirection: "row", alignItems: "center", gap: 8 },
});
