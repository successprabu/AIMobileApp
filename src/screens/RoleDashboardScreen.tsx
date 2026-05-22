import React, { useCallback, useLayoutEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Button, Card, Text } from "react-native-paper";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { authGet } from "../api/client";
import { PATHS } from "../api/endpoints";
import ActivityOverview from "../components/dashboard/ActivityOverview";
import QuickActionGrid, { type QuickActionItem } from "../components/dashboard/QuickActionGrid";
import StatCard from "../components/dashboard/StatCard";
import { DASHBOARD_QUICK_ACTIONS } from "../constants/dashboardQuickActions";
import { useAuth } from "../context/AuthContext";
import type { MainStackParamList } from "../navigation/types";
import type { AuthUser } from "../types/auth";
import type {
  DashboardApiResponse,
  DashboardDetailRow,
  DashboardSummary,
} from "../types/dashboard";
import { formatCount, formatInr } from "../utils/formatCurrency";

const API_ROLES = ["SU", "AU", "NU"] as const;

export default function RoleDashboardScreen() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const u = user as AuthUser;

  useLayoutEffect(() => {
    navigation.setOptions({ title: t("dashboard") });
  }, [navigation, t]);

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [detail, setDetail] = useState<DashboardDetailRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const role = u.userType ?? "";
  const displayName = (u.name as string) ?? (u.userName as string) ?? "";
  const designation = (u.userTypeDescription as string) ?? role;
  const hasCustomer = (u.customerID ?? 0) > 0;
  const useDashboardApi =
    hasCustomer && (API_ROLES as readonly string[]).includes(role);

  const dashParams = useMemo(
    () => ({
      customer_id: u.customerID ?? 0,
      function_id: u.functionId ?? 0,
      user_type: u.userType,
      userId: u.id ?? 0,
    }),
    [u.customerID, u.functionId, u.id, u.userType]
  );

  const loadDash = useCallback(async () => {
    if (!useDashboardApi) {
      setSummary(null);
      setDetail([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [summaryRes, detailRes] = await Promise.all([
        authGet<DashboardApiResponse<DashboardSummary>>(PATHS.DASHBOARD_SUMMARY, dashParams),
        authGet<DashboardApiResponse<DashboardDetailRow[]>>(
          PATHS.DASHBOARD_DETAIL,
          dashParams
        ),
      ]);
      if (summaryRes.result && summaryRes.data) {
        setSummary(summaryRes.data);
      } else {
        setSummary(null);
        if (summaryRes.message) setError(summaryRes.message);
      }
      if (detailRes.result && Array.isArray(detailRes.data)) {
        setDetail(detailRes.data);
      } else {
        setDetail([]);
      }
    } catch {
      setError(t("an_error_occurred"));
      setSummary(null);
      setDetail([]);
    } finally {
      setLoading(false);
    }
  }, [dashParams, t, useDashboardApi]);

  React.useEffect(() => {
    void loadDash();
  }, [loadDash]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadDash();
    } finally {
      setRefreshing(false);
    }
  };

  const go = (screen: keyof MainStackParamList) => {
    navigation.navigate(screen);
  };

  const quickActions: QuickActionItem[] = useMemo(
    () =>
      DASHBOARD_QUICK_ACTIONS.filter((a) => a.roles.includes(role)).map((a) => ({
        screen: a.screen,
        label: t(a.titleKey),
        icon: a.icon as QuickActionItem["icon"],
        color: a.color,
      })),
    [role, t]
  );

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

  const netBalance =
    Number(summary?.totalRcdAmount ?? 0) - Number(summary?.totalExpenses ?? 0);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.pad}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void onRefresh()}
          enabled={useDashboardApi}
        />
      }
    >
      <View style={styles.hero}>
        <Image
          source={require("../../assets/brand-logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <View style={styles.heroText}>
          <Text variant="labelLarge" style={styles.heroLabel}>
            {t("welcome_back")}
          </Text>
          <Text variant="headlineSmall" style={styles.heroName}>
            {displayName}
          </Text>
          <Text variant="bodyMedium" style={styles.heroRole}>
            {designation}
          </Text>
        </View>
      </View>

      <QuickActionGrid
        title={t("mobile_quick_actions", { defaultValue: "Quick actions" })}
        actions={quickActions}
        onPress={go}
      />

      {useDashboardApi ? (
        <>
          {loading && !refreshing ? (
            <ActivityIndicator style={styles.loader} color="#0984e3" />
          ) : null}

          {error ? (
            <Card style={styles.card} mode="outlined">
              <Card.Content>
                <Text style={styles.err}>{error}</Text>
                <Button mode="outlined" onPress={() => void loadDash()} style={styles.mt}>
                  {t("retry", { defaultValue: "Retry" })}
                </Button>
              </Card.Content>
            </Card>
          ) : null}

          {!loading && summary ? (
            <View style={styles.statsSection}>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                {t("mobile_overview", { defaultValue: "Overview" })}
              </Text>
              <StatCard
                title={t("dashbordTotalAmount")}
                value={formatInr(summary.totalRcdAmount)}
                subtitle={t("totalRcdAmount")}
                icon="cash-multiple"
                accent="#0984e3"
                onPress={() => go("TransactionList")}
              />
              <StatCard
                title={t("dashbordTotalTrans")}
                value={formatCount(summary.totalRcdTransaction)}
                subtitle={t("transactionList")}
                icon="clipboard-check-outline"
                accent="#6c5ce7"
                onPress={() => go("TransactionList")}
              />
              <StatCard
                title={t("dashbordTotalPlaces")}
                value={formatCount(summary.totalPlaces)}
                subtitle={t("placeName")}
                icon="map-marker-radius"
                accent="#00b894"
              />
              <StatCard
                title={t("dashbordTotalExpenase")}
                value={formatInr(summary.totalExpenses)}
                subtitle={t("expensesList")}
                icon="wallet-outline"
                accent="#e17055"
                onPress={() => go("ExpensesList")}
              />

              <Card style={styles.balanceCard} mode="elevated">
                <Card.Content>
                  <Text variant="labelLarge" style={styles.balanceLabel}>
                    {t("mobile_net_balance", { defaultValue: "Receipts minus expenses" })}
                  </Text>
                  <Text
                    variant="headlineMedium"
                    style={[
                      styles.balanceValue,
                      { color: netBalance >= 0 ? "#00b894" : "#d63031" },
                    ]}
                  >
                    {formatInr(netBalance)}
                  </Text>
                </Card.Content>
              </Card>
            </View>
          ) : null}

          {!loading && !summary && !error && hasCustomer ? (
            <Text variant="bodyMedium" style={styles.hint}>
              {t("mobile_no_dashboard_data", {
                defaultValue: "No dashboard summary returned for this account.",
              })}
            </Text>
          ) : null}

          {!loading && detail.length > 0 ? (
            <Card style={styles.card} mode="outlined">
              <Card.Title
                title={t("mobile_activity_by_place", {
                  defaultValue: "Activity by place",
                })}
                subtitle={t("totalRcdNosVsTotalExpenses")}
              />
              <Card.Content>
                <ActivityOverview rows={detail} />
                <Button
                  mode="text"
                  icon="chart-bar"
                  onPress={() => go("SummaryReport")}
                  style={styles.reportLink}
                >
                  {t("summaryReport")}
                </Button>
              </Card.Content>
            </Card>
          ) : null}
        </>
      ) : role === "MU" ? (
        <Card style={styles.card} mode="outlined">
          <Card.Content>
            <Text variant="titleMedium">{t("mahalBooking")}</Text>
            <Text variant="bodyMedium" style={styles.mt}>
              {t("mobile_mu_hint", {
                defaultValue: "Use quick actions above for mahal booking and Moitech registration.",
              })}
            </Text>
          </Card.Content>
        </Card>
      ) : role === "SU" && !hasCustomer ? (
        <Card style={styles.card} mode="outlined">
          <Card.Content>
            <Text variant="bodyMedium">
              {t("mobile_su_hint", {
                defaultValue:
                  "Super admin: use quick actions to manage clients, functions, and users.",
              })}
            </Text>
          </Card.Content>
        </Card>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#f0f4f8" },
  pad: { padding: 16, paddingBottom: 40 },
  hero: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#0984e3",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  logo: { width: 48, height: 52, marginRight: 14 },
  heroText: { flex: 1 },
  heroLabel: { color: "#636e72" },
  heroName: { fontWeight: "700", color: "#2d3436" },
  heroRole: { color: "#0984e3", marginTop: 2 },
  sectionTitle: { fontWeight: "700", marginBottom: 10, color: "#2d3436" },
  statsSection: { marginBottom: 8 },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -4,
  },
  statHalf: {
    width: "50%",
    paddingHorizontal: 4,
  },
  balanceCard: {
    marginTop: 4,
    marginBottom: 16,
    backgroundColor: "#fff",
  },
  balanceLabel: { color: "#636e72" },
  balanceValue: { fontWeight: "800", marginTop: 4 },
  card: { marginBottom: 16, backgroundColor: "#fff" },
  loader: { marginVertical: 24 },
  err: { color: "#c62828" },
  hint: { color: "#636e72", marginBottom: 16, textAlign: "center" },
  reportLink: { alignSelf: "flex-start", marginTop: 4 },
  center: { flex: 1, padding: 24, justifyContent: "center" },
  mt: { marginTop: 12 },
});
