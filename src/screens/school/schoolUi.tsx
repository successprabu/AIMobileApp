/** Small pieces shared by the School screens: money/date text, chips, sections, fee receipt PDF. */
import React from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useAppTheme } from "../../hooks/useAppTheme";

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
        <MaterialCommunityIcons name={icon} size={20} color={c.primary} />
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
