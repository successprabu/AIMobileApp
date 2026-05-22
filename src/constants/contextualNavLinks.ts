import type { MainStackParamList } from "../navigation/types";

export type ContextualNavLink = {
  screen: keyof MainStackParamList;
  titleKey: string;
  /** Short footer label (i18n key). */
  shortKey: string;
  icon: string;
};

function link(
  screen: keyof MainStackParamList,
  titleKey: string,
  shortKey: string,
  icon: string
): ContextualNavLink {
  return { screen, titleKey, shortKey, icon };
}

/** Footer shortcuts per screen (mirrors web header sub-links). */
export const CONTEXTUAL_FOOTER_LINKS: Partial<
  Record<keyof MainStackParamList, ContextualNavLink[]>
> = {
  Dashboard: [
    link("Transaction", "addTransaction", "footer_short_receipt", "cash-plus"),
    link("TransactionList", "transactionList", "footer_short_list", "clipboard-text-outline"),
  ],
  Transaction: [
    link("Dashboard", "dashboard", "footer_short_home", "view-dashboard-variant"),
    link("TransactionList", "transactionList", "footer_short_list", "clipboard-text-outline"),
  ],
  TransactionList: [
    link("Dashboard", "dashboard", "footer_short_home", "view-dashboard-variant"),
    link("Transaction", "addTransaction", "footer_short_receipt", "cash-plus"),
  ],
  AddExpenses: [
    link("Dashboard", "dashboard", "footer_short_home", "view-dashboard-variant"),
    link("ExpensesList", "expensesList", "footer_short_list", "format-list-bulleted"),
  ],
  ExpensesList: [
    link("Dashboard", "dashboard", "footer_short_home", "view-dashboard-variant"),
    link("AddExpenses", "addExpenses", "footer_short_expense", "cash-minus"),
  ],
  Others: [
    link("Dashboard", "dashboard", "footer_short_home", "view-dashboard-variant"),
    link("OthersList", "othersList", "footer_short_list", "playlist-plus"),
  ],
  OthersList: [
    link("Dashboard", "dashboard", "footer_short_home", "view-dashboard-variant"),
    link("Others", "addOthers", "footer_short_others", "gift-outline"),
  ],
  Handover: [
    link("Dashboard", "dashboard", "footer_short_home", "view-dashboard-variant"),
    link("TransactionList", "transactionList", "footer_short_list", "clipboard-text-outline"),
  ],
  IncomeReport: [
    link("Dashboard", "dashboard", "footer_short_home", "view-dashboard-variant"),
    link("TransactionList", "transactionList", "footer_short_list", "clipboard-text-outline"),
  ],
  ExpensesReport: [
    link("Dashboard", "dashboard", "footer_short_home", "view-dashboard-variant"),
    link("ExpensesList", "expensesList", "footer_short_list", "format-list-bulleted"),
  ],
  OthersReport: [
    link("Dashboard", "dashboard", "footer_short_home", "view-dashboard-variant"),
    link("OthersList", "othersList", "footer_short_list", "playlist-plus"),
  ],
  RegionalReport: [
    link("Dashboard", "dashboard", "footer_short_home", "view-dashboard-variant"),
    link("SummaryReport", "summaryReport", "footer_short_summary", "chart-pie"),
  ],
  SummaryReport: [
    link("Dashboard", "dashboard", "footer_short_home", "view-dashboard-variant"),
    link("RegionalReport", "locationAmountReport", "footer_short_regional", "map-marker-radius"),
  ],
  FunctionMaster: [
    link("Dashboard", "dashboard", "footer_short_home", "view-dashboard-variant"),
    link("UserMaster", "userMaster", "footer_short_users", "account-cog"),
  ],
  UserMaster: [
    link("Dashboard", "dashboard", "footer_short_home", "view-dashboard-variant"),
    link("FunctionMaster", "functionMaster", "footer_short_function", "tune-variant"),
  ],
};

export const FOOTER_BAR_HEIGHT = 56;
