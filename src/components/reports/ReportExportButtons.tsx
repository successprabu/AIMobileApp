import React, { useRef } from "react";
import { StyleSheet, View } from "react-native";
import { Button } from "react-native-paper";
import { useTranslation } from "react-i18next";

const PDF_RED = "#c62828";
const EXCEL_GREEN = "#2e7d32";

type Props = {
  onExportPdf: () => Promise<void>;
  onExportExcel: () => Promise<void>;
  pdfBusy?: boolean;
  excelBusy?: boolean;
};

/** Separate PDF / Excel actions — red PDF, green Excel; mutex prevents double share. */
export default function ReportExportButtons({
  onExportPdf,
  onExportExcel,
  pdfBusy = false,
  excelBusy = false,
}: Props) {
  const { t } = useTranslation();
  const lock = useRef(false);

  const run = async (kind: "pdf" | "excel", fn: () => Promise<void>) => {
    if (lock.current || pdfBusy || excelBusy) return;
    lock.current = true;
    try {
      await fn();
    } finally {
      lock.current = false;
    }
  };

  return (
    <View style={styles.row}>
      <Button
        mode="contained"
        icon="file-pdf-box"
        buttonColor={PDF_RED}
        textColor="#fff"
        onPress={() => void run("pdf", onExportPdf)}
        loading={pdfBusy}
        disabled={pdfBusy || excelBusy}
        style={styles.btn}
        contentStyle={styles.btnContent}
        labelStyle={styles.label}
      >
        {t("downloadPdf")}
      </Button>
      <Button
        mode="contained"
        icon="microsoft-excel"
        buttonColor={EXCEL_GREEN}
        textColor="#fff"
        onPress={() => void run("excel", onExportExcel)}
        loading={excelBusy}
        disabled={pdfBusy || excelBusy}
        style={styles.btn}
        contentStyle={styles.btnContent}
        labelStyle={styles.label}
      >
        {t("exportExcel")}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginVertical: 12,
  },
  btn: {
    minWidth: 148,
    borderRadius: 10,
  },
  btnContent: {
    paddingVertical: 4,
  },
  label: {
    fontWeight: "700",
    fontSize: 13,
  },
});
