import React from "react";
import { Text } from "react-native-paper";
import { useTranslation } from "react-i18next";
import OthersEditModal from "../components/OthersEditModal";
import TransactionListView from "../components/TransactionListView";
import type { TransactionRecord } from "../types/transaction";

export default function OthersListScreen() {
  const { t } = useTranslation();

  const translateType = (key: string | undefined) => {
    if (!key) return "—";
    const label = t(key);
    return label === key ? key : label;
  };

  return (
    <TransactionListView
      transType="O"
      titleKey="othersList"
      savedMessageKey="othersSaved"
      withUserScope
      EditModal={OthersEditModal}
      renderRowBody={(item: TransactionRecord) => (
        <>
          <Text variant="titleSmall">
            {item.name}
            {item.initial ? ` (${item.initial})` : ""}
          </Text>
          <Text variant="bodyMedium">
            {t("placeName")}: {item.villageName}
          </Text>
          <Text variant="bodyMedium">
            {t("others")}: {item.others ?? 0} · {t("othersType")}:{" "}
            {translateType(item.othersType)}
          </Text>
          <Text variant="bodySmall">
            {t("othersRemarks")}: {item.othersRemark || "—"}
          </Text>
          <Text variant="bodyMedium">
            {t("amount")}: {item.amount}
          </Text>
        </>
      )}
    />
  );
}
