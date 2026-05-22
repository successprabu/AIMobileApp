import React from "react";
import { Text } from "react-native-paper";
import { useTranslation } from "react-i18next";
import ExpensesEditModal from "../components/ExpensesEditModal";
import TransactionListView from "../components/TransactionListView";
import type { TransactionRecord } from "../types/transaction";

export default function ExpensesListScreen() {
  const { t } = useTranslation();

  return (
    <TransactionListView
      transType="E"
      titleKey="expensesList"
      savedMessageKey="expensesSaved"
      EditModal={ExpensesEditModal}
      renderRowBody={(item: TransactionRecord) => (
        <>
          <Text variant="titleSmall">
            {t("expensesCategory")}: {item.villageName}
          </Text>
          <Text variant="bodyMedium">
            {t("expensesDescription")}: {item.name}
          </Text>
          <Text variant="bodyMedium">
            {t("amount")}: {item.amount}
          </Text>
        </>
      )}
    />
  );
}
