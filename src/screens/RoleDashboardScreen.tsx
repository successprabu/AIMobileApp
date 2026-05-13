import React, { useEffect, useLayoutEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { Card, Text, Button } from "react-native-paper";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { authGet } from "../api/client";
import { PATHS } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import type { AuthUser } from "../types/auth";
import type { MainStackParamList } from "../navigation/types";

function formatSummary(data: Record<string, unknown> | null) {
  if (!data) return [];
  return Object.entries(data)
    .filter(([, v]) => v != null && String(v) !== "")
    .slice(0, 12);
}

export default function RoleDashboardScreen() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const u = user as AuthUser;

  useLayoutEffect(() => {
    navigation.setOptions({ title: t("dashboard") });
  }, [navigation, t]);

  const [summary, setSummary] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const role = u.userType;

  const loadDash = async () => {
    if (!u.customerID || u.customerID === 0) {
      setSummary(null);
      return;
    }
    setLoading(true);
    try {
      const json = await authGet<{ result?: boolean; data?: Record<string, unknown> }>(
        PATHS.DASHBOARD_SUMMARY,
        {
          customer_id: u.customerID,
          function_id: u.functionId ?? 0,
          user_type: u.userType,
          userId: u.id ?? 0,
        }
      );
      if (json.result && json.data) setSummary(json.data);
      else setSummary(null);
    } catch {
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (role === "MU") {
      setSummary(null);
      return;
    }
    void loadDash();
  }, [role, u.customerID, u.functionId, u.id, u.userType]);

  const onRefresh = async () => {
    if (role === "MU") return;
    setRefreshing(true);
    try {
      await loadDash();
    } finally {
      setRefreshing(false);
    }
  };

  if (!["SU", "AU", "NU", "MU"].includes(role)) {
    return (
      <View style={styles.center}>
        <Text variant="titleMedium">
          {t("mobile_unauthorized_role", {
            defaultValue: "Your account type is not supported on mobile yet.",
          })}
        </Text>
        <Button style={styles.mt} mode="contained" onPress={() => void signOut()}>
          {t("Logout")}
        </Button>
      </View>
    );
  }

  const displayName = (u.name as string) ?? (u.userName as string) ?? "";
  const designation = (u.userTypeDescription as string) ?? u.userType;

  const tiles =
    role === "SU"
      ? [
          { k: "clients", n: 52, c: "#0984e3" },
          { k: "transactions", n: 120, c: "#6c5ce7" },
          { k: "functions", n: 30, c: "#00b894" },
          { k: "users", n: 200, c: "#fdcb6e" },
        ]
      : role === "MU"
        ? [
            { k: "mahalBooking", n: "—", c: "#6c5ce7" },
            { k: "mahalBookingList", n: "—", c: "#0984e3" },
          ]
        : [];

  const pairs = formatSummary(summary);

  return (
    <ScrollView
      contentContainerStyle={styles.pad}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />
      }
    >
      <Card mode="elevated" style={styles.hero}>
        <Card.Content>
          <Text variant="headlineSmall">{t("welcome_back")}</Text>
          <Text style={styles.sub} variant="titleMedium">
            {displayName}
          </Text>
          <Text variant="bodyMedium">{designation}</Text>
        </Card.Content>
      </Card>

      {role !== "MU" && pairs.length > 0 ? (
        <Card style={styles.card} mode="outlined">
          <Card.Title
            title={t("dashboard")}
            subtitle={t("mobile_live_summary", {
              defaultValue: "From the same dashboard API as the website.",
            })}
          />
          <Card.Content>
            {pairs.map(([k, v]) => (
              <Text key={k} style={styles.kv} variant="bodyMedium">
                {k}: {String(v)}
              </Text>
            ))}
          </Card.Content>
        </Card>
      ) : null}

      {role !== "MU" && !loading && pairs.length === 0 && (u.customerID ?? 0) > 0 ? (
        <Text variant="bodyMedium">
          {t("mobile_no_dashboard_data", {
            defaultValue: "No dashboard summary returned for this account.",
          })}
        </Text>
      ) : null}

      {tiles.length > 0 ? (
        <View style={styles.grid}>
          {tiles.map((tile) => (
            <Card key={tile.k} style={[styles.tile, { borderLeftColor: tile.c }]}>
              <Card.Content>
                <Text variant="titleLarge">{typeof tile.n === "number" ? tile.n : tile.n}</Text>
                <Text variant="labelLarge">{t(tile.k)}</Text>
              </Card.Content>
            </Card>
          ))}
        </View>
      ) : null}

      {role === "MU" ? (
        <Card style={styles.card} mode="outlined">
          <Card.Content>
            <Text variant="titleMedium">{t("mahalBooking")}</Text>
            <Text style={styles.mt} variant="bodyMedium">
              {t("mobile_mu_hint", {
                defaultValue: "Use the menu for mahal booking, list, and Moitech registration.",
              })}
            </Text>
          </Card.Content>
        </Card>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 16, paddingBottom: 32 },
  hero: { marginBottom: 16 },
  sub: { marginTop: 4 },
  card: { marginBottom: 12 },
  kv: { marginBottom: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  tile: {
    flexGrow: 1,
    flexBasis: "45%",
    borderLeftWidth: 4,
    minWidth: 140,
  },
  center: { flex: 1, padding: 24, justifyContent: "center" },
  mt: { marginTop: 16 },
});
