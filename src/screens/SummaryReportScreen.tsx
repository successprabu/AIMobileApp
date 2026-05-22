import React, { useLayoutEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Button, Card, DataTable, Divider, Text } from "react-native-paper";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as XLSX from "xlsx";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { authGet } from "../api/client";
import { PATHS } from "../api/endpoints";
import ReportFunctionHeader from "../components/reports/ReportFunctionHeader";
import { useAuth } from "../context/AuthContext";
import { useAppTheme } from "../hooks/useAppTheme";
import { useReportFunctionMeta } from "../hooks/useReportFunctionMeta";
import type { MainStackParamList } from "../navigation/types";
import type { AuthUser } from "../types/auth";
import type { OthersSummaryRow, OverallSummaryRow } from "../types/handover";
import type { ReportListResponse } from "../types/handover";
import {
  calculateOverallTotals,
  calculateOthersTotals,
  calculateTotals,
} from "../utils/handoverAggregation";
import { buildReportPdfHtml, sharePdfFromHtml } from "../export/reportExport";
import type { ReportFunctionMeta } from "../types/report";

function metaSheetRows(meta: ReportFunctionMeta) {
  return [
    { Field: "Function Name", Value: meta.functionName },
    { Field: "Date", Value: meta.functionDate },
    { Field: "Mahal Name", Value: meta.mahalName },
    { Field: "Function Hero/Heroine", Value: meta.funPersionNames },
  ];
}

export default function SummaryReportScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { theme } = useAppTheme();
  const c = theme.colors;
  const { meta, loading: metaLoading } = useReportFunctionMeta();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const u = user as AuthUser;

  const title = t("summaryReport");
  useLayoutEffect(() => {
    navigation.setOptions({ title });
  }, [navigation, title]);

  const [overallRaw, setOverallRaw] = useState<OverallSummaryRow[]>([]);
  const [othersData, setOthersData] = useState<OthersSummaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    try {
      const params = {
        customer_id: u.customerID ?? 0,
        function_id: u.functionId ?? 0,
      };
      const [o, ot] = await Promise.all([
        authGet<ReportListResponse<OverallSummaryRow>>(PATHS.REPORT_OVERALL, params),
        authGet<ReportListResponse<OthersSummaryRow>>(PATHS.REPORT_OTHERS_SUMMARY, params),
      ]);
      setOverallRaw(o.result && o.data ? o.data : []);
      setOthersData(ot.result && ot.data ? ot.data : []);
      if (!o.result && o.message) setError(o.message);
    } catch {
      setError(t("an_error_occurred"));
      setOverallRaw([]);
      setOthersData([]);
    }
  };

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await load();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [t, u.customerID, u.functionId]);

  const rows = useMemo(() => calculateOverallTotals(overallRaw), [overallRaw]);
  const totals = useMemo(() => calculateTotals(overallRaw), [overallRaw]);
  const grandTotal = totals.receipt + totals.others - totals.expense;
  const othersGrand = useMemo(() => calculateOthersTotals(othersData), [othersData]);

  const translateMaybe = (key: string) => {
    const translated = t(key);
    return translated === key ? key : translated;
  };

  const exportExcel = async () => {
    setExporting(true);
    try {
      const wb = XLSX.utils.book_new();
      if (meta) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(metaSheetRows(meta)), "Function");
      }
      const overallSheet = rows.length
        ? rows
        : [{ note: t("noData") }];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(overallSheet), "Overall");
      const othersSheet = othersData.length
        ? othersData
        : [{ note: t("noData") }];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(othersSheet), "Others");
      const base64 = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
      const path = `${FileSystem.cacheDirectory ?? ""}SummaryReport.xlsx`;
      await FileSystem.writeAsStringAsync(path, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      await Sharing.shareAsync(path, {
        mimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        dialogTitle: "SummaryReport.xlsx",
      });
    } finally {
      setExporting(false);
    }
  };

  const exportPdf = async () => {
    setExporting(true);
    try {
      const overallRows = rows.map((r) => ({
        sNo: r.sNo,
        receivedBy: translateMaybe(r.username),
        receipt: r.receipt,
        expenses: r.expense,
        others: r.others,
        total: r.total,
      }));
      const othersRows = othersData.map((item) => ({
        othersType: translateMaybe(item.othersType) || t("others"),
        itemTotal: item.totalOthers,
      }));
      const html = buildReportPdfHtml(
        [
          { title: t("overallSummary"), rows: overallRows as Record<string, unknown>[] },
          { title: t("othersSummary"), rows: othersRows as Record<string, unknown>[] },
        ],
        meta
      );
      await sharePdfFromHtml(html, "SummaryReport.pdf");
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.background }}
      contentContainerStyle={styles.pad}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            void load().finally(() => {
              setRefreshing(false);
              setLoading(false);
            });
          }}
          tintColor={c.primary}
        />
      }
    >
      <ReportFunctionHeader meta={meta} loading={metaLoading} reportTitle={title} />

      <View style={styles.actions}>
        <Button
          mode="contained-tonal"
          icon="file-pdf-box"
          onPress={() => void exportPdf()}
          disabled={exporting}
        >
          {t("downloadPdf")}
        </Button>
        <Button
          mode="contained-tonal"
          icon="microsoft-excel"
          onPress={() => void exportExcel()}
          disabled={exporting}
        >
          {t("exportExcel")}
        </Button>
      </View>

      {error ? <Text style={{ color: c.danger, marginBottom: 8 }}>{error}</Text> : null}

      <Card mode="outlined" style={{ backgroundColor: c.card, marginBottom: 12 }}>
        <Card.Title title={t("overallSummary")} />
        <Card.Content>
          <DataTable>
            <DataTable.Header>
              <DataTable.Title>{t("sNo")}</DataTable.Title>
              <DataTable.Title>{t("receivedBy")}</DataTable.Title>
              <DataTable.Title numeric>{t("receipt")}</DataTable.Title>
              <DataTable.Title numeric>{t("expenses")}</DataTable.Title>
              <DataTable.Title numeric>{t("others")}</DataTable.Title>
              <DataTable.Title numeric>{t("total")}</DataTable.Title>
            </DataTable.Header>
            {rows.length === 0 ? (
              <Text variant="bodySmall" style={{ padding: 12, color: c.textMuted }}>
                {t("noData")}
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
              </DataTable.Row>
            ) : null}
          </DataTable>
        </Card.Content>
      </Card>

      <Divider style={styles.divider} />

      <Card mode="outlined" style={{ backgroundColor: c.card }}>
        <Card.Title title={t("othersSummary")} />
        <Card.Content>
          <DataTable>
            <DataTable.Header>
              <DataTable.Title>{t("othersType")}</DataTable.Title>
              <DataTable.Title numeric>{t("itemTotal")}</DataTable.Title>
            </DataTable.Header>
            {othersData.length === 0 ? (
              <Text variant="bodySmall" style={{ padding: 12, color: c.textMuted }}>
                {t("noData")}
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
  );
}

const styles = StyleSheet.create({
  pad: { padding: 16, paddingBottom: 48 },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  divider: { marginVertical: 8 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
});
