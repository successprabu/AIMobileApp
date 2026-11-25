import React, { useCallback, useLayoutEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { Button, SegmentedButtons, Snackbar, Text, TextInput } from "react-native-paper";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useAppTheme } from "../../hooks/useAppTheme";
import { useAuth } from "../../context/AuthContext";
import { useTx } from "../../i18n/site";
import { fullName, getMoiBook, inr, type Book } from "../../api/moitech";
import { Empty, esc, moiStyles, sharePdf } from "./moiUi";

const CARD_TEXT = { ta: "தங்கள் அன்பான வருகைக்கும் வாழ்த்துக்கும் மனமார்ந்த நன்றி.", en: "Thank you for your presence, blessings and kind gift." };
const num = (n?: number | null) => (Number(n) ? Number(n).toLocaleString("en-IN") : "");
const longDay = (d?: string) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "");
const STYLE = `@page{size:A4;margin:12mm} body{font-family:sans-serif;color:#111} h1{font-size:22px;text-align:center;margin:0} .sub{text-align:center;color:#444;margin:2px 0 10px;font-size:13px}
  table{width:100%;border-collapse:collapse;font-size:12px} th,td{border:1px solid #888;padding:4px 6px} th{background:#f1f1f1} td.n{text-align:right}
  tr.v td{background:#fafafa;font-weight:700} tr.s td{font-weight:700;border-top:2px solid #444} .grand{margin-top:10px;text-align:right;font-size:15px;font-weight:800}
  .cards{display:grid;grid-template-columns:1fr 1fr;gap:6mm} .card{border:1.5px solid #B45309;border-radius:6px;padding:7mm 6mm;height:62mm;break-inside:avoid;
  display:flex;flex-direction:column;justify-content:space-between;text-align:center;background:#FFFBEB} .to{font-size:16px;font-weight:800} .amt{font-size:15px;font-weight:700;color:#92400E}`;

/** Moi book: the village-wise list to print and keep, and thank-you cards for every giver (as PDF to print or share). */
export default function MoiBookScreen() {
  const { theme } = useAppTheme();
  const c = theme.colors;
  const tx = useTx();
  const navigation = useNavigation();
  const { user } = useAuth();
  const functionId = Number(user?.functionId) || 0;
  const [data, setData] = useState<Book | null>(null);
  const [lang, setLang] = useState<"ta" | "en">("ta");
  const [cardText, setCardText] = useState(CARD_TEXT.ta);
  const [showAmount, setShowAmount] = useState("yes");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useLayoutEffect(() => navigation.setOptions({ title: tx("Moi book") }), [navigation, tx]);
  const load = useCallback(async () => {
    if (!functionId) return setMessage(tx("Choose one of your functions first."));
    const r = await getMoiBook(functionId);
    if (r.ok && r.data) setData(r.data);
    else setMessage(tx(r.message));
  }, [functionId, tx]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const villages = useMemo(() => {
    const m = new Map<string, Book["items"]>();
    (data?.items ?? []).forEach((e) => {
      const k = e.villageName || "-";
      m.set(k, [...(m.get(k) ?? []), e]);
    });
    return [...m.entries()].map(([village, rows]) => ({ village, rows, old: rows.reduce((s, r) => s + (Number(r.oldAmount) || 0), 0), total: rows.reduce((s, r) => s + (Number(r.amount) || 0), 0) }));
  }, [data]);
  const grand = villages.reduce((s, v) => s + v.total, 0);
  const fn = data?.function;

  const run = async (f: () => Promise<void>) => {
    setBusy(true);
    try { await f(); } catch { setMessage(tx("Something went wrong. Please try again.")); }
    setBusy(false);
  };
  const book = () => run(async () => {
    let i = 0;
    const rows = villages.map((v) => `<tr class="v"><td colspan="5">${esc(v.village)} (${v.rows.length})</td></tr>${v.rows.map((r) => {
      i += 1;
      return `<tr><td class="n">${i}</td><td>${esc(fullName(r))}</td><td>${esc(r.phoneNo)}</td><td class="n">${num(r.oldAmount)}</td><td class="n">${num(r.amount)}</td></tr>`;
    }).join("")}<tr class="s"><td colspan="3">${esc(v.village)} · ${esc(tx("Total"))}</td><td class="n">${num(v.old)}</td><td class="n">${num(v.total)}</td></tr>`).join("");
    await sharePdf(`<!doctype html><html><head><meta charset="utf-8"><style>${STYLE}</style></head><body><h1>${esc(fn?.functionName)}</h1>
      <div class="sub">${esc([fn?.funPersionNames, longDay(fn?.functionDate), fn?.mahalName].filter(Boolean).join(" · "))}</div>
      <table><thead><tr><th>#</th><th>${esc(tx("Name"))}</th><th>${esc(tx("Mobile"))}</th><th>${esc(tx("Old moi"))}</th><th>${esc(tx("New moi"))}</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="grand">${esc(tx("Grand total"))}: ₹${num(grand)}</div></body></html>`, fn?.functionName ?? "Moi");
  });
  const cards = () => run(async () => {
    const html = (data?.items ?? []).map((r) => `<div class="card"><div><div class="to">${esc(fullName(r))}</div><div>${esc(r.villageName)}</div></div>
      <div>${esc(cardText)}</div>${showAmount === "yes" ? `<div class="amt">₹${num(r.amount)}</div>` : ""}<div style="font-size:12px">${esc(fn?.funPersionNames)}<br>${esc(fn?.functionName)} · ${esc(longDay(fn?.functionDate))}</div></div>`).join("");
    await sharePdf(`<!doctype html><html><head><meta charset="utf-8"><style>${STYLE}</style></head><body><div class="cards">${html}</div></body></html>`, tx("Thank-you cards"));
  });

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text style={{ color: c.textMuted, marginBottom: 10 }}>{tx("Print the moi list village by village, like the family notebook, and thank-you cards for every giver.")}</Text>
        <View style={[moiStyles.card, { backgroundColor: c.card, gap: 8 }]}>
          <Text style={{ color: c.text, fontWeight: "800" }}>{tx("Moi book")}</Text>
          <Text style={{ color: c.textMuted }}>{tx("Village-wise, with old and new moi and totals. Tamil prints correctly.")}</Text>
          <Button mode="contained" icon="book-open-variant" loading={busy} disabled={busy || !data?.items.length} onPress={book}>{tx("Print moi book")}</Button>
        </View>
        <View style={[moiStyles.card, { backgroundColor: c.card, gap: 8 }]}>
          <Text style={{ color: c.text, fontWeight: "800" }}>{tx("Thank-you cards")}</Text>
          <SegmentedButtons density="small" value={lang} onValueChange={(v) => { setLang(v as "ta" | "en"); setCardText(CARD_TEXT[v as "ta" | "en"]); }} buttons={[{ value: "ta", label: "தமிழ்" }, { value: "en", label: "English" }]} />
          <TextInput mode="outlined" multiline value={cardText} onChangeText={setCardText} />
          <SegmentedButtons density="small" value={showAmount} onValueChange={setShowAmount} buttons={[{ value: "yes", label: tx("Show amount") }, { value: "no", label: tx("Hide amount") }]} />
          <Button mode="contained" icon="cards-heart-outline" buttonColor="#b45309" loading={busy} disabled={busy || !data?.items.length} onPress={cards}>{tx("Print cards")}</Button>
        </View>
        {!data ? (functionId ? <ActivityIndicator color={c.primary} /> : null) : !data.items.length ? <Empty icon="book-outline" title={tx("Nothing here yet")} text={tx("Receipts of this function appear here.")} /> : (
          <View style={[moiStyles.card, { backgroundColor: c.card }]}>
            {villages.map((v) => (
              <View key={v.village} style={moiStyles.row}>
                <Text style={{ color: c.text, flex: 1, fontWeight: "700" }}>{v.village} ({v.rows.length})</Text>
                <Text style={{ color: c.text, fontWeight: "800" }}>{inr(v.total)}</Text>
              </View>
            ))}
            <View style={moiStyles.row}><Text style={{ color: c.text, flex: 1, fontWeight: "800" }}>{tx("Grand total")}</Text><Text style={{ color: c.primary, fontWeight: "800" }}>{inr(grand)}</Text></View>
          </View>
        )}
      </ScrollView>
      <Snackbar visible={!!message} onDismiss={() => setMessage("")}>{message}</Snackbar>
    </View>
  );
}
