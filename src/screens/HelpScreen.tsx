import React, { useLayoutEffect, useRef, useState } from "react";
import { Animated, KeyboardAvoidingView, LayoutAnimation, Linking, Platform, Pressable, ScrollView, StyleSheet, UIManager, View } from "react-native";
import { Button, HelperText, Snackbar, Text, TextInput } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import { useAppTheme } from "../hooks/useAppTheme";
import { useAuth } from "../context/AuthContext";
import type { AuthUser } from "../types/auth";
import { CONTACT, submitEnquiry } from "../api/admin";
import { FadeIn } from "../components/mahal/MahalUi";

if (Platform.OS === "android") UIManager.setLayoutAnimationEnabledExperimental?.(true);

type Faq = { q: string; a: string };

const MOITECH_FAQ: Faq[] = [
  { q: "How do I start recording moi?", a: "Open Function Master, add your function (name, date, hall) and save. It becomes your active function, then use Add Receipt to record each gift." },
  { q: "I have more than one function. How do I switch?", a: "Open Function Master and tap \"Use this\" on the function you want. Receipts, expenses, reports and handover then use that function." },
  { q: "How do I add helpers to record entries?", a: "Open User Master and add a user with their mobile number and a password. They sign in on their own phone and record entries for your active function." },
  { q: "How do I hand over the collected money?", a: "Open Handover. It shows each user's receipts, others and expenses. Tap the edit icon on a user's row to record what they handed over." },
  { q: "Can I download the reports?", a: "Yes. Every report has PDF and Excel buttons at the top. The PDF supports Tamil and the other languages." },
];

const MAHAL_FAQ: Faq[] = [
  { q: "How do I add my hall?", a: "Open My Mahals and tap Add mahal. Enter capacity, price per day and the events you host. Customers can find it and request a date." },
  { q: "Where are online booking requests?", a: "Open Mahal Bookings and choose the Pending tab. Open a request to confirm or reject it. The app warns you if the date is already confirmed for someone else." },
  { q: "How do I record an advance payment?", a: "Open the booking and tap Record payment. The balance updates on the booking and on your dashboard." },
  { q: "Can families record moi at my hall?", a: "Yes. Open DigiMoi Reg, register the family with their mobile number, and send them the login on WhatsApp." },
];

const HELPER_FAQ: Faq[] = [
  { q: "How do I record a gift?", a: "Open Add Receipt, type or speak the name, place and amount, and save. It is added to your function owner's active function." },
  { q: "Where do I see what I recorded?", a: "Open Receipt List, Expenses List or Others List. Tap an entry to correct it." },
  { q: "How do I hand over the money?", a: "Open Handover to see your totals, and give the amount to the function owner. They record it on their phone." },
];

const ADMIN_FAQ: Faq[] = [
  { q: "How do I register a new client?", a: "Open Register client. Choose DigiMoi client (7 days free) or Mahal owner (1 month free), enter their name and mobile, and send the login on WhatsApp." },
  { q: "How do I stop an account?", a: "Open Clients, tap the client and turn off Account active. They cannot sign in until you turn it back on." },
  { q: "Where do website messages go?", a: "Open Enquiries. You can reply by WhatsApp or email and mark each one Replied or Closed." },
];

const TOPICS = ["Help with my account", "DigiMoi", "Mahal Management", "School Website with ERP", "Pricing and plans", "Something else"];

function FaqItem({ item, index }: { item: Faq; index: number }) {
  const { theme } = useAppTheme();
  const c = theme.colors;
  const [open, setOpen] = useState(false);
  const spin = useRef(new Animated.Value(0)).current;
  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.create(220, "easeInEaseOut", "opacity"));
    Animated.timing(spin, { toValue: open ? 0 : 1, duration: 220, useNativeDriver: true }).start();
    setOpen(!open);
  };
  return (
    <FadeIn index={index}>
      <Pressable onPress={toggle} accessibilityRole="button" accessibilityState={{ expanded: open }} style={[styles.faq, { backgroundColor: c.card, borderColor: open ? c.primary : c.border }]}>
        <View style={styles.faqHead}>
          <Text style={{ color: c.text, fontWeight: "700", flex: 1 }}>{item.q}</Text>
          <Animated.View style={{ transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] }) }] }}>
            <MaterialCommunityIcons name="chevron-down" size={22} color={c.textMuted} />
          </Animated.View>
        </View>
        {open && <Text style={{ color: c.textMuted, marginTop: 8, lineHeight: 21 }}>{item.a}</Text>}
      </Pressable>
    </FadeIn>
  );
}

/** Help: reach the team (call / WhatsApp / email), answers for your role, and a message form. */
export default function HelpScreen() {
  const { t } = useTranslation();
  const { theme } = useAppTheme();
  const c = theme.colors;
  const navigation = useNavigation();
  const { user } = useAuth();
  const me = (user ?? {}) as AuthUser;
  const role = String(me.userType ?? "");

  const [topic, setTopic] = useState(TOPICS[0]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [snack, setSnack] = useState("");

  useLayoutEffect(() => navigation.setOptions({ title: t("help", { defaultValue: "Help" }) }), [navigation, t]);

  const faqs = role === "SU" ? [...ADMIN_FAQ, ...MOITECH_FAQ, ...MAHAL_FAQ] : role === "MU" ? MAHAL_FAQ : role === "NU" ? HELPER_FAQ : MOITECH_FAQ;
  const myPhone = String(me.primary_phone ?? me.phone ?? "");

  const send = async () => {
    if (message.trim().length < 10) {
      setError("Tell us a little more (at least 10 characters)");
      return;
    }
    setError("");
    setSending(true);
    const r = await submitEnquiry({ name: String(me.name ?? me.userName ?? "App user"), phone: myPhone, email: String(me.email ?? ""), topic, message: `${message.trim()}\n\n(Sent from the Android app)` });
    setSending(false);
    if (r.ok) {
      setSent(true);
      setMessage("");
    } else setSnack(r.message);
  };

  const waText = encodeURIComponent(`Hi, I need help with the My Success app.${myPhone ? ` My registered number is ${myPhone}.` : ""}`);
  const actions: { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; sub: string; color: string; url: string }[] = [
    { icon: "whatsapp", label: "WhatsApp", sub: "Fastest reply", color: "#16a34a", url: `https://wa.me/${CONTACT.whatsapp}?text=${waText}` },
    { icon: "phone", label: "Call us", sub: "9 AM – 8 PM", color: "#0ea5e9", url: `tel:${CONTACT.phoneTel}` },
    { icon: "email-outline", label: "Email", sub: "Reply in a day", color: "#8b5cf6", url: `mailto:${CONTACT.email}?subject=${encodeURIComponent("[MySuccess app] Help")}` },
  ];

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <FadeIn style={[styles.hero, { backgroundColor: c.primary }]}>
          <MaterialCommunityIcons name="lifebuoy" size={34} color="#fff" />
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>How can we help?</Text>
            <Text style={styles.heroSub}>{CONTACT.hours}</Text>
          </View>
        </FadeIn>

        <View style={styles.actions}>
          {actions.map((a, i) => (
            <FadeIn key={a.label} index={i + 1} style={{ flex: 1 }}>
              <Pressable onPress={() => Linking.openURL(a.url)} accessibilityRole="button" accessibilityLabel={a.label} style={({ pressed }) => [styles.action, { backgroundColor: c.card, transform: [{ scale: pressed ? 0.96 : 1 }] }]}>
                <View style={[styles.actionIcon, { backgroundColor: `${a.color}1f` }]}>
                  <MaterialCommunityIcons name={a.icon} size={24} color={a.color} />
                </View>
                <Text style={{ color: c.text, fontWeight: "800", marginTop: 6 }}>{a.label}</Text>
                <Text style={{ color: c.textMuted, fontSize: 11, textAlign: "center" }} numberOfLines={1}>{a.sub}</Text>
              </Pressable>
            </FadeIn>
          ))}
        </View>

        <FadeIn index={4}>
          <Pressable
            onPress={() => navigation.navigate("UserGuide" as never)}
            accessibilityRole="button"
            style={({ pressed }) => [styles.guide, { backgroundColor: c.card, borderColor: c.border, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
          >
            <View style={[styles.actionIcon, { backgroundColor: "#10b9811f" }]}>
              <MaterialCommunityIcons name="book-open-page-variant-outline" size={24} color="#10b981" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.text, fontWeight: "800" }}>{t("userGuide", { defaultValue: "User guide" })}</Text>
              <Text style={{ color: c.textMuted, fontSize: 13 }}>Step-by-step pictures, and the PDF to download</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color={c.textMuted} />
          </Pressable>
        </FadeIn>

        <Text style={[styles.h, { color: c.text }]}>Common questions</Text>
        {faqs.map((f, i) => (
          <FaqItem key={f.q} item={f} index={i + 4} />
        ))}

        <Text style={[styles.h, { color: c.text }]}>Send us a message</Text>
        <FadeIn style={[styles.card, { backgroundColor: c.card }]}>
          {sent ? (
            <View style={{ alignItems: "center", paddingVertical: 10 }}>
              <MaterialCommunityIcons name="check-circle" size={52} color={c.success} />
              <Text style={{ color: c.text, fontWeight: "800", fontSize: 16, marginTop: 6 }}>Message sent</Text>
              <Text style={{ color: c.textMuted, textAlign: "center" }}>We will reply{myPhone ? ` on ${myPhone}` : ""} soon.</Text>
              <Button onPress={() => setSent(false)} style={{ marginTop: 8 }}>Send another</Button>
            </View>
          ) : (
            <>
              <Text style={{ color: c.textMuted, marginBottom: 8 }}>About</Text>
              <View style={styles.topics}>
                {TOPICS.map((tp) => {
                  const on = tp === topic;
                  return (
                    <Pressable key={tp} onPress={() => setTopic(tp)} accessibilityRole="radio" accessibilityState={{ selected: on }} style={[styles.pill, { backgroundColor: on ? c.primary : "transparent", borderColor: on ? c.primary : c.border }]}>
                      <Text style={{ color: on ? "#fff" : c.text, fontSize: 13, fontWeight: on ? "800" : "600" }}>{tp}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <TextInput mode="outlined" label="Your message *" value={message} onChangeText={setMessage} multiline numberOfLines={4} error={!!error} style={{ marginTop: 12, minHeight: 110 }} />
              <HelperText type={error ? "error" : "info"}>{error || (myPhone ? `We reply on ${myPhone}` : "We reply on your registered number")}</HelperText>
              <Button mode="contained" icon="send" onPress={send} loading={sending} disabled={sending} style={{ borderRadius: 12 }} contentStyle={{ height: 48 }}>
                Send message
              </Button>
            </>
          )}
        </FadeIn>
      </ScrollView>
      <Snackbar visible={!!snack} onDismiss={() => setSnack("")}>{snack}</Snackbar>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: "row", alignItems: "center", gap: 14, padding: 18, borderRadius: 20 },
  heroTitle: { color: "#fff", fontSize: 20, fontWeight: "800" },
  heroSub: { color: "rgba(255,255,255,0.85)", fontSize: 13 },
  actions: { flexDirection: "row", gap: 10, marginTop: 14 },
  action: { alignItems: "center", padding: 12, borderRadius: 16, elevation: 1, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  actionIcon: { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  guide: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 16, borderWidth: 1, marginTop: 14 },
  h: { fontWeight: "800", fontSize: 16, marginTop: 22, marginBottom: 10 },
  faq: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 8 },
  faqHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  card: { borderRadius: 16, padding: 16, elevation: 1, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  topics: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
});
