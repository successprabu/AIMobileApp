import React, { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { Text, TextInput } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppTheme } from "../../hooks/useAppTheme";
import { useThemedInputProps } from "../../hooks/useThemedInputProps";
import { PillButton, Rise, Shake } from "../../components/ui/AuthUi";
import { useLoop, useMotionOn } from "../../components/ui/Motion";
import { parseBooking, type BookingDraft } from "../../api/mahalAi";
import {
  isSpeechRecognitionAvailable,
  isSpeechRecognitionSupported,
  requestSpeechPermissions,
  startSpeechRecognition,
  stopSpeechRecognition,
  subscribeSpeechEvents,
} from "../../services/speechRecognition";

/**
 * "Type or speak a booking": the owner says or writes the booking in their own words (English or Tamil) and the AI
 * fills the form below. Nothing is saved until they press Save.
 */
export default function AiBookingCard({ mahalId, onDraft }: { mahalId?: number; onDraft: (d: BookingDraft) => void }) {
  const { theme } = useAppTheme();
  const c = theme.colors;
  const input = useThemedInputProps();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [lang, setLang] = useState<"en-IN" | "ta-IN">("en-IN");
  const [listening, setListening] = useState(false);
  const before = useRef("");
  const voice = isSpeechRecognitionSupported();
  const pulse = useLoop(useMotionOn() && listening, 700);
  const sparkle = useLoop(useMotionOn(), 1600);

  useEffect(() => {
    if (!voice) return undefined;
    const off = subscribeSpeechEvents({
      onResult: (t) => setText(before.current + t),
      onEnd: () => setListening(false),
      onError: () => setListening(false),
    });
    return () => {
      off?.();
      stopSpeechRecognition();
    };
  }, [voice]);

  const listen = async () => {
    if (listening) {
      stopSpeechRecognition();
      setListening(false);
      return;
    }
    if (!(await isSpeechRecognitionAvailable()) || !(await requestSpeechPermissions())) {
      setError("Voice is not available on this phone. Please type the booking.");
      return;
    }
    before.current = text ? `${text} ` : "";
    setError("");
    if (startSpeechRecognition({ lang, interimResults: true, continuous: false })) setListening(true);
  };

  const fill = async () => {
    if (text.trim().length < 5) {
      setError("Type or speak the booking first: customer name, phone and date.");
      return;
    }
    if (listening) stopSpeechRecognition();
    setError("");
    setBusy(true);
    const r = await parseBooking(text.trim(), mahalId);
    setBusy(false);
    if (!r.ok || !r.data) {
      setError(r.message);
      return;
    }
    onDraft(r.data);
    setText("");
  };

  return (
    <Rise style={[styles.card, { backgroundColor: c.card, borderColor: `${c.primary}40` }]}>
      <View style={[styles.glow, { backgroundColor: c.primaryMuted }]} />
      <View style={styles.head}>
        <Animated.View style={{ transform: [{ rotate: sparkle.interpolate({ inputRange: [0, 1], outputRange: ["-12deg", "12deg"] }) }] }}>
          <MaterialCommunityIcons name="creation" size={22} color={c.primary} />
        </Animated.View>
        <Text style={[styles.title, { color: c.text }]}>Type or speak a booking</Text>
        <View style={[styles.badge, { backgroundColor: c.primary }]}><Text style={styles.badgeText}>AI</Text></View>
      </View>
      <TextInput
        {...input}
        mode="outlined"
        multiline
        value={text}
        onChangeText={(v) => setText(v.slice(0, 1000))}
        placeholder="e.g. Ravi 98765 43210, marriage 12 Dec, 500 guests, rent 75000, advance 20k UPI"
        outlineStyle={{ borderRadius: 14 }}
        style={[input.style, { minHeight: 70 }]}
        accessibilityLabel="Booking in your words"
        right={voice ? (
          <TextInput.Icon
            icon={() => (
              <Animated.View style={{ transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.25] }) }] }}>
                <MaterialCommunityIcons name={listening ? "stop-circle" : "microphone"} size={24} color={listening ? c.danger : c.primary} />
              </Animated.View>
            )}
            onPress={listen}
            accessibilityLabel={listening ? "Stop listening" : "Speak the booking"}
            forceTextInputFocus={false}
          />
        ) : undefined}
      />
      <View style={styles.row}>
        {voice ? (
          <View style={[styles.langs, { borderColor: c.border }]}>
            {(["en-IN", "ta-IN"] as const).map((l) => (
              <Pressable key={l} onPress={() => setLang(l)} style={[styles.lang, lang === l && { backgroundColor: c.primary }]} accessibilityRole="button" accessibilityState={{ selected: lang === l }}>
                <Text style={{ color: lang === l ? "#fff" : c.textMuted, fontWeight: "800", fontSize: 13 }}>{l === "en-IN" ? "EN" : "தமிழ்"}</Text>
              </Pressable>
            ))}
          </View>
        ) : <View />}
        <PillButton label={busy ? "Reading…" : "Fill with AI"} icon="creation" onPress={fill} loading={busy} disabled={busy} style={{ flex: 1, marginLeft: 10 }} />
      </View>
      {listening ? <Text style={{ color: c.danger, marginTop: 8, fontWeight: "700" }}>Listening… speak now</Text> : null}
      {error ? (
        <Shake trigger={error}>
          <Text style={{ color: c.danger, marginTop: 8 }}>{error}</Text>
        </Shake>
      ) : null}
    </Rise>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, padding: 14, marginBottom: 14, borderWidth: 1.5, overflow: "hidden" },
  glow: { position: "absolute", width: 160, height: 160, borderRadius: 80, top: -80, right: -50 },
  head: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  title: { fontSize: 16, fontWeight: "900", flex: 1 },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { color: "#fff", fontWeight: "900", fontSize: 11 },
  row: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  langs: { flexDirection: "row", borderWidth: 1, borderRadius: 999, padding: 3 },
  lang: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
});

