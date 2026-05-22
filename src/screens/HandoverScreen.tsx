import React, { useCallback, useLayoutEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  Card,
  DataTable,
  Divider,
  IconButton,
  Snackbar,
  Text,
} from "react-native-paper";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { authGet, authPost } from "../api/client";
import { PATHS } from "../api/endpoints";
import HandoverEditModal from "../components/HandoverEditModal";
import { useAuth } from "../context/AuthContext";
import { useAppTheme } from "../hooks/useAppTheme";
import type { MainStackParamList } from "../navigation/types";
import type { AuthUser } from "../types/auth";
import type {
  HandoverListRow,
  HandoverSavePayload,
  HandoverSaveResponse,
  OthersSummaryRow,
  OverallSummaryRow,
  ReportListResponse,
} from "../types/handover";
import {
  calculateOthersTotals,
  calculateOverallTotals,
  calculateTotals,
} from "../utils/handoverAggregation";

export default function HandoverScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { theme } = useAppTheme();
  const c = theme.colors;
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const u = user as AuthUser;

  const [reportData, setReportData] = useState<OverallSummaryRow[]>([]);
  const [othersData, setOthersData] = useState<OthersSummaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState<HandoverListRow | null>(null);
  const [snack, setSnack] = useState({ visible: false, message: "", isError: false });

  useLayoutEffect(() => {
    navigation.setOptions({ title: t("handOver") });
  }, [navigation, t]);

  const showMessage = (message: string, isError = false) => {
    setSnack({ visible: true, message, isError });
  };

  const load = useCallback(async () => {
    try {
      const params = {
        customer_id: u.customerID ?? 0,
        function_id: u.functionId ?? 0,
      };
      const [overallRes, othersRes] = await Promise.all([
        authGet<ReportListResponse<OverallSummaryRow>>(PATHS.REPORT_OVERALL, params),
        authGet<ReportListResponse<OthersSummaryRow>>(
          PATHS.REPORT_OTHERS_SUMMARY,
          params
        ),
      ]);
      setReportData(overallRes.result && overallRes.data ? overallRes.data : []);
      setOthersData(othersRes.result && othersRes.data ? othersRes.data : []);
    } catch {
      showMessage(t("an_error_occurred"), true);
      setReportData([]);
      setOthersData([]);
    }
  }, [t, u.customerID, u.functionId]);

  React.useEffect(() => {
    setLoading(true);
    void load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const rows = useMemo(() => calculateOverallTotals(reportData), [reportData]);
  const totals = useMemo(() => calculateTotals(reportData), [reportData]);
  const grandTotal = totals.receipt + totals.others - totals.expense;
  const othersGrand = useMemo(() => calculateOthersTotals(othersData), [othersData]);

  const handleSave = async (payload: HandoverSavePayload): Promise<boolean> => {
    try {
      const json = await authPost<HandoverSaveResponse>(PATHS.SAVE_HANDOVER, {
        ...payload,
        handoverBy: payload.handoverBy,
        functionId: u.functionId ?? 0,
        customerId: u.customerID ?? 0,
      });
      if (json.result) {
        showMessage(
          json.message ??
            t("handoverSaved", { defaultValue: "Handover Completed Successfully" })
        );
        await load();
        return true;
      }
      showMessage(json.message ?? t("an_error_occurred"), true);
      return false;
    } catch {
      showMessage(t("an_error_occurred"), true);
      return false;
    }
  };

  const translateMaybe = (key: string) => {
    const translated = t(key);
    return translated === key ? key : translated;
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={{ backgroundColor: c.background }}
        contentContainerStyle={styles.pad}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={c.primary} />
        }
      >
        <Card mode="outlined" style={[styles.card, { backgroundColor: c.card }]}>
          <Card.Title title={t("handOver")} />
          <Card.Content>
            <DataTable>
              <DataTable.Header>
                <DataTable.Title>{t("sNo")}</DataTable.Title>
                <DataTable.Title>{t("receivedBy")}</DataTable.Title>
                <DataTable.Title numeric>{t("receipt")}</DataTable.Title>
                <DataTable.Title numeric>{t("expenses")}</DataTable.Title>
                <DataTable.Title numeric>{t("others")}</DataTable.Title>
                <DataTable.Title numeric>{t("total")}</DataTable.Title>
                <DataTable.Title>{t("actions")}</DataTable.Title>
              </DataTable.Header>
              {rows.length === 0 ? (
                <Text variant="bodySmall" style={styles.empty}>
                  {t("mobile_no_rows", { defaultValue: "No rows." })}
                </Text>
              ) : (
                rows.map((item) => (
                  <DataTable.Row key={`${item.userId}-${item.sNo}`}>
                    <DataTable.Cell>{item.sNo}</DataTable.Cell>
                    <DataTable.Cell>{translateMaybe(item.username)}</DataTable.Cell>
                    <DataTable.Cell numeric>{item.receipt}</DataTable.Cell>
                    <DataTable.Cell numeric>{item.expense}</DataTable.Cell>
                    <DataTable.Cell numeric>{item.others}</DataTable.Cell>
                    <DataTable.Cell numeric>{item.total}</DataTable.Cell>
                    <DataTable.Cell>
                      <IconButton
                        icon="pencil"
                        size={20}
                        onPress={() => setEditing(item)}
                        accessibilityLabel={t("edit")}
                      />
                    </DataTable.Cell>
                  </DataTable.Row>
                ))
              )}
              {rows.length > 0 ? (
                <DataTable.Row>
                  <DataTable.Cell>{t("total")}</DataTable.Cell>
                  <DataTable.Cell> </DataTable.Cell>
                  <DataTable.Cell numeric>{totals.receipt}</DataTable.Cell>
                  <DataTable.Cell numeric>{totals.expense}</DataTable.Cell>
                  <DataTable.Cell numeric>{totals.others}</DataTable.Cell>
                  <DataTable.Cell numeric>{grandTotal}</DataTable.Cell>
                  <DataTable.Cell> </DataTable.Cell>
                </DataTable.Row>
              ) : null}
            </DataTable>
          </Card.Content>
        </Card>

        <Divider style={styles.divider} />

        <Card mode="outlined" style={[styles.card, { backgroundColor: c.card }]}>
          <Card.Title title={t("othersSummary")} />
          <Card.Content>
            <DataTable>
              <DataTable.Header>
                <DataTable.Title>{t("othersType")}</DataTable.Title>
                <DataTable.Title numeric>{t("itemTotal")}</DataTable.Title>
              </DataTable.Header>
              {othersData.length === 0 ? (
                <Text variant="bodySmall" style={styles.empty}>
                  {t("mobile_no_rows", { defaultValue: "No rows." })}
                </Text>
              ) : (
                othersData.map((item, index) => (
                  <DataTable.Row key={`${item.othersType}-${index}`}>
                    <DataTable.Cell>
                      {translateMaybe(item.othersType) || t("others")}
                    </DataTable.Cell>
                    <DataTable.Cell numeric>{item.totalOthers}</DataTable.Cell>
                  </DataTable.Row>
                ))
              )}
              {othersData.length > 0 ? (
                <DataTable.Row>
                  <DataTable.Cell>{t("itemTotal")}</DataTable.Cell>
                  <DataTable.Cell numeric>{othersGrand}</DataTable.Cell>
                </DataTable.Row>
              ) : null}
            </DataTable>
          </Card.Content>
        </Card>
      </ScrollView>

      <HandoverEditModal
        visible={editing !== null}
        row={editing}
        customerId={u.customerID ?? 0}
        functionId={u.functionId ?? 0}
        userId={u.id ?? 0}
        onDismiss={() => setEditing(null)}
        onSave={handleSave}
      />

      <Snackbar
        visible={snack.visible}
        onDismiss={() => setSnack((s) => ({ ...s, visible: false }))}
        duration={4000}
        style={snack.isError ? { backgroundColor: c.danger } : { backgroundColor: c.primary }}
      >
        {snack.message}
      </Snackbar>
    </>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 16, paddingBottom: 48 },
  card: { marginBottom: 12 },
  divider: { marginVertical: 8 },
  empty: { paddingVertical: 12 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  snackErr: { backgroundColor: "#c62828" },
});
