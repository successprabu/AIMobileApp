import React, { useCallback, useLayoutEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Button, Card, Divider, Text } from "react-native-paper";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { authGet } from "../api/client";
import { PATHS } from "../api/endpoints";
import ActivityOverview from "../components/dashboard/ActivityOverview";
import DashboardBalanceCard from "../components/dashboard/DashboardBalanceCard";
import DashboardMetricGrid from "../components/dashboard/DashboardMetricGrid";
import WelcomeBanner from "../components/ui/WelcomeBanner";
import { Rise } from "../components/ui/AuthUi";
import StatCard from "../components/dashboard/StatCard";
import { DASHBOARD_METRIC_COLORS } from "../constants/dashboardMetrics";
import { useAuth } from "../context/AuthContext";
import type { MainStackParamList } from "../navigation/types";
import QuickActionGrid, { type QuickActionItem } from "../components/dashboard/QuickActionGrid";
import { useTx } from "../i18n/site";
import type { AuthUser } from "../types/auth";
import type {
  DashboardApiResponse,
  DashboardDetailRow,
  DashboardSummary,
} from "../types/dashboard";
import { formatCount, formatInr } from "../utils/formatCurrency";
import { useAppTheme } from "../hooks/useAppTheme";
import MahalDashboardScreen from "./mahal/MahalDashboardScreen";

const API_ROLES = ["SU", "AU", "NU"] as const;

/** Mahal admins get the mahal dashboard; Moitech roles keep the receipts dashboard. */
export default function RoleDashboardScreen() {
  const { user } = useAuth();
  if ((user as AuthUser | null)?.userType === "MU" || (user as AuthUser | null)?.userType === "MS") return <MahalDashboardScreen />;
  return <MoitechDashboardScreen />;
}

function MoitechDashboardScreen() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const { theme } = useAppTheme();
  const c = theme.colors;
  const styles = useMemo(() => makeDashStyles(c), [c]);
  const tx = useTx();
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
    // Dashboard shortcuts open screens without params.
    navigation.navigate(screen as never);
  };
  const familyActions: QuickActionItem[] = [
    { screen: "GuestEntries", label: tx("Guest entries"), icon: "qrcode", color: "#6366f1" },
    { screen: "ThankGivers", label: tx("Thank your givers"), icon: "whatsapp", color: "#16a34a" },
    { screen: "Invitations", label: tx("Invitations"), icon: "email-heart-outline", color: "#db2777" },
    { screen: "MoiBook", label: tx("Moi book"), icon: "book-open-variant", color: "#b45309" },
    { screen: "MoiFamily", label: tx("Family live link"), icon: "share-variant", color: "#0ea5e9" },
    ...(role !== "NU" ? [{ screen: "MoiReturn" as const, label: tx("Moi to return"), icon: "calendar-heart" as const, color: "#7c3aed" }] : []),
  ];

  if (!["SU", "AU", "NU", "MU", "MS"].includes(role)) {
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
          colors={[c.primary]}
          tintColor={c.primary}
        />
      }
    >
      <WelcomeBanner label={t("welcome_back")} name={displayName} role={designation} />

      {useDashboardApi ? (
        <>
          {loading && !refreshing ? (
            <ActivityIndicator style={styles.loader} color={c.primary} />
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
              <Text variant="bodySmall" style={styles.sectionHint}>
                {t("mobile_dashboard_pull_hint", {
                  defaultValue: "Pull down to refresh your latest totals.",
                })}
              </Text>

              <DashboardMetricGrid>
                <StatCard
                  title={t("dashbordTotalAmount")}
                  value={formatInr(summary.totalRcdAmount)}
                  icon="cash-multiple"
                  accent={DASHBOARD_METRIC_COLORS.totalAmount}
                  onPress={() => go("TransactionList")}
                />
                <StatCard
                  title={t("dashbordTotalTrans")}
                  value={formatCount(summary.totalRcdTransaction)}
                  icon="clipboard-check-outline"
                  accent={DASHBOARD_METRIC_COLORS.totalTransactions}
                  onPress={() => go("TransactionList")}
                />
                <StatCard
                  title={t("dashbordTotalPlaces")}
                  value={formatCount(summary.totalPlaces)}
                  icon="map-marker-radius"
                  accent={DASHBOARD_METRIC_COLORS.totalPlaces}
                />
                <StatCard
                  title={t("dashbordTotalExpenase")}
                  value={formatInr(summary.totalExpenses)}
                  icon="wallet-outline"
                  accent={DASHBOARD_METRIC_COLORS.totalExpenses}
                  onPress={() => go("ExpensesList")}
                />
              </DashboardMetricGrid>

              <QuickActionGrid title={tx("Family tools")} actions={familyActions} onPress={go} />

              <Rise delay={420}>
                <DashboardBalanceCard
                  label={t("mobile_net_balance", { defaultValue: "Receipts minus expenses" })}
                  value={formatInr(netBalance)}
                  positive={netBalance >= 0}
                />
              </Rise>
            </View>
          ) : null}

          {!loading && !summary && !error && hasCustomer ? (
            <Text variant="bodyMedium" style={styles.hint}>
              {t("mobile_no_dashboard_data", {
                defaultValue: "No dashboard summary returned for this account.",
              })}
            </Text>
          ) : null}
        </>
      ) : role === "SU" && !hasCustomer ? (
        <Card style={styles.infoCard} mode="elevated">
          <Card.Content style={styles.infoContent}>
            <MaterialCommunityIcons name="shield-account" size={32} color={c.primary} />
            <Text variant="titleMedium" style={styles.infoTitle}>
              {t("mobile_su_dashboard_title", { defaultValue: "Super admin workspace" })}
            </Text>
            <Text variant="bodyMedium" style={styles.infoBody}>
              {t("mobile_su_hint", {
                defaultValue:
                  "Open the side menu to manage clients, functions, users, and system settings.",
              })}
            </Text>
          </Card.Content>
        </Card>
      ) : null}

      {useDashboardApi ? (
        <>
          {!loading && detail.length > 0 ? (
            <Rise delay={520}>
            <Card style={styles.activityCard} mode="elevated">
              <Card.Title
                title={t("mobile_activity_by_place", {
                  defaultValue: "Activity by place",
                })}
                titleStyle={styles.activityTitle}
                subtitle={t("totalRcdNosVsTotalExpenses")}
                left={() => (
                  <MaterialCommunityIcons
                    name="chart-bar"
                    size={28}
                    color={DASHBOARD_METRIC_COLORS.totalAmount}
                  />
                )}
              />
              <Divider />
              <Card.Content style={styles.activityBody}>
                <ActivityOverview rows={detail} />
                <Button
                  mode="contained-tonal"
                  icon="file-chart-outline"
                  onPress={() => go("SummaryReport")}
                  style={styles.reportLink}
                  contentStyle={styles.reportBtnContent}
                >
                  {t("summaryReport")}
                </Button>
              </Card.Content>
            </Card>
            </Rise>
          ) : null}
        </>
      ) : role === "MU" ? (
        <Card style={styles.infoCard} mode="elevated">
          <Card.Content style={styles.infoContent}>
            <MaterialCommunityIcons name="calendar-heart" size={32} color={c.primary} />
            <Text variant="titleMedium" style={styles.infoTitle}>
              {t("mahalBooking")}
            </Text>
            <Text variant="bodyMedium" style={styles.infoBody}>
              {t("mobile_mu_hint", {
                defaultValue:
                  "Use the side menu for mahal booking, booking list, and DigiMoi registration.",
              })}
            </Text>
          </Card.Content>
        </Card>
      ) : null}
    </ScrollView>
  );
}

function makeDashStyles(c: ReturnType<typeof useAppTheme>["theme"]["colors"]) {
  return StyleSheet.create({
    scroll: { flex: 1, backgroundColor: c.background },
    pad: { padding: 16, paddingBottom: 40 },
    hero: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: c.border,
      overflow: "hidden",
      shadowColor: c.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 4,
    },
    heroAccent: {
      position: "absolute",
      left: 0,
      top: 0,
      bottom: 0,
      width: 4,
      backgroundColor: c.primary,
    },
    logo: { width: 48, height: 52, marginRight: 14, marginLeft: 4 },
    heroText: { flex: 1 },
    heroLabel: { color: c.textMuted, textTransform: "uppercase", letterSpacing: 0.6 },
    heroName: { fontWeight: "700", color: c.text, marginTop: 2 },
    heroRole: { color: c.primary, marginTop: 4, fontWeight: "600" },
    sectionTitle: { fontWeight: "700", color: c.text },
    sectionHint: { color: c.textMuted, marginTop: 2, marginBottom: 14 },
    statsSection: { marginBottom: 4 },
    activityCard: {
      marginBottom: 16,
      backgroundColor: c.card,
      borderRadius: 16,
    },
    activityTitle: { fontWeight: "700" },
    activityBody: { paddingTop: 12 },
    infoCard: {
      marginBottom: 16,
      backgroundColor: c.card,
      borderRadius: 16,
    },
    infoContent: { alignItems: "center", paddingVertical: 8 },
    infoTitle: { fontWeight: "700", marginTop: 12, textAlign: "center", color: c.text },
    infoBody: { marginTop: 8, textAlign: "center", color: c.textMuted, lineHeight: 22 },
    card: { marginBottom: 16, backgroundColor: c.card },
    loader: { marginVertical: 24 },
    err: { color: c.danger },
    hint: { color: c.textMuted, marginBottom: 16, textAlign: "center" },
    reportLink: { marginTop: 16, alignSelf: "stretch" },
    reportBtnContent: { paddingVertical: 4 },
    center: { flex: 1, padding: 24, justifyContent: "center" },
    mt: { marginTop: 12 },
  });
}
