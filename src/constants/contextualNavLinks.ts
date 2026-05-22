import type { MainStackParamList } from "../navigation/types";

export type ContextualNavLink = {
  screen: keyof MainStackParamList;
  titleKey: string;
  icon: string;
};

/** Footer shortcuts per screen (mirrors web header sub-links). */
export const CONTEXTUAL_FOOTER_LINKS: Partial<
  Record<keyof MainStackParamList, ContextualNavLink[]>
> = {
  Dashboard: [
    { screen: "Transaction", titleKey: "addTransaction", icon: "cash-plus" },
    { screen: "TransactionList", titleKey: "transactionList", icon: "clipboard-text-outline" },
  ],
  Transaction: [
    { screen: "Dashboard", titleKey: "dashboard", icon: "view-dashboard-variant" },
    { screen: "TransactionList", titleKey: "transactionList", icon: "clipboard-text-outline" },
  ],
  TransactionList: [
    { screen: "Dashboard", titleKey: "dashboard", icon: "view-dashboard-variant" },
    { screen: "Transaction", titleKey: "addTransaction", icon: "cash-plus" },
  ],
  AddExpenses: [
    { screen: "Dashboard", titleKey: "dashboard", icon: "view-dashboard-variant" },
    { screen: "ExpensesList", titleKey: "expensesList", icon: "format-list-bulleted" },
  ],
  ExpensesList: [
    { screen: "Dashboard", titleKey: "dashboard", icon: "view-dashboard-variant" },
    { screen: "AddExpenses", titleKey: "addExpenses", icon: "cash-minus" },
  ],
  Others: [
    { screen: "Dashboard", titleKey: "dashboard", icon: "view-dashboard-variant" },
    { screen: "OthersList", titleKey: "othersList", icon: "playlist-plus" },
  ],
  OthersList: [
    { screen: "Dashboard", titleKey: "dashboard", icon: "view-dashboard-variant" },
    { screen: "Others", titleKey: "addOthers", icon: "gift-outline" },
  ],
  Handover: [
    { screen: "Dashboard", titleKey: "dashboard", icon: "view-dashboard-variant" },
    { screen: "TransactionList", titleKey: "transactionList", icon: "clipboard-text-outline" },
  ],
  IncomeReport: [
    { screen: "Dashboard", titleKey: "dashboard", icon: "view-dashboard-variant" },
    { screen: "TransactionList", titleKey: "transactionList", icon: "clipboard-text-outline" },
  ],
  ExpensesReport: [
    { screen: "Dashboard", titleKey: "dashboard", icon: "view-dashboard-variant" },
    { screen: "ExpensesList", titleKey: "expensesList", icon: "format-list-bulleted" },
  ],
  OthersReport: [
    { screen: "Dashboard", titleKey: "dashboard", icon: "view-dashboard-variant" },
    { screen: "OthersList", titleKey: "othersList", icon: "playlist-plus" },
  ],
  RegionalReport: [
    { screen: "Dashboard", titleKey: "dashboard", icon: "view-dashboard-variant" },
    { screen: "SummaryReport", titleKey: "summaryReport", icon: "chart-pie" },
  ],
  SummaryReport: [
    { screen: "Dashboard", titleKey: "dashboard", icon: "view-dashboard-variant" },
    { screen: "RegionalReport", titleKey: "locationAmountReport", icon: "map-marker-radius" },
  ],
  FunctionMaster: [
    { screen: "Dashboard", titleKey: "dashboard", icon: "view-dashboard-variant" },
    { screen: "UserMaster", titleKey: "userMaster", icon: "account-cog" },
  ],
  UserMaster: [
    { screen: "Dashboard", titleKey: "dashboard", icon: "view-dashboard-variant" },
    { screen: "FunctionMaster", titleKey: "functionMaster", icon: "tune-variant" },
  ],
};

export const FOOTER_BAR_HEIGHT = 52;
