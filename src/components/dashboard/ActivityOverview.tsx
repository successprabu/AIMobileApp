import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { useTranslation } from "react-i18next";
import { useAppTheme } from "../../hooks/useAppTheme";
import { PRIMARY_PINK } from "../../theme/themes";
import type { DashboardDetailRow } from "../../types/dashboard";
import { formatCount, formatInr } from "../../utils/formatCurrency";

type Props = {
  rows: DashboardDetailRow[];
  maxItems?: number;
};

export default function ActivityOverview({ rows, maxItems = 6 }: Props) {
  const { t } = useTranslation();
  const { theme } = useAppTheme();
  const c = theme.colors;
  const styles = useMemo(() => makeStyles(c), [c]);
  const slice = rows.slice(0, maxItems);

  const maxCount = useMemo(() => {
    let m = 1;
    for (const r of slice) {
      m = Math.max(m, r.transactionCount ?? 0, r.expenseCount ?? 0);
    }
    return m;
  }, [slice]);

  if (slice.length === 0) {
    return (
      <Text variant="bodyMedium" style={[styles.empty, { color: c.textMuted }]}>
        {t("mobile_no_dashboard_activity", {
          defaultValue: "No activity breakdown for this period.",
        })}
      </Text>
    );
  }

  return (
    <View>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: PRIMARY_PINK }]} />
          <Text variant="labelSmall" style={{ color: c.text }}>{t("receipt")}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: c.danger }]} />
          <Text variant="labelSmall" style={{ color: c.text }}>{t("expenses")}</Text>
        </View>
      </View>

      {slice.map((row, idx) => (
        <View key={`${row.name}-${idx}`} style={[styles.row, { backgroundColor: c.surfaceElevated }]}>
          <Text variant="titleSmall" style={[styles.place, { color: c.text }]} numberOfLines={1}>
            {row.name}
          </Text>
          <Text variant="labelSmall" style={[styles.meta, { color: c.textMuted }]}>
            {t("totalRcdNos")}: {formatCount(row.transactionCount)} · {t("expenses")}:{" "}
            {formatCount(row.expenseCount)}
          </Text>
          <View style={[styles.barTrack, { backgroundColor: c.border }]}>
            <View
              style={[
                styles.barReceipt,
                { width: `${((row.transactionCount ?? 0) / maxCount) * 100}%`, backgroundColor: c.primary },
              ]}
            />
          </View>
          <View style={[styles.barTrack, styles.barTrackSecond, { backgroundColor: c.border }]}>
            <View
              style={[
                styles.barExpense,
                { width: `${((row.expenseCount ?? 0) / maxCount) * 100}%`, backgroundColor: c.danger },
              ]}
            />
          </View>
          <Text variant="bodySmall" style={[styles.amounts, { color: c.textMuted }]}>
            {formatInr(row.transactions)} / {formatInr(row.expenses)}
          </Text>
        </View>
      ))}

      {rows.length > maxItems ? (
        <Text variant="labelSmall" style={[styles.more, { color: c.primary }]}>
          +{rows.length - maxItems}{" "}
          {t("mobile_more_places", { defaultValue: "more locations" })}
        </Text>
      ) : null}
    </View>
  );
}

function makeStyles(c: ReturnType<typeof useAppTheme>["theme"]["colors"]) {
  return StyleSheet.create({
    empty: { paddingVertical: 8 },
    legend: { flexDirection: "row", gap: 16, marginBottom: 12 },
    legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
    dot: { width: 10, height: 10, borderRadius: 5 },
    row: {
      borderRadius: 12,
      padding: 12,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: c.border,
    },
    place: { fontWeight: "600" },
    meta: { marginTop: 2, marginBottom: 8 },
    barTrack: {
      height: 6,
      borderRadius: 3,
      overflow: "hidden",
    },
    barTrackSecond: { marginTop: 4 },
    barReceipt: {
      height: "100%",
      borderRadius: 3,
      minWidth: 2,
    },
    barExpense: {
      height: "100%",
      borderRadius: 3,
      minWidth: 2,
    },
    amounts: { marginTop: 6 },
    more: { textAlign: "center", marginTop: 4 },
  });
}
