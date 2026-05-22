import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { useTranslation } from "react-i18next";
import type { DashboardDetailRow } from "../../types/dashboard";
import { formatCount, formatInr } from "../../utils/formatCurrency";

type Props = {
  rows: DashboardDetailRow[];
  maxItems?: number;
};

export default function ActivityOverview({ rows, maxItems = 6 }: Props) {
  const { t } = useTranslation();
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
      <Text variant="bodyMedium" style={styles.empty}>
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
          <View style={[styles.dot, { backgroundColor: "#0984e3" }]} />
          <Text variant="labelSmall">{t("receipt")}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: "#e17055" }]} />
          <Text variant="labelSmall">{t("expenses")}</Text>
        </View>
      </View>

      {slice.map((row, idx) => (
        <View key={`${row.name}-${idx}`} style={styles.row}>
          <Text variant="titleSmall" style={styles.place} numberOfLines={1}>
            {row.name}
          </Text>
          <Text variant="labelSmall" style={styles.meta}>
            {t("totalRcdNos")}: {formatCount(row.transactionCount)} · {t("expenses")}:{" "}
            {formatCount(row.expenseCount)}
          </Text>
          <View style={styles.barTrack}>
            <View
              style={[
                styles.barReceipt,
                { width: `${((row.transactionCount ?? 0) / maxCount) * 100}%` },
              ]}
            />
          </View>
          <View style={[styles.barTrack, styles.barTrackSecond]}>
            <View
              style={[
                styles.barExpense,
                { width: `${((row.expenseCount ?? 0) / maxCount) * 100}%` },
              ]}
            />
          </View>
          <Text variant="bodySmall" style={styles.amounts}>
            {formatInr(row.transactions)} / {formatInr(row.expenses)}
          </Text>
        </View>
      ))}

      {rows.length > maxItems ? (
        <Text variant="labelSmall" style={styles.more}>
          +{rows.length - maxItems}{" "}
          {t("mobile_more_places", { defaultValue: "more locations" })}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { color: "#636e72", paddingVertical: 8 },
  legend: { flexDirection: "row", gap: 16, marginBottom: 12 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  row: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  place: { fontWeight: "600", color: "#2d3436" },
  meta: { color: "#636e72", marginTop: 2, marginBottom: 8 },
  barTrack: {
    height: 6,
    backgroundColor: "#e9ecef",
    borderRadius: 3,
    overflow: "hidden",
  },
  barTrackSecond: { marginTop: 4 },
  barReceipt: {
    height: "100%",
    backgroundColor: "#0984e3",
    borderRadius: 3,
    minWidth: 2,
  },
  barExpense: {
    height: "100%",
    backgroundColor: "#e17055",
    borderRadius: 3,
    minWidth: 2,
  },
  amounts: { color: "#636e72", marginTop: 6 },
  more: { color: "#0984e3", textAlign: "center", marginTop: 4 },
});
