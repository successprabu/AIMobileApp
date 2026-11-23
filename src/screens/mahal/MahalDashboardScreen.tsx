import React, { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { Button, Snackbar, Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useAppTheme } from "../../hooks/useAppTheme";
import { useAuth } from "../../context/AuthContext";
import type { MainStackParamList } from "../../navigation/types";
import { getMahalSummary, type MahalSummary } from "../../api/mahal";
import { BookingCard, FadeIn, StatTile } from "../../components/mahal/MahalUi";
import WelcomeBanner from "../../components/ui/WelcomeBanner";
import { formatCount, formatInr } from "../../utils/formatCurrency";

type Nav = NativeStackNavigationProp<MainStackParamList>;

/** Mahal admin home: requests to answer, upcoming events, money, and a 12-month bookings chart. */
export default function MahalDashboardScreen() {
  const { theme } = useAppTheme();
  const c = theme.colors;
  const { user } = useAuth();
  const navigation = useNavigation<Nav>();
  const [s, setS] = useState<MahalSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const r = await getMahalSummary();
    setLoading(false);
    setRefreshing(false);
    if (r.ok) setS(r.data ?? null);
    else setMessage(r.message);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const name = (user?.name as string) ?? "";
  const max = Math.max(1, ...(s?.months ?? []).map((m) => m.count));
  const thisMonth = new Date().toISOString().slice(0, 7);

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} />}>
        <WelcomeBanner label="Welcome back" name={name} role="Your mahal at a glance" art="mahal">
          <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
            <Button mode="contained" buttonColor="#fff" textColor={c.primary} icon="plus" style={styles.heroBtn} onPress={() => navigation.navigate("BookingForm", {})} disabled={s?.mahalCount === 0}>
              New booking
            </Button>
            <Button mode="outlined" textColor="#fff" icon="office-building" style={[styles.heroBtn, { borderColor: "rgba(255,255,255,0.6)" }]} onPress={() => navigation.navigate("MyMahals")}>
              My mahals
            </Button>
          </View>
        </WelcomeBanner>

        {loading && !s ? (
          <ActivityIndicator style={{ marginTop: 32 }} color={c.primary} />
        ) : s && s.mahalCount === 0 ? (
          <FadeIn index={1} style={[styles.card, { backgroundColor: c.card, alignItems: "center" }]}>
            <MaterialCommunityIcons name="office-building-plus-outline" size={48} color={c.primary} />
            <Text style={{ color: c.text, fontWeight: "800", fontSize: 17, marginTop: 8 }}>Add your mahal to start taking bookings</Text>
            <Text style={{ color: c.textMuted, textAlign: "center", marginTop: 4 }}>Enter capacity, rent and facilities, and turn on online booking.</Text>
            <Button mode="contained" icon="plus" style={{ marginTop: 14, borderRadius: 12 }} onPress={() => navigation.navigate("MahalForm", {})}>Add mahal</Button>
          </FadeIn>
        ) : s ? (
          <>
            <View style={styles.tiles}>
              <FadeIn index={1} style={styles.tileWrap}>
                <StatTile label="New requests" value={formatCount(s.pendingRequests)} icon="email-alert-outline" color={c.warning} onPress={() => navigation.navigate("MahalBookings", { tab: "Pending" })} />
              </FadeIn>
              <FadeIn index={2} style={styles.tileWrap}>
                <StatTile label="Upcoming events" value={formatCount(s.upcomingEvents)} icon="calendar-check" color={c.primary} onPress={() => navigation.navigate("MahalBookings", { tab: "Upcoming" })} />
              </FadeIn>
              <FadeIn index={3} style={styles.tileWrap}>
                <StatTile label="This month's rent" value={formatInr(s.monthRevenue)} icon="currency-inr" color={c.success} />
              </FadeIn>
              <FadeIn index={4} style={styles.tileWrap}>
                <StatTile label="Balance to collect" value={formatInr(s.balanceDue)} icon="wallet-outline" color="#0ea5e9" />
              </FadeIn>
            </View>

            <FadeIn index={5} style={[styles.card, { backgroundColor: c.card }]}>
              <Text style={[styles.cardTitle, { color: c.text }]}>Bookings per month</Text>
              <View style={styles.chart} accessibilityLabel={`Bookings per month: ${s.months.map((m) => `${m.month} ${m.count}`).join(", ")}`}>
                {s.months.map((m) => {
                  const current = m.month === thisMonth;
                  return (
                    <View key={m.month} style={styles.barCol}>
                      <Text style={{ color: c.textMuted, fontSize: 10 }}>{m.count || ""}</Text>
                      <View style={[styles.bar, { height: `${(m.count / max) * 82}%`, backgroundColor: current ? c.primary : `${c.primary}88` }]} />
                      <Text style={{ color: current ? c.primary : c.textMuted, fontSize: 10, fontWeight: current ? "800" : "400" }}>
                        {new Date(`${m.month}-01T00:00:00`).toLocaleDateString("en-IN", { month: "narrow" })}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </FadeIn>

            <FadeIn index={6} style={[styles.card, { backgroundColor: c.card }]}>
              <View style={styles.cardHead}>
                <Text style={[styles.cardTitle, { color: c.text }]}>Requests to answer</Text>
                <Pressable onPress={() => navigation.navigate("MahalBookings", { tab: "Pending" })}><Text style={{ color: c.primary, fontWeight: "700" }}>All</Text></Pressable>
              </View>
              {s.pending.length === 0 ? (
                <Text style={{ color: c.textMuted }}>All caught up. New requests from the booking site appear here.</Text>
              ) : (
                s.pending.map((b, i) => <BookingCard key={b.id} booking={b} index={i} onPress={() => navigation.navigate("MahalBookings", { tab: "Pending" })} />)
              )}
            </FadeIn>

            <FadeIn index={7} style={[styles.card, { backgroundColor: c.card }]}>
              <View style={styles.cardHead}>
                <Text style={[styles.cardTitle, { color: c.text }]}>Coming up</Text>
                <Pressable onPress={() => navigation.navigate("MahalBookings", { tab: "Upcoming" })}><Text style={{ color: c.primary, fontWeight: "700" }}>All</Text></Pressable>
              </View>
              {s.upcoming.length === 0 ? (
                <Text style={{ color: c.textMuted }}>No upcoming events.</Text>
              ) : (
                s.upcoming.map((b, i) => <BookingCard key={b.id} booking={b} index={i} onPress={() => navigation.navigate("MahalBookings", { tab: "Upcoming" })} />)
              )}
            </FadeIn>
          </>
        ) : null}
      </ScrollView>
      <Snackbar visible={!!message} onDismiss={() => setMessage("")}>{message}</Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: 20, padding: 20, marginBottom: 14 },
  heroHi: { color: "rgba(255,255,255,0.85)" },
  heroTitle: { color: "#fff", fontSize: 22, fontWeight: "800", marginTop: 2 },
  heroBtn: { borderRadius: 12 },
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 14 },
  tileWrap: { flexGrow: 1, flexBasis: "45%" },
  card: { borderRadius: 16, padding: 16, marginBottom: 14, elevation: 1, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  cardHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  cardTitle: { fontWeight: "800", fontSize: 16 },
  chart: { flexDirection: "row", alignItems: "flex-end", height: 140, gap: 4, marginTop: 12 },
  barCol: { flex: 1, height: "100%", alignItems: "center", justifyContent: "flex-end", gap: 4 },
  bar: { width: "70%", minHeight: 2, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
});
