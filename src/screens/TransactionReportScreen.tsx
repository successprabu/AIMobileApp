import React, { useCallback, useLayoutEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Button, Card, Text, TextInput } from "react-native-paper";
import { useTranslation } from "react-i18next";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { authGet } from "../api/client";
import { PATHS } from "../api/endpoints";
import ReportFunctionHeader from "../components/reports/ReportFunctionHeader";
import { useAuth } from "../context/AuthContext";
import { useAppTheme } from "../hooks/useAppTheme";
import { useReportFunctionMeta } from "../hooks/useReportFunctionMeta";
import { useThemedInputProps } from "../hooks/useThemedInputProps";
import type { AuthUser } from "../types/auth";
import type { MainStackParamList } from "../navigation/types";
import { shareExcel, sharePdfReport } from "../export/reportExport";

type ReportConfig = {
  transType: "R" | "E" | "O";
  reportType: string;
  titleKey: string;
  fileBase: string;
};

const CONFIG: Record<
  "IncomeReport" | "ExpensesReport" | "OthersReport",
  ReportConfig
> = {
  IncomeReport: {
    transType: "R",
    reportType: "INCOME",
    titleKey: "receiptReport",
    fileBase: "IncomeReport",
  },
  ExpensesReport: {
    transType: "E",
    reportType: "EXPENSES",
    titleKey: "expenseReport",
    fileBase: "ExpenseReport",
  },
  OthersReport: {
    transType: "O",
    reportType: "OTHERS",
    titleKey: "othersReport",
    fileBase: "OthersReport",
  },
};

type Row = Record<string, unknown>;

type PageResponse = {
  result?: boolean;
  data?: { transactions?: Row[]; totalPages?: number };
};

export default function TransactionReportScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { theme } = useAppTheme();
  const c = theme.colors;
  const inputTheme = useThemedInputProps();
  const { meta, loading: metaLoading } = useReportFunctionMeta();
  const route = useRoute();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const name = route.name as keyof typeof CONFIG;
  const cfg = CONFIG[name];

  const u = user as AuthUser;

  const [nameFilter, setNameFilter] = useState("");
  const [placeFilter, setPlaceFilter] = useState("");
  const [mobileFilter, setMobileFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const title = t(cfg.titleKey);

  useLayoutEffect(() => {
    navigation.setOptions({ title });
  }, [navigation, title]);

  const baseParams = useMemo(
    () => ({
      customer_id: u.customerID ?? 0,
      function_id: u.functionId ?? 0,
      trans_type: cfg.transType,
      report_type: cfg.reportType,
      userId: u.id ?? 0,
      customer_name: nameFilter,
      village_name: placeFilter,
      mobile: mobileFilter,
    }),
    [
      cfg.reportType,
      cfg.transType,
      mobileFilter,
      nameFilter,
      placeFilter,
      u.customerID,
      u.functionId,
      u.id,
    ]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const json = await authGet<PageResponse>(PATHS.REPORT_TRANSACTION, {
        ...baseParams,
        current_page: page,
        page_size: pageSize,
      });
      if (json.result && json.data) {
        setRows(json.data.transactions ?? []);
        setTotalPages(json.data.totalPages ?? 1);
      } else {
        setRows([]);
        setTotalPages(1);
      }
    } catch {
      setError(t("an_error_occurred"));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [baseParams, page, pageSize, t]);

  React.useEffect(() => {
    void load();
  }, [load, tick]);

  const keys = rows[0] ? Object.keys(rows[0]) : [];

  const fetchAllRows = async (): Promise<Row[]> => {
    const json = await authGet<PageResponse>(PATHS.REPORT_ALL, {
      ...baseParams,
      userId: 0,
    });
    if (json.result && json.data?.transactions) {
      return json.data.transactions;
    }
    return [];
  };

  const onExportExcel = async () => {
    setExporting(true);
    try {
      const all = await fetchAllRows();
      await shareExcel(
        all as Record<string, unknown>[],
        `${cfg.fileBase}.xlsx`,
        cfg.fileBase,
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
        `${cfg.fileBase}.pdf`,
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
    >
      <ReportFunctionHeader meta={meta} loading={metaLoading} reportTitle={title} />

      <Card style={[styles.card, { backgroundColor: c.card }]} mode="outlined">
        <Card.Content>
          <TextInput
            {...inputTheme}
            label={t("name")}
            value={nameFilter}
            onChangeText={setNameFilter}
            mode="outlined"
            dense
            style={inputTheme.style}
          />
          <TextInput
            {...inputTheme}
            style={[styles.gap, inputTheme.style]}
            label={t("village")}
            value={placeFilter}
            onChangeText={setPlaceFilter}
            mode="outlined"
            dense
          />
          <TextInput
            {...inputTheme}
            style={[styles.gap, inputTheme.style]}
            label={t("mobile")}
            value={mobileFilter}
            onChangeText={setMobileFilter}
            mode="outlined"
            dense
            keyboardType="phone-pad"
          />
          <View style={styles.row}>
            <Button
              mode="contained"
              onPress={() => {
                setPage(1);
                setTick((x) => x + 1);
              }}
            >
              {t("save")}
            </Button>
            <Button
              mode="outlined"
              onPress={() => {
                setNameFilter("");
                setPlaceFilter("");
                setMobileFilter("");
                setPage(1);
                setTick((x) => x + 1);
              }}
            >
              {t("cancel")}
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

      {error ? <Text style={styles.err}>{error}</Text> : null}
      {loading ? <ActivityIndicator style={styles.loader} /> : null}

      {!loading && keys.length > 0 ? (
        <ScrollView horizontal>
          <View>
            <View style={styles.tableRow}>
              {keys.map((k) => (
                <Text key={k} style={styles.cellHead}>
                  {k}
                </Text>
              ))}
            </View>
            <FlatList
              data={rows}
              keyExtractor={(_, i) => String(i)}
              scrollEnabled={false}
              renderItem={({ item, index }) => (
                <View
                  style={[styles.tableRow, index % 2 ? styles.striped : null]}
                >
                  {keys.map((k) => (
                    <Text key={k} style={styles.cell}>
                      {String(item[k] ?? "")}
                    </Text>
                  ))}
                </View>
              )}
            />
          </View>
        </ScrollView>
      ) : null}

      {!loading && rows.length === 0 ? (
        <Text variant="bodyMedium">
          {t("mobile_no_rows", { defaultValue: "No rows for this page." })}
        </Text>
      ) : null}

      <View style={styles.pager}>
        <Button
          disabled={page <= 1 || loading}
          onPress={() => setPage((p) => Math.max(1, p - 1))}
        >
          Prev
        </Button>
        <Text variant="labelLarge">
          {page} / {totalPages}
        </Text>
        <Button
          disabled={page >= totalPages || loading}
          onPress={() => setPage((p) => p + 1)}
        >
          Next
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 16, paddingBottom: 48 },
  card: { marginBottom: 12 },
  gap: { marginTop: 8 },
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
  err: { color: "#c62828", marginBottom: 8 },
  loader: { marginVertical: 16 },
  tableRow: { flexDirection: "row", borderBottomWidth: StyleSheet.hairlineWidth },
  striped: { backgroundColor: "#f5f5f5" },
  cellHead: {
    width: 100,
    padding: 6,
    fontWeight: "700",
    backgroundColor: "#e3f2fd",
  },
  cell: { width: 100, padding: 6, fontSize: 11 },
  pager: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
  },
});
