import type { MainStackParamList } from "../navigation/types";
import { PRIMARY_PINK, PRIMARY_PINK_DARK } from "../theme/themes";

export type ContextualNavLink = {
  screen: keyof MainStackParamList;
  titleKey: string;
  icon: string;
  /** Accent for icon-only footer chip (matches drawer menu colors). */
  color: string;
};

/** Icon tint per destination screen (shared by footer links). */
export const FOOTER_SCREEN_COLORS: Partial<Record<keyof MainStackParamList, string>> = {
  Dashboard: PRIMARY_PINK,
  Transaction: "#00b894",
  TransactionList: PRIMARY_PINK_DARK,
  AddExpenses: "#e17055",
  ExpensesList: "#d63031",
  Others: "#00cec9",
  OthersList: "#81ecec",
  Handover: "#f39c12",
  IncomeReport: PRIMARY_PINK,
  ExpensesReport: "#e17055",
  OthersReport: "#00b894",
  RegionalReport: "#6c5ce7",
  SummaryReport: "#a29bfe",
  FunctionMaster: "#576574",
  UserMaster: "#2d3436",
};

function link(
  screen: keyof MainStackParamList,
  titleKey: string,
  icon: string
): ContextualNavLink {
  return {
    screen,
    titleKey,
    icon,
    color: FOOTER_SCREEN_COLORS[screen] ?? PRIMARY_PINK,
  };
}

/** Footer shortcuts per screen (mirrors web header sub-links). */
export const CONTEXTUAL_FOOTER_LINKS: Partial<
  Record<keyof MainStackParamList, ContextualNavLink[]>
> = {
  Dashboard: [
    link("Transaction", "addTransaction", "cash-plus"),
    link("TransactionList", "transactionList", "clipboard-text-outline"),
  ],
  Transaction: [
    link("Dashboard", "dashboard", "view-dashboard-variant"),
    link("TransactionList", "transactionList", "clipboard-text-outline"),
  ],
  TransactionList: [
    link("Dashboard", "dashboard", "view-dashboard-variant"),
    link("Transaction", "addTransaction", "cash-plus"),
  ],
  AddExpenses: [
    link("Dashboard", "dashboard", "view-dashboard-variant"),
    link("ExpensesList", "expensesList", "format-list-bulleted"),
  ],
  ExpensesList: [
    link("Dashboard", "dashboard", "view-dashboard-variant"),
    link("AddExpenses", "addExpenses", "cash-minus"),
  ],
  Others: [
    link("Dashboard", "dashboard", "view-dashboard-variant"),
    link("OthersList", "othersList", "playlist-plus"),
  ],
  OthersList: [
    link("Dashboard", "dashboard", "view-dashboard-variant"),
    link("Others", "addOthers", "gift-outline"),
  ],
  Handover: [
    link("Dashboard", "dashboard", "view-dashboard-variant"),
    link("TransactionList", "transactionList", "clipboard-text-outline"),
  ],
  IncomeReport: [
    link("Dashboard", "dashboard", "view-dashboard-variant"),
    link("TransactionList", "transactionList", "clipboard-text-outline"),
  ],
  ExpensesReport: [
    link("Dashboard", "dashboard", "view-dashboard-variant"),
    link("ExpensesList", "expensesList", "format-list-bulleted"),
  ],
  OthersReport: [
    link("Dashboard", "dashboard", "view-dashboard-variant"),
    link("OthersList", "othersList", "playlist-plus"),
  ],
  RegionalReport: [
    link("Dashboard", "dashboard", "view-dashboard-variant"),
    link("SummaryReport", "summaryReport", "chart-pie"),
  ],
  SummaryReport: [
    link("Dashboard", "dashboard", "view-dashboard-variant"),
    link("RegionalReport", "locationAmountReport", "map-marker-radius"),
  ],
  FunctionMaster: [
    link("Dashboard", "dashboard", "view-dashboard-variant"),
    link("UserMaster", "userMaster", "account-cog"),
  ],
  UserMaster: [
    link("Dashboard", "dashboard", "view-dashboard-variant"),
    link("FunctionMaster", "functionMaster", "tune-variant"),
  ],
};

/** Icon-only bar (labels via accessibility). */
export const FOOTER_BAR_HEIGHT = 64;

export const FOOTER_RAINBOW_STRIP = [
  PRIMARY_PINK,
  "#00b894",
  "#6c5ce7",
  "#fdcb6e",
  "#e17055",
  "#00cec9",
] as const;
