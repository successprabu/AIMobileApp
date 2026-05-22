import type { MainStackParamList } from "../navigation/types";
import { PRIMARY_PINK, PRIMARY_PINK_DARK } from "../theme/themes";

export type QuickAction = {
  screen: keyof MainStackParamList;
  titleKey: string;
  icon: string;
  color: string;
  roles: string[];
};

export const DASHBOARD_QUICK_ACTIONS: QuickAction[] = [
  {
    screen: "Transaction",
    titleKey: "addTransaction",
    icon: "cash-plus",
    color: PRIMARY_PINK,
    roles: ["SU", "AU", "NU"],
  },
  {
    screen: "TransactionList",
    titleKey: "transactionList",
    icon: "clipboard-text-outline",
    color: "#6c5ce7",
    roles: ["SU", "AU", "NU"],
  },
  {
    screen: "AddExpenses",
    titleKey: "addExpenses",
    icon: "cash-minus",
    color: "#e17055",
    roles: ["SU", "AU", "NU"],
  },
  {
    screen: "ExpensesList",
    titleKey: "expensesList",
    icon: "format-list-bulleted",
    color: "#d63031",
    roles: ["SU", "AU", "NU"],
  },
  {
    screen: "Others",
    titleKey: "addOthers",
    icon: "gift-outline",
    color: "#00b894",
    roles: ["SU", "AU", "NU"],
  },
  {
    screen: "OthersList",
    titleKey: "othersList",
    icon: "playlist-plus",
    color: "#00cec9",
    roles: ["SU", "AU", "NU"],
  },
  {
    screen: "Handover",
    titleKey: "handOver",
    icon: "handshake",
    color: "#fdcb6e",
    roles: ["SU", "AU", "NU"],
  },
  {
    screen: "SummaryReport",
    titleKey: "summaryReport",
    icon: "chart-pie",
    color: "#a29bfe",
    roles: ["SU", "AU"],
  },
  {
    screen: "IncomeReport",
    titleKey: "receiptReport",
    icon: "chart-line",
    color: "#74b9ff",
    roles: ["SU", "AU"],
  },
  {
    screen: "FunctionMaster",
    titleKey: "functionMaster",
    icon: "tune-variant",
    color: "#636e72",
    roles: ["SU", "AU"],
  },
  {
    screen: "UserMaster",
    titleKey: "userMaster",
    icon: "account-cog",
    color: "#2d3436",
    roles: ["SU", "AU"],
  },
  {
    screen: "ClientList",
    titleKey: "Clients",
    icon: "account-group",
    color: PRIMARY_PINK,
    roles: ["SU"],
  },
  {
    screen: "MahalBooking",
    titleKey: "mahalBooking",
    icon: "calendar-month",
    color: "#6c5ce7",
    roles: ["MU"],
  },
  {
    screen: "MahalBookingList",
    titleKey: "mahalBookingList",
    icon: "calendar-check",
    color: PRIMARY_PINK,
    roles: ["MU"],
  },
  {
    screen: "AddMoitechCustomer",
    titleKey: "addMoiTechCustomer",
    icon: "account-heart",
    color: "#00b894",
    roles: ["MU"],
  },
];
