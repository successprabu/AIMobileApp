import React, { useCallback, useLayoutEffect, useState } from "react";
import { ActivityIndicator, Linking, RefreshControl, ScrollView, View } from "react-native";
import { Button, FAB, IconButton, ProgressBar, Snackbar, Text, TextInput } from "react-native-paper";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useAppTheme } from "../../hooks/useAppTheme";
import { useTx } from "../../i18n/site";
import Sheet from "../../components/ui/Sheet";
import { addNotebook, inr, listNotebooks, readNotebookPage, saveNotebook, SITE, type Notebook, type NotebookRow } from "../../api/moitech";
import { dayText, Empty, moiStyles } from "./moiUi";

type Row = NotebookRow & { key: string };

/** Old moi notebooks: photograph the pages of past functions; AI types them in for Moi to return. Paid plans only. */
export default function OldNotebooksScreen() {
  const { theme } = useAppTheme();
  const c = theme.colors;
  const tx = useTx();
  const navigation = useNavigation();
  const [data, setData] = useState<{ items: Notebook[]; allowed: boolean; aiOn: boolean } | null>(null);
  const [open, setOpen] = useState<Notebook | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [progress, setProgress] = useState<{ n: number; of: number } | null>(null);
  const [adding, setAdding] = useState<{ name: string; date: string; names: string } | null>(null);
  const [message, setMessage] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  useLayoutEffect(() => navigation.setOptions({ title: open ? open.functionName : tx("Old moi notebooks") }), [navigation, tx, open]);
  const load = useCallback(async () => {
    const r = await listNotebooks();
    setRefreshing(false);
    if (r.ok && r.data) setData(r.data);
    else {
      setData({ items: [], allowed: false, aiOn: false });
      setMessage(tx(r.message));
    }
  }, [tx]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const add = async () => {
    if (!adding) return;
    const r = await addNotebook(adding);
    if (!r.ok || !r.data) return setMessage(tx(r.message));
    setAdding(null);
    void load();
    setRows([]);
    setOpen({ ...r.data, count: 0, total: 0 });
  };

  const pick = async (camera: boolean) => {
    if (!open) return;
    const perm = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return setMessage(tx("Please allow photos for this app in your phone settings."));
    const res = camera
      ? await ImagePicker.launchCameraAsync({ quality: 0.9 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsMultipleSelection: true, selectionLimit: 20, quality: 0.9 });
    if (res.canceled) return;
    const assets = res.assets;
    for (let i = 0; i < assets.length; i += 1) {
      setProgress({ n: i + 1, of: assets.length });
      const a = assets[i];
      const scale = Math.min(1, 2000 / Math.max(a.width || 2000, a.height || 2000));
      const img = await ImageManipulator.manipulateAsync(a.uri, scale < 1 ? [{ resize: { width: Math.round((a.width || 2000) * scale) } }] : [],
        { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG, base64: true });
      const r = await readNotebookPage(open.id, img.base64 ?? "");
      if (!r.ok) {
        setMessage(tx(r.message));
        if ((r.data as unknown as { code?: string } | undefined)?.code) break;
        continue;
      }
      const page = (r.data?.rows ?? []).map((x) => ({ ...x, key: `${Date.now()}-${Math.random()}` }));
      if (!page.length) setMessage(tx(r.message));
      setRows((old) => [...old, ...page]);
    }
    setProgress(null);
  };
  const edit = (key: string, k: keyof NotebookRow, v: string) =>
    setRows((old) => old.map((x) => (x.key === key ? { ...x, [k]: k === "amount" || k === "oldAmount" ? Number(v.replace(/[^\d.]/g, "")) || 0 : v } : x)));
  const save = async () => {
    if (!open) return;
    const r = await saveNotebook(open.id, rows.map(({ key, ...x }) => x));
    if (!r.ok) return setMessage(tx(r.message));
    setMessage(tx("{{n}} entries saved.", { n: r.data?.saved ?? rows.length }));
    setRows([]);
    setOpen(null);
    void load();
  };

  if (open) {
    const total = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    return (
      <View style={{ flex: 1, backgroundColor: c.background }}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          <Button icon="arrow-left" compact onPress={() => setOpen(null)} style={{ alignSelf: "flex-start" }}>{tx("Old moi notebooks")}</Button>
          <Text style={{ color: c.textMuted, marginVertical: 8 }}>{tx("Photograph each page in good light. AI reads the entries; check them before saving.")}</Text>
          <View style={moiStyles.wrap}>
            <Button mode="contained" icon="camera" disabled={!!progress} onPress={() => void pick(true)}>{tx("Camera")}</Button>
            <Button mode="outlined" icon="image-multiple" disabled={!!progress} onPress={() => void pick(false)}>{tx("Add page photos")}</Button>
          </View>
          {progress && (
            <View style={{ marginVertical: 10 }}>
              <Text style={{ color: c.text }}>{tx("Reading page {{n}} of {{of}}…", progress)}</Text>
              <ProgressBar indeterminate color={c.primary} />
            </View>
          )}
          {rows.length === 0 ? <Empty icon="notebook-outline" title={tx("No entries yet")} text={tx("Add photos of the notebook pages. You can add many pages at once.")} /> : (
            <>
              <Text style={{ color: c.text, fontWeight: "800", marginVertical: 10 }}>{rows.length} · {inr(total)}</Text>
              {rows.map((r) => (
                <View key={r.key} style={[moiStyles.card, { backgroundColor: c.card, gap: 6, padding: 10 }]}>
                  <View style={{ flexDirection: "row", gap: 6 }}>
                    <TextInput dense mode="outlined" label={tx("Place")} value={r.villageName} onChangeText={(v) => edit(r.key, "villageName", v)} style={{ flex: 1 }} />
                    <IconButton icon="delete-outline" iconColor={c.danger} onPress={() => setRows((o) => o.filter((x) => x.key !== r.key))} />
                  </View>
                  <View style={{ flexDirection: "row", gap: 6 }}>
                    <TextInput dense mode="outlined" label={tx("Initial")} value={r.initial} onChangeText={(v) => edit(r.key, "initial", v)} style={{ width: 80 }} />
                    <TextInput dense mode="outlined" label={tx("Name")} value={r.name} onChangeText={(v) => edit(r.key, "name", v)} style={{ flex: 1 }} />
                  </View>
                  <View style={{ flexDirection: "row", gap: 6 }}>
                    <TextInput dense mode="outlined" keyboardType="numeric" label={tx("Amount")} value={String(r.amount || "")} onChangeText={(v) => edit(r.key, "amount", v)} style={{ flex: 1 }} />
                    <TextInput dense mode="outlined" keyboardType="numeric" label={tx("Old moi")} value={String(r.oldAmount || "")} onChangeText={(v) => edit(r.key, "oldAmount", v)} style={{ flex: 1 }} />
                  </View>
                </View>
              ))}
              <Button mode="contained" buttonColor="#16a34a" onPress={save} disabled={!!progress} style={{ borderRadius: 12 }}>{tx("Save entries")}</Button>
            </>
          )}
        </ScrollView>
        <Snackbar visible={!!message} onDismiss={() => setMessage("")}>{message}</Snackbar>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 96 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} />}>
        <Text style={{ color: c.textMuted, marginBottom: 10 }}>{tx("Photograph the moi notebooks of past functions. AI types them in, so Moi to return knows who gave what, even from years ago.")}</Text>
        {data && !data.allowed && (
          <View style={[moiStyles.card, { backgroundColor: c.card, gap: 8 }]}>
            <Text style={{ color: c.text }}>{tx("Old notebook import comes with the Standard and Premium plans. Choose a plan to use it.")}</Text>
            <Button mode="contained" onPress={() => void Linking.openURL(`${SITE}/pricing?product=moitech`)}>{tx("Choose a plan")}</Button>
          </View>
        )}
        {!data ? <ActivityIndicator color={c.primary} /> : data.items.length === 0 ? (
          <Empty icon="notebook-outline" title={tx("No old notebooks yet")} text={tx("Add a past function, then add photos of its notebook pages.")} />
        ) : data.items.map((b) => (
          <View key={b.id} style={[moiStyles.card, { backgroundColor: c.card }]}>
            <Text style={{ color: c.text, fontWeight: "800" }}>{b.functionName}</Text>
            <Text style={{ color: c.textMuted, fontSize: 12 }}>{dayText(b.functionDate)}{b.funPersionNames ? ` · ${b.funPersionNames}` : ""}</Text>
            <Text style={{ color: c.text, fontWeight: "700", marginTop: 4 }}>{tx("{{n}} givers", { n: b.count })} · {inr(b.total)}</Text>
            <Button compact icon="camera" disabled={!data.allowed} onPress={() => { setRows([]); setOpen(b); }} style={{ alignSelf: "flex-start" }}>{tx("Add pages")}</Button>
          </View>
        ))}
      </ScrollView>
      <FAB icon="plus" label={tx("Add a past function")} color="#fff" disabled={!data?.allowed} style={[moiStyles.fab, { backgroundColor: c.primary }]} onPress={() => setAdding({ name: "", date: "", names: "" })} />
      <Sheet visible={!!adding} title={tx("Add a past function")} onClose={() => setAdding(null)}>
        {adding && (
          <View style={{ gap: 8 }}>
            <TextInput mode="outlined" label={tx("Function name")} placeholder={tx("e.g. Arun wedding 2015")} value={adding.name} onChangeText={(v) => setAdding({ ...adding, name: v })} />
            <TextInput mode="outlined" label={`${tx("Function date")} (YYYY-MM-DD)`} value={adding.date} onChangeText={(v) => setAdding({ ...adding, date: v.slice(0, 10) })} />
            <TextInput mode="outlined" label={tx("Family names (optional)")} value={adding.names} onChangeText={(v) => setAdding({ ...adding, names: v })} />
            <Button mode="contained" onPress={add} style={{ borderRadius: 12 }}>{tx("Save")}</Button>
          </View>
        )}
      </Sheet>
      <Snackbar visible={!!message} onDismiss={() => setMessage("")}>{message}</Snackbar>
    </View>
  );
}
