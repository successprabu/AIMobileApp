/** Small pieces shared by the School screens: money/date text, chips, sections, fee receipt PDF. */
import React, { useEffect, useRef } from "react";
import { AccessibilityInfo, Animated, Easing, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useAppTheme } from "../../hooks/useAppTheme";
import { ND } from "../../components/ui/Motion";

export type Colors = ReturnType<typeof useAppTheme>["theme"]["colors"];
export type Icon = keyof typeof MaterialCommunityIcons.glyphMap;

export const SCHOOL_GREEN = "#059669";
export const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
export const day = (iso: string) => {
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};
/** Today as YYYY-MM-DD on the phone's clock. */
export const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const shiftDay = (iso: string, by: number) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + by);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export function Chips<T extends string>({ items, value, onChange, label = (x: T) => x, color }: { items: T[]; value: T | null; onChange: (v: T) => void; label?: (x: T) => string; color?: string }) {
  const { theme } = useAppTheme();
  const c = theme.colors;
  const tint = color ?? c.primary;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
      {items.map((x) => {
        const on = x === value;
        return (
          <Pressable
            key={x}
            onPress={() => onChange(x)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            style={[ui.chip, { borderColor: on ? tint : c.border, backgroundColor: on ? tint : c.surface }]}
          >
            <Text style={{ color: on ? "#fff" : c.text, fontWeight: "700" }}>{label(x)}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function Section({ icon, title, right, children }: { icon: Icon; title: string; right?: React.ReactNode; children: React.ReactNode }) {
  const { theme } = useAppTheme();
  const c = theme.colors;
  return (
    <View style={[ui.section, { backgroundColor: c.surface, borderColor: c.border }]}>
      <View style={ui.sectionHead}>
        <MaterialCommunityIcons name={icon} size={20} color={SCHOOL_GREEN} />
        <Text style={{ color: c.text, fontWeight: "800", fontSize: 16, flex: 1 }}>{title}</Text>
        {right}
      </View>
      {children}
    </View>
  );
}

export function Row({ left, right, bold, bad }: { left: string; right: string; bold?: boolean; bad?: boolean }) {
  const { theme } = useAppTheme();
  const c = theme.colors;
  return (
    <View style={ui.row}>
      <Text style={{ color: c.text, flex: 1, fontWeight: bold ? "700" : "400" }}>{left}</Text>
      <Text style={{ color: bad ? c.danger : c.text, fontWeight: bold ? "800" : "600" }}>{right}</Text>
    </View>
  );
}

const esc = (t: string) => t.replace(/[&<>"]/g, (x) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[x] ?? x);

export type ReceiptInfo = {
  schoolName: string;
  receiptNo: string;
  date: string;
  studentName: string;
  className: string;
  section?: string;
  admissionNo: string;
  academicYear?: string;
  head: string;
  amount: number;
  mode: string;
  reference?: string;
  collectedBy?: string;
  balance?: number;
};

/** Fee receipt as a PDF, then the share sheet (WhatsApp, print, save). */
export async function shareReceiptPdf(r: ReceiptInfo): Promise<void> {
  const row = (k: string, v: string) => `<tr><td>${esc(k)}</td><td><b>${esc(v)}</b></td></tr>`;
  const html = `<html><head><meta charset="utf-8"><style>
    body{font-family:sans-serif;padding:28px;color:#0f172a} h1{font-size:22px;margin:0} .sub{color:#64748b;margin:4px 0 18px}
    table{width:100%;border-collapse:collapse} td{padding:8px 4px;border-bottom:1px solid #e2e8f0}
    .amt{font-size:28px;font-weight:800;color:${SCHOOL_GREEN};margin:16px 0} .foot{margin-top:28px;color:#64748b;font-size:12px}
  </style></head><body>
    <h1>${esc(r.schoolName)}</h1><div class="sub">Fee receipt ${esc(r.receiptNo)}${r.academicYear ? ` · ${esc(r.academicYear)}` : ""}</div>
    <div class="amt">${esc(inr(r.amount))}</div>
    <table>
      ${row("Date", r.date)}
      ${row("Student", r.studentName)}
      ${row("Class", `${r.className} ${r.section ?? ""}`.trim())}
      ${row("Admission no", r.admissionNo)}
      ${row("For", r.head)}
      ${row("Paid by", r.mode)}
      ${r.reference ? row("Reference", r.reference) : ""}
      ${r.collectedBy ? row("Received by", r.collectedBy) : ""}
      ${r.balance != null ? row("Balance after this payment", inr(r.balance)) : ""}
    </table>
    <div class="foot">Computer-generated receipt from the school ERP. No signature needed.</div>
  </body></html>`;
  const { uri } = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: `Receipt ${r.receiptNo}`, UTI: "com.adobe.pdf" });
}

export const ui = StyleSheet.create({
  wrap: { padding: 16, paddingBottom: 48 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  section: { padding: 14, borderRadius: 18, borderWidth: 1, marginBottom: 14, gap: 6 },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 3 },
  label: { fontWeight: "700", marginTop: 10, marginBottom: 4 },
});

/** "Good morning ☀️" by the phone's clock. */
export function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? "Good morning ☀️" : h < 17 ? "Good afternoon 🌤️" : "Good evening 🌙";
}

/** One emoji that floats up and down (a light, looping "GIF"). Still when the phone asks for less motion. */
export function Floaty({ emoji, size, delay, style }: { emoji: string; size: number; delay: number; style: object }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (reduce) return;
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(v, { toValue: 1, duration: 1400, delay, easing: Easing.inOut(Easing.sin), useNativeDriver: ND }),
          Animated.timing(v, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: ND }),
        ]),
      );
      loop.start();
    });
    return () => loop?.stop();
  }, [v, delay]);
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        { position: "absolute" },
        style,
        {
          transform: [
            { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) },
            { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ["-6deg", "6deg"] }) },
          ],
        },
      ]}
    >
      <Text style={{ fontSize: size }} accessible={false}>
        {emoji}
      </Text>
    </Animated.View>
  );
}

/** Green school banner: greeting, who you are, today's date, and floating school emoji. */
export function SchoolHero({ title, lines }: { title: string; lines: string[] }) {
  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
  return (
    <View style={hero.box}>
      <View pointerEvents="none" style={[hero.glow, { width: 200, height: 200, borderRadius: 100, top: -110, right: -60, backgroundColor: "rgba(255,255,255,0.14)" }]} />
      <View pointerEvents="none" style={[hero.glow, { width: 130, height: 130, borderRadius: 65, bottom: -70, left: -30, backgroundColor: "rgba(0,0,0,0.10)" }]} />
      <Floaty emoji="📚" size={30} delay={0} style={{ right: 18, top: 14 }} />
      <Floaty emoji="✏️" size={24} delay={400} style={{ right: 70, top: 46 }} />
      <Floaty emoji="🎒" size={28} delay={800} style={{ right: 22, bottom: 16 }} />
      <Floaty emoji="🍎" size={20} delay={1200} style={{ right: 78, bottom: 12 }} />
      <View style={{ paddingRight: 104 }}>
        <Text style={hero.hello}>{greeting()}</Text>
        <Text style={hero.title}>{title}</Text>
        {lines.filter(Boolean).map((l) => (
          <Text key={l} style={hero.line}>
            {l}
          </Text>
        ))}
        <Text style={hero.date}>📅 {today}</Text>
      </View>
    </View>
  );
}

const hero = StyleSheet.create({
  box: { backgroundColor: SCHOOL_GREEN, borderRadius: 22, padding: 18, overflow: "hidden", minHeight: 128, marginBottom: 14 },
  glow: { position: "absolute" },
  hello: { color: "#ffffffd9", fontWeight: "700" },
  title: { color: "#fff", fontSize: 20, fontWeight: "800", marginTop: 2 },
  line: { color: "#ffffffd9", marginTop: 2 },
  date: { color: "#ffffffcc", marginTop: 8, fontSize: 12, fontWeight: "600" },
});
