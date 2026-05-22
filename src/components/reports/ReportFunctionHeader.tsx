import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Card, Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useAppTheme } from "../../hooks/useAppTheme";
import type { ReportFunctionMeta } from "../../types/report";

type Props = {
  meta: ReportFunctionMeta | null;
  loading?: boolean;
  reportTitle?: string;
};

export default function ReportFunctionHeader({ meta, loading, reportTitle }: Props) {
  const { t } = useTranslation();
  const { theme } = useAppTheme();
  const c = theme.colors;
  const styles = useMemo(() => makeStyles(c), [c]);

  if (loading) {
    return (
      <Card style={[styles.card, { backgroundColor: c.card }]} mode="elevated">
        <Card.Content>
          <Text variant="bodySmall" style={{ color: c.textMuted }}>
            {t("mobile_loading_function", { defaultValue: "Loading function details…" })}
          </Text>
        </Card.Content>
      </Card>
    );
  }

  if (!meta) return null;

  const rows: { label: string; value: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }[] = [
    { label: t("functionName"), value: meta.functionName, icon: "party-popper" },
    { label: t("functionDate"), value: meta.functionDate, icon: "calendar" },
    { label: t("mahalName"), value: meta.mahalName, icon: "home-group" },
    { label: t("funPersionNames"), value: meta.funPersionNames, icon: "account-heart" },
  ];

  return (
    <Card style={[styles.card, { backgroundColor: c.card, borderColor: c.primary }]} mode="elevated">
      <Card.Content>
        {reportTitle ? (
          <Text variant="titleMedium" style={[styles.reportTitle, { color: c.primary }]}>
            {reportTitle}
          </Text>
        ) : null}
        <Text variant="labelSmall" style={[styles.note, { color: c.textMuted }]}>
          {t("mobile_report_function_note", {
            defaultValue: "Notebook reference — print or save with this function details on each report.",
          })}
        </Text>
        {rows.map((row) => (
          <View key={row.label} style={styles.row}>
            <MaterialCommunityIcons name={row.icon} size={18} color={c.primary} />
            <Text variant="labelMedium" style={[styles.label, { color: c.textMuted }]}>
              {row.label}
            </Text>
            <Text variant="bodyMedium" style={[styles.value, { color: c.text }]} numberOfLines={3}>
              {row.value}
            </Text>
          </View>
        ))}
        {meta.reportDate ? (
          <Text variant="bodySmall" style={{ color: c.textMuted, marginTop: 6 }}>
            {t("mobile_report_generated", { defaultValue: "Report date" })}: {meta.reportDate}
            {meta.generatedBy ? ` · ${meta.generatedBy}` : ""}
          </Text>
        ) : null}
      </Card.Content>
    </Card>
  );
}

function makeStyles(c: ReturnType<typeof useAppTheme>["theme"]["colors"]) {
  return StyleSheet.create({
    card: {
      marginBottom: 12,
      borderWidth: 1,
      borderRadius: 14,
    },
    reportTitle: { fontWeight: "800", marginBottom: 6 },
    note: { marginBottom: 10, lineHeight: 18 },
    row: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
      marginBottom: 8,
    },
    label: { width: 118, fontWeight: "600" },
    value: { flex: 1, fontWeight: "700" },
  });
}
