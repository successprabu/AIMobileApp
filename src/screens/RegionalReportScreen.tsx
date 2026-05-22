import React, { useCallback, useLayoutEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Button, Card, DataTable, Text, TextInput } from "react-native-paper";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { authGet } from "../api/client";
import { PATHS } from "../api/endpoints";
import ReportFunctionHeader from "../components/reports/ReportFunctionHeader";
import { useAuth } from "../context/AuthContext";
import { useAppTheme } from "../hooks/useAppTheme";
import { useReportFunctionMeta } from "../hooks/useReportFunctionMeta";
import { useThemedInputProps } from "../hooks/useThemedInputProps";
import type { MainStackParamList } from "../navigation/types";
import type { AuthUser } from "../types/auth";
import type { RegionalReportApiResponse } from "../types/report";
import { shareExcel, sharePdfReport } from "../export/reportExport";
import {
  paginateRegionalRows,
  parseRegionalReportResponse,
  regionalRowsWithSerial,
} from "../utils/reportApi";

export default function RegionalReportScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { theme } = useAppTheme();
  const c = theme.colors;
  const inputTheme = useThemedInputProps();
  const { meta, loading: metaLoading } = useReportFunctionMeta();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const u = user as AuthUser;

  const title = t("locationAmountReport");
  useLayoutEffect(() => {
    navigation.setOptions({ title });
  }, [navigation, title]);

  const [placeName, setPlaceName] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [rows, setRows] = useState<{ sNo: number; villageName: string; total: number }[]>([]);
  const [pageTotal, setPageTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const baseParams = useMemo(
    () => ({
      customer_id: u.customerID ?? 0,
      function_id: u.functionId ?? 0,
      trans_type: "R" as const,
      report_type: "REGIONAL",
      userId: u.id ?? 0,
      village_name: placeName,
    }),
    [u.customerID, u.functionId, u.id, placeName]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const json = await authGet<RegionalReportApiResponse>(PATHS.REPORT_REGIONAL, {
        ...baseParams,
        current_page: page,
        page_size: pageSize,
      });
      const parsed = parseRegionalReportResponse(json);
      if (parsed.message && !parsed.rows.length) {
        setError(parsed.message);
      }
      let rowsForPage = parsed.rows;
      let totalPages = parsed.totalPages;
      if (
        Array.isArray(json.data) &&
        rowsForPage.length > pageSize &&
        totalPages <= 1
      ) {
        const paged = paginateRegionalRows(rowsForPage, page, pageSize);
        rowsForPage = paged.pageRows;
        totalPages = paged.totalPages;
      }
      const display = regionalRowsWithSerial(rowsForPage, page, pageSize);
      setRows(display);
      setTotalPages(totalPages);
      setPageTotal(display.reduce((sum, r) => sum + r.total, 0));
    } catch {
      setError(t("an_error_occurred"));
      setRows([]);
      setPageTotal(0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [baseParams, page, pageSize, t]);

  React.useEffect(() => {
    void load();
  }, [load, tick]);

  const fetchAllRows = async () => {
    const json = await authGet<RegionalReportApiResponse>(PATHS.REPORT_REGIONAL, {
      ...baseParams,
      userId: 0,
      current_page: 1,
      page_size: 5000,
    });
    const parsed = parseRegionalReportResponse(json);
    return regionalRowsWithSerial(parsed.rows, 1, parsed.rows.length || 1);
  };

  const onExportExcel = async () => {
    setExporting(true);
    try {
      const all = await fetchAllRows();
      await shareExcel(
        all as Record<string, unknown>[],
        "RegionalSummary.xlsx",
        "Regional",
        meta
      );
    } finally {
      setExporting(false);
    }
  };

  const onExportPdf = async () => {
    setExporting(true);
    try {
      const all = await fetchAllRows();
      await sharePdfReport(
        [{ title, rows: all as Record<string, unknown>[] }],
        "RegionalSummary.pdf",
        meta
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.background }}
      contentContainerStyle={styles.pad}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            setTick((x) => x + 1);
          }}
          tintColor={c.primary}
        />
      }
    >
      <ReportFunctionHeader meta={meta} loading={metaLoading} reportTitle={title} />

      <Card mode="outlined" style={{ backgroundColor: c.card, marginBottom: 12 }}>
        <Card.Content>
          <TextInput
            {...inputTheme}
            label={t("placeName")}
            value={placeName}
            onChangeText={setPlaceName}
            mode="outlined"
            dense
            style={inputTheme.style}
          />
          <View style={styles.row}>
            <Button
              mode="contained"
              buttonColor={c.primary}
              onPress={() => {
                setPage(1);
                setTick((x) => x + 1);
              }}
            >
              {t("search")}
            </Button>
            <Button
              mode="outlined"
              onPress={() => {
                setPlaceName("");
                setPage(1);
                setTick((x) => x + 1);
              }}
            >
              {t("clearButton")}
            </Button>
          </View>
        </Card.Content>
      </Card>

      <View style={styles.actions}>
        <Button
          mode="contained-tonal"
          icon="file-pdf-box"
          onPress={() => void onExportPdf()}
          disabled={exporting}
        >
          {t("downloadPdf")}
        </Button>
        <Button
          mode="contained-tonal"
          icon="microsoft-excel"
          onPress={() => void onExportExcel()}
          disabled={exporting}
        >
          {t("exportExcel")}
        </Button>
      </View>

      {error ? <Text style={{ color: c.danger, marginBottom: 8 }}>{error}</Text> : null}
      {loading ? <ActivityIndicator style={styles.loader} color={c.primary} /> : null}

      {!loading ? (
        <Card mode="outlined" style={{ backgroundColor: c.card }}>
          <Card.Content>
            <DataTable>
              <DataTable.Header>
                <DataTable.Title>{t("sNo")}</DataTable.Title>
                <DataTable.Title>{t("placeName")}</DataTable.Title>
                <DataTable.Title numeric>{t("total")}</DataTable.Title>
              </DataTable.Header>
              {rows.length === 0 ? (
                <Text variant="bodySmall" style={{ padding: 12, color: c.textMuted }}>
                  {t("noData")}
                </Text>
              ) : (
                rows.map((item) => (
                  <DataTable.Row key={`${item.sNo}-${item.villageName}`}>
                    <DataTable.Cell>{item.sNo}</DataTable.Cell>
                    <DataTable.Cell>{item.villageName}</DataTable.Cell>
                    <DataTable.Cell numeric>{item.total}</DataTable.Cell>
                  </DataTable.Row>
                ))
              )}
              {rows.length > 0 ? (
                <DataTable.Row>
                  <DataTable.Cell>{t("total")}</DataTable.Cell>
                  <DataTable.Cell> </DataTable.Cell>
                  <DataTable.Cell numeric>{pageTotal}</DataTable.Cell>
                </DataTable.Row>
              ) : null}
            </DataTable>
          </Card.Content>
        </Card>
      ) : null}

      <View style={styles.pager}>
        <Button
          disabled={page <= 1 || loading}
          onPress={() => setPage((p) => Math.max(1, p - 1))}
        >
          {t("mobile_prev", { defaultValue: "Prev" })}
        </Button>
        <Text variant="labelLarge" style={{ color: c.text }}>
          {page} / {totalPages}
        </Text>
        <Button
          disabled={page >= totalPages || loading}
          onPress={() => setPage((p) => p + 1)}
        >
          {t("mobile_next", { defaultValue: "Next" })}
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 16, paddingBottom: 48 },
  row: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
    flexWrap: "wrap",
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginVertical: 12,
  },
  loader: { marginVertical: 16 },
  pager: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
  },
});
