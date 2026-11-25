import React, { useCallback, useLayoutEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { Button, Chip, Snackbar, Text, TextInput } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { MainStackParamList } from "../../navigation/types";
import { useAppTheme } from "../../hooks/useAppTheme";
import { useAuth } from "../../context/AuthContext";
import { fmtRange } from "../../api/mahal";
import { hideReview, listReviews, replyReview, type Review, type ReviewList } from "../../api/mahalPlus";
import { FadeIn } from "../../components/mahal/MahalUi";
import { useTx } from "../../i18n/site";

const GOLD = "#f59e0b";

export function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <View style={{ flexDirection: "row" }} accessibilityLabel={`${value} / 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <MaterialCommunityIcons key={i} name={value >= i - 0.25 ? "star" : value >= i - 0.75 ? "star-half-full" : "star-outline"} size={size} color={GOLD} />
      ))}
    </View>
  );
}

function ReviewCard({ r, staff, index, onChanged, onMessage }: { r: Review; staff: boolean; index: number; onChanged: (r: Review) => void; onMessage: (m: string) => void }) {
  const { theme } = useAppTheme();
  const c = theme.colors;
  const tx = useTx();
  const [replying, setReplying] = useState(false);
  const [text, setText] = useState(r.reply ?? "");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    const res = await replyReview(r.id, text);
    setBusy(false);
    onMessage(tx(res.message));
    if (res.ok) {
      setReplying(false);
      onChanged({ ...r, reply: res.data?.reply ?? null });
    }
  };
  const toggle = async () => {
    setBusy(true);
    const res = await hideReview(r.id, !r.isHidden);
    setBusy(false);
    onMessage(tx(res.message));
    if (res.ok) onChanged({ ...r, isHidden: !!res.data?.isHidden });
  };

  return (
    <FadeIn index={index} style={[styles.card, { backgroundColor: c.card, opacity: r.isHidden ? 0.6 : 1 }]}>
      <View style={styles.row}>
        <View style={[styles.avatar, { backgroundColor: `${c.primary}22` }]}><Text style={{ color: c.primary, fontWeight: "800" }}>{(r.customerName || "?").charAt(0).toUpperCase()}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: c.text, fontWeight: "700" }} numberOfLines={1}>{r.customerName}</Text>
          <Text style={{ color: c.textMuted, fontSize: 12 }} numberOfLines={1}>{r.mahalName} · {tx(r.eventType || "Event")} · {fmtRange(r.fromDate)}</Text>
        </View>
        <Stars value={r.rating} />
      </View>
      {r.isHidden && <Chip compact icon="eye-off-outline" style={{ alignSelf: "flex-start", marginTop: 8 }}>{tx("Hidden from your hall page")}</Chip>}
      <Text style={{ color: r.comment ? c.text : c.textMuted, marginTop: 8 }}>{r.comment || tx("No comment, stars only.")}</Text>
      {!!r.reply && !replying && (
        <View style={[styles.reply, { borderColor: c.primary }]}>
          <Text style={{ color: c.primary, fontWeight: "700", fontSize: 12 }}>{tx("Your reply")}</Text>
          <Text style={{ color: c.textMuted }}>{r.reply}</Text>
        </View>
      )}
      {replying && (
        <View style={{ marginTop: 8, gap: 8 }}>
          <TextInput mode="outlined" multiline label={tx("Your reply (shown on your hall page)")} value={text} onChangeText={(v) => setText(v.slice(0, 500))} autoFocus />
          <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8 }}>
            <Button onPress={() => { setReplying(false); setText(r.reply ?? ""); }} disabled={busy}>{tx("Close")}</Button>
            <Button mode="contained" onPress={save} loading={busy} disabled={busy}>{tx("Save")}</Button>
          </View>
        </View>
      )}
      {!staff && !replying && (
        <View style={{ flexDirection: "row", gap: 4, marginTop: 6 }}>
          <Button compact icon="reply" onPress={() => setReplying(true)}>{tx(r.reply ? "Edit reply" : "Reply")}</Button>
          <Button compact icon={r.isHidden ? "eye-outline" : "eye-off-outline"} textColor={c.textMuted} onPress={toggle} disabled={busy}>
            {tx(r.isHidden ? "Show on hall page" : "Hide")}
          </Button>
        </View>
      )}
    </FadeIn>
  );
}

/** Customer reviews of the owner's halls, with replies and hiding (owner). Staff can read them. */
export default function MahalReviewsScreen() {
  const { theme } = useAppTheme();
  const c = theme.colors;
  const tx = useTx();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { user } = useAuth();
  const staff = user?.userType === "MS";
  const [data, setData] = useState<ReviewList | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");

  useLayoutEffect(() => navigation.setOptions({ title: tx("Reviews") }), [navigation, tx]);
  const load = useCallback(async () => {
    const r = await listReviews();
    setRefreshing(false);
    setData(r.ok && r.data ? r.data : { items: [], average: 0, count: 0, stars: [] });
    if (!r.ok) setMessage(tx(r.message));
  }, [tx]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} />}>
        <Text style={{ color: c.textMuted, marginBottom: 12 }}>{tx("What customers say after their event. Reply to thank them, or hide a review from your hall page.")}</Text>
        {!data ? <ActivityIndicator color={c.primary} /> : (
          <>
            {data.count > 0 && (
              <View style={[styles.card, styles.row, { backgroundColor: c.card, gap: 16 }]}>
                <View style={{ alignItems: "center", minWidth: 90 }}>
                  <Text style={{ color: c.text, fontSize: 34, fontWeight: "800" }}>{data.average.toFixed(1)}</Text>
                  <Stars value={data.average} />
                  <Text style={{ color: c.textMuted, fontSize: 12 }}>{tx(data.count === 1 ? "1 review" : "{{n}} reviews", { n: data.count })}</Text>
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  {data.stars.map((s) => (
                    <View key={s.stars} style={styles.row}>
                      <Text style={{ color: c.textMuted, width: 26, fontSize: 12 }}>{s.stars}★</Text>
                      <View style={[styles.track, { backgroundColor: c.border }]}>
                        <View style={{ width: `${data.count ? (s.count / data.count) * 100 : 0}%`, height: "100%", backgroundColor: GOLD, borderRadius: 4 }} />
                      </View>
                      <Text style={{ color: c.textMuted, width: 24, textAlign: "right", fontSize: 12 }}>{s.count}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
            {data.items.length === 0 ? (
              <View style={{ alignItems: "center", padding: 24 }}>
                <MaterialCommunityIcons name="star-outline" size={48} color={c.textMuted} />
                <Text style={{ color: c.text, fontWeight: "800", marginTop: 6 }}>{tx("No reviews yet")}</Text>
                <Text style={{ color: c.textMuted, textAlign: "center" }}>{tx('The thank-you message after each event asks the family for a review. Send it from "Send today" on your dashboard.')}</Text>
              </View>
            ) : data.items.map((r, i) => (
              <ReviewCard key={r.id} r={r} staff={staff} index={i} onMessage={setMessage}
                onChanged={(nr) => setData((d) => (d ? { ...d, items: d.items.map((x) => (x.id === nr.id ? nr : x)) } : d))} />
            ))}
          </>
        )}
      </ScrollView>
      <Snackbar visible={!!message} onDismiss={() => setMessage("")}>{message}</Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, padding: 14, marginBottom: 12, elevation: 1, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  reply: { marginTop: 8, paddingLeft: 10, borderLeftWidth: 3 },
  track: { flex: 1, height: 8, borderRadius: 4, overflow: "hidden" },
});
