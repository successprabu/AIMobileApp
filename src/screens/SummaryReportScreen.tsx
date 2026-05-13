import React, { useLayoutEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import { Button, Card, Text } from "react-native-paper";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as XLSX from "xlsx";
import { authGet } from "../api/client";
import { PATHS } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import type { AuthUser } from "../types/auth";
import type { MainStackParamList } from "../navigation/types";
import { rowsToHtmlTable } from "../export/reportExport";

type Row = Record<string, unknown>;

export default function SummaryReportScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const u = user as AuthUser;

  const title = t("summaryReport");
  useLayoutEffect(() => {
    navigation.setOptions({ title });
  }, [navigation, title]);

  const [overall, setOverall] = useState<Row[]>([]);
  const [others, setOthers] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [o, ot] = await Promise.all([
          authGet<{ result?: boolean; data?: Row[] }>(PATHS.REPORT_OVERALL, {
            customer_id: u.customerID ?? 0,
            function_id: u.functionId ?? 0,
          }),
          authGet<{ result?: boolean; data?: Row[] }>(PATHS.REPORT_OTHERS_SUMMARY, {
            customer_id: u.customerID ?? 0,
            function_id: u.functionId ?? 0,
          }),
        ]);
        if (cancelled) return;
        setOverall(o.result && o.data ? o.data : []);
        setOthers(ot.result && ot.data ? ot.data : []);
      } catch {
        if (!cancelled) setError(t("an_error_occurred"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t, u.customerID, u.functionId]);

  const exportExcel = async () => {
    setExporting(true);
    try {
      const wb = XLSX.utils.book_new();
      const ws1 = XLSX.utils.json_to_sheet(
        overall.length ? overall : [{ note: "No data" }]
      );
      const ws2 = XLSX.utils.json_to_sheet(
        others.length ? others : [{ note: "No data" }]
      );
      XLSX.utils.book_append_sheet(wb, ws1, "Overall");
      XLSX.utils.book_append_sheet(wb, ws2, "Others");
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
      const h1 = rowsToHtmlTable(
        overall as Record<string, unknown>[],
        `${title} — Overall`
      );
      const h2 = rowsToHtmlTable(
        others as Record<string, unknown>[],
        `${title} — Others`
      );
      const body1 = h1
        .replace(/^[\s\S]*<body[^>]*>/i, "")
        .replace(/<\/body>[\s\S]*$/i, "");
      const body2 = h2
        .replace(/^[\s\S]*<body[^>]*>/i, "")
        .replace(/<\/body>[\s\S]*$/i, "");
      const combined = `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>body{font-family:system-ui,sans-serif;padding:12px}</style></head><body>${body1}<div style="height:20px"/><hr/>${body2}</body></html>`;

      const { uri } = await Print.printToFileAsync({ html: combined });
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: "SummaryReport.pdf",
        UTI: "com.adobe.pdf",
      });
    } finally {
      setExporting(false);
    }
  };

  const preview = (label: string, rows: Row[]) => (
    <Card style={styles.card} mode="outlined">
      <Card.Title title={label} />
      <Card.Content>
        {rows.length === 0 ? (
          <Text variant="bodySmall">
            {t("mobile_no_rows", { defaultValue: "No rows." })}
          </Text>
        ) : (
          <Text variant="bodySmall" selectable>
            {JSON.stringify(rows.slice(0, 3), null, 2)}
            {rows.length > 3 ? "\n…" : ""}
          </Text>
        )}
      </Card.Content>
    </Card>
  );

  return (
    <ScrollView contentContainerStyle={styles.pad}>
      <View style={styles.actions}>
        <Button
          mode="contained-tonal"
          icon="file-pdf-box"
          onPress={() => void exportPdf()}
          disabled={exporting || loading}
        >
          {t("downloadPdf")}
        </Button>
        <Button
          mode="contained-tonal"
          icon="microsoft-excel"
          onPress={() => void exportExcel()}
          disabled={exporting || loading}
        >
          {t("exportExcel")}
        </Button>
      </View>
      {error ? <Text style={styles.err}>{error}</Text> : null}
      {loading ? <ActivityIndicator style={styles.loader} /> : null}
      {!loading ? preview(t("summaryReport"), overall) : null}
      {!loading ? preview(t("othersReport"), others) : null}
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
  err: { color: "#c62828", marginBottom: 8 },
  loader: { marginVertical: 16 },
  card: { marginBottom: 12 },
});
