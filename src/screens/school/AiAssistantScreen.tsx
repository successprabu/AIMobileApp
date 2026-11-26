import React, { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Share, StyleSheet, View } from "react-native";
import { ActivityIndicator, Text, TextInput } from "react-native-paper";
import { schoolError } from "../../api/school";
import { aiStatus, schoolAi } from "../../api/schoolErp";
import { useSchoolAuth } from "../../context/SchoolAuthContext";
import { useAppTheme } from "../../hooks/useAppTheme";
import { Notice } from "../../components/ui/AuthUi";
import { SCHOOL_GREEN } from "./schoolUi";

const SUGGESTIONS = [
  "Give me this week’s school summary and priorities",
  "Which students need attention for attendance?",
  "How are fee collections and dues?",
  "Which students are below the pass mark?",
  "Draft a message to parents about improving attendance",
];

/** AI assistant: questions about the school's own live data (same as the website). */
export default function AiAssistantScreen() {
  const { school } = useSchoolAuth();
  const sid = school?.user.schoolId ?? "";
  const { theme } = useAppTheme();
  const c = theme.colors;
  const [turns, setTurns] = useState<{ q: string; a: string }[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const scroller = useRef<ScrollView>(null);

  useEffect(() => {
    void aiStatus()
      .then((r) => setEnabled(r.enabled))
      .catch(() => setEnabled(null));
  }, []);

  const ask = async (text: string) => {
    const question = text.trim();
    if (!question || busy) return;
    setQ("");
    setBusy(true);
    try {
      const r = await schoolAi({ task: "staff-ask", schoolId: sid, question });
      setTurns((t) => [...t, { q: question, a: r.text }]);
    } catch (e) {
      setTurns((t) => [...t, { q: question, a: schoolError(e, "The assistant is not available right now.") }]);
    } finally {
      setBusy(false);
      setTimeout(() => scroller.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView ref={scroller} contentContainerStyle={{ padding: 16, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        {enabled === false ? <Notice kind="info" text="AI is not switched on for this server, so answers come from built-in summaries." /> : null}
        {!turns.length ? (
          <View style={{ alignItems: "center", marginVertical: 16 }}>
            <Text style={{ fontSize: 44 }}>✨🤖</Text>
            <Text style={{ color: c.text, fontWeight: "800", fontSize: 18, marginTop: 6 }}>Ask about your school</Text>
            <Text style={{ color: c.textMuted, textAlign: "center", marginTop: 4 }}>Attendance, fees, marks, enquiries… in English or Tamil.</Text>
          </View>
        ) : null}
        <View style={styles.sugs}>
          {SUGGESTIONS.map((s) => (
            <Pressable key={s} onPress={() => void ask(s)} style={[styles.sug, { borderColor: c.border, backgroundColor: c.surface }]}>
              <Text style={{ color: c.text, fontSize: 13 }}>{s}</Text>
            </Pressable>
          ))}
        </View>
        {turns.map((t, i) => (
          <View key={i} style={{ marginTop: 12, gap: 8 }}>
            <View style={[styles.bubble, styles.me]}>
              <Text style={{ color: "#fff" }}>{t.q}</Text>
            </View>
            <Pressable onLongPress={() => void Share.share({ message: t.a })} style={[styles.bubble, { backgroundColor: c.surface, borderColor: c.border, borderWidth: 1 }]}>
              <Text style={{ color: c.text, lineHeight: 21 }}>{t.a}</Text>
              <Text style={{ color: c.textMuted, fontSize: 11, marginTop: 6 }}>Hold to share</Text>
            </Pressable>
          </View>
        ))}
        {busy ? <ActivityIndicator style={{ marginTop: 14 }} color={SCHOOL_GREEN} /> : null}
      </ScrollView>
      <View style={[styles.bar, { backgroundColor: c.surface, borderTopColor: c.border }]}>
        <TextInput
          mode="outlined"
          dense
          value={q}
          onChangeText={setQ}
          placeholder="Ask a question"
          maxLength={600}
          style={{ flex: 1 }}
          activeOutlineColor={SCHOOL_GREEN}
          onSubmitEditing={() => void ask(q)}
          right={<TextInput.Icon icon="send" disabled={busy || !q.trim()} onPress={() => void ask(q)} />}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  sugs: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  sug: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 },
  bubble: { padding: 12, borderRadius: 16, maxWidth: "92%" },
  me: { alignSelf: "flex-end", backgroundColor: SCHOOL_GREEN },
  bar: { padding: 10, borderTopWidth: 1, flexDirection: "row" },
});
