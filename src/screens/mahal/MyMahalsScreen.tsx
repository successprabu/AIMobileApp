import React, { useCallback, useLayoutEffect, useState } from "react";
import { ActivityIndicator, FlatList, Image, RefreshControl, StyleSheet, View } from "react-native";
import { Button, FAB, Snackbar, Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useAppTheme } from "../../hooks/useAppTheme";
import type { MainStackParamList } from "../../navigation/types";
import { listMyMahals, photoUrl, type Mahal } from "../../api/mahal";
import { FadeIn } from "../../components/mahal/MahalUi";
import { formatInr } from "../../utils/formatCurrency";
import BillingSheet from "../../components/mahal/BillingSheet";
import { useTx } from "../../i18n/site";

type Nav = NativeStackNavigationProp<MainStackParamList>;
const GRADIENTS = ["#7c3aed", "#0ea5e9", "#f59e0b", "#10b981", "#db2777", "#6366f1"];

/** Owner: their halls with capacity, rent and online-booking status. */
export default function MyMahalsScreen() {
  const { theme } = useAppTheme();
  const c = theme.colors;
  const navigation = useNavigation<Nav>();
  const [mahals, setMahals] = useState<Mahal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");
  const [billing, setBilling] = useState<Mahal | null>(null);
  const tx = useTx();

  useLayoutEffect(() => navigation.setOptions({ title: "My mahals" }), [navigation]);

  const load = useCallback(async () => {
    const r = await listMyMahals();
    setLoading(false);
    setRefreshing(false);
    if (r.ok) setMahals(r.data ?? []);
    else setMessage(r.message);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <FlatList
        data={mahals}
        keyExtractor={(m) => String(m.id)}
        contentContainerStyle={{ padding: 16, paddingBottom: 96 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} />}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={{ marginTop: 40 }} color={c.primary} />
          ) : (
            <FadeIn style={{ alignItems: "center", padding: 32 }}>
              <MaterialCommunityIcons name="office-building-outline" size={52} color={c.textMuted} />
              <Text style={{ color: c.text, fontWeight: "800", fontSize: 17, marginTop: 8 }}>No mahals yet</Text>
              <Text style={{ color: c.textMuted, textAlign: "center", marginTop: 4 }}>
                Add your hall with its capacity, rent and facilities. Turn on online booking to get requests.
              </Text>
              <Button mode="contained" icon="plus" style={{ marginTop: 16, borderRadius: 12 }} onPress={() => navigation.navigate("MahalForm", {})}>
                Add your first mahal
              </Button>
            </FadeIn>
          )
        }
        renderItem={({ item: m, index }) => {
          const color = GRADIENTS[m.id % GRADIENTS.length];
          const place = [m.landmark, m.districtName].filter(Boolean).join(", ") || m.addressLine1;
          return (
            <FadeIn index={index}>
              <View style={[styles.card, { backgroundColor: c.card, opacity: m.isActive === false ? 0.65 : 1 }]}>
                <View style={[styles.banner, { backgroundColor: color }]}>
                  {m.coverPhotoId || m.imageUrl ? (
                    <Image source={{ uri: m.coverPhotoId ? photoUrl(m.coverPhotoId, true) : m.imageUrl! }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                  ) : (
                    <MaterialCommunityIcons name="office-building" size={44} color="rgba(255,255,255,0.9)" />
                  )}
                  {(m.photos?.length ?? 0) > 1 && (
                    <View style={styles.count}>
                      <MaterialCommunityIcons name="image-multiple" size={12} color="#fff" />
                      <Text style={{ color: "#fff", fontSize: 11, fontWeight: "800" }}>{m.photos!.length}</Text>
                    </View>
                  )}
                  <View style={styles.badges}>
                    {m.isOnlineBooking && m.isActive !== false && <Badge text="Online" color="#16a34a" />}
                    {m.isActive === false && <Badge text="Inactive" color="#334155" />}
                  </View>
                  {!!m.pendingRequests && (
                    <View style={styles.reqBadge}>
                      <Badge text={`${m.pendingRequests} new ${m.pendingRequests === 1 ? "request" : "requests"}`} color="#f59e0b" />
                    </View>
                  )}
                </View>
                <View style={{ padding: 14 }}>
                  <Text style={{ color: c.text, fontWeight: "800", fontSize: 17 }} numberOfLines={1}>{m.mahalName}</Text>
                  <View style={styles.row}>
                    <MaterialCommunityIcons name="map-marker-outline" size={15} color={c.textMuted} />
                    <Text style={{ color: c.textMuted }} numberOfLines={1}>{place}</Text>
                  </View>
                  <View style={[styles.row, { gap: 14, marginTop: 6 }]}>
                    {!!m.capacity && <Text style={{ color: c.textMuted }}>👥 {m.capacity}</Text>}
                    {!!m.pricePerDay && <Text style={{ color: c.textMuted }}>{formatInr(m.pricePerDay)}/day</Text>}
                    <Text style={{ color: c.textMuted }}>{m.upcomingEvents ?? 0} upcoming</Text>
                  </View>
                  <View style={[styles.row, { marginTop: 10, gap: 8, flexWrap: "wrap" }]}>
                    <Button compact mode="outlined" icon="pencil" onPress={() => navigation.navigate("MahalForm", { mahalId: m.id })}>Edit</Button>
                    <Button compact mode="contained-tonal" icon="calendar-check" onPress={() => navigation.navigate("MahalBookings", { tab: m.pendingRequests ? "Pending" : "Upcoming" })}>Bookings</Button>
                    <Button compact mode="outlined" icon="receipt-text-outline" textColor={m.payOnline || m.gstEnabled ? c.success : undefined}
                      accessibilityLabel={tx("GST invoice and online payment")} onPress={() => setBilling(m)}>
                      {tx("Billing")}
                    </Button>
                  </View>
                </View>
              </View>
            </FadeIn>
          );
        }}
      />
      <FAB icon="plus" label="Add mahal" color="#fff" style={[styles.fab, { backgroundColor: c.primary }]} onPress={() => navigation.navigate("MahalForm", {})} />
      <BillingSheet mahal={billing} onClose={() => setBilling(null)}
        onSaved={(nm, msg) => { setBilling(null); setMessage(msg); setMahals((list) => list.map((x) => (x.id === nm.id ? { ...x, ...nm } : x))); }} />
      <Snackbar visible={!!message} onDismiss={() => setMessage("")}>{message}</Snackbar>
    </View>
  );
}

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: color }]}>
      <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  count: { position: "absolute", left: 10, bottom: 10, flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "rgba(15,23,42,0.7)", borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 },
  card: { borderRadius: 18, overflow: "hidden", marginBottom: 16, elevation: 2, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } },
  banner: { height: 120, alignItems: "center", justifyContent: "center" },
  badges: { position: "absolute", top: 10, left: 10, flexDirection: "row", gap: 6 },
  reqBadge: { position: "absolute", top: 10, right: 10 },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  row: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  fab: { position: "absolute", right: 16, bottom: 20 },
});
