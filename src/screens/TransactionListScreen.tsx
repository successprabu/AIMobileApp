import React from "react";
import { Text } from "react-native-paper";
import { useTranslation } from "react-i18next";
import TransactionEditModal from "../components/TransactionEditModal";
import TransactionListView from "../components/TransactionListView";
import type { TransactionRecord } from "../types/transaction";

export default function TransactionListScreen() {
  const { t } = useTranslation();

  return (
    <TransactionListView
      transType="R"
      titleKey="transactionList"
      savedMessageKey="transactionSaved"
      EditModal={TransactionEditModal}
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
            {t("oldAmount")}: {item.oldAmount} · {t("newAmount")}: {item.newAmount} · {t("amount")}:{" "}
            {item.amount}
          </Text>
        </>
      )}
    />
  );
}
