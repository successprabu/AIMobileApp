import type { MainStackParamList } from "../navigation/types";
import { PRIMARY_PINK } from "../theme/themes";

export type MenuLeaf = {
  screen: keyof MainStackParamList;
  titleKey: string;
  roles: string[];
};

const ALL = ["SU", "AU", "NU", "MU", "MS"];
const MOI = ["SU", "AU", "NU"];

/** Grouped like the website: what you do every day first, then reports, setup and more. */
export const APP_MENU: { key: string; titleKey: string; accent: string; items: MenuLeaf[] }[] = [
  {
    key: "home",
    titleKey: "home",
    accent: PRIMARY_PINK,
    items: [{ screen: "Dashboard", titleKey: "dashboard", roles: ALL }],
  },
  {
    key: "admin",
    titleKey: "Super admin",
    accent: "#6c5ce7",
    items: [
      { screen: "ClientList", titleKey: "Clients", roles: ["SU"] },
      { screen: "RegisterClient", titleKey: "registerClient", roles: ["SU"] },
      { screen: "Enquiries", titleKey: "enquiries", roles: ["SU"] },
    ],
  },
  {
    key: "mahal",
    titleKey: "Mahal",
    accent: "#7f1d1d",
    items: [
      { screen: "MahalBookings", titleKey: "mahalBookings", roles: ["SU", "MU", "MS"] },
      { screen: "FollowUps", titleKey: "followUps", roles: ["SU", "MU"] },
      { screen: "MyMahals", titleKey: "myMahals", roles: ["SU", "MU"] },
      { screen: "MahalExpenses", titleKey: "mahalExpenses", roles: ["MU"] },
      { screen: "MahalExpenses", titleKey: "mahalExpensesStaff", roles: ["MS"] },
      { screen: "MahalVendors", titleKey: "mahalVendors", roles: ["MU"] },
      { screen: "MahalStaff", titleKey: "mahalStaff", roles: ["MU"] },
      { screen: "MahalReviews", titleKey: "mahalReviews", roles: ["MU", "MS"] },
      { screen: "MahalReports", titleKey: "mahalReports", roles: ["MU"] },
      { screen: "AddMoitechCustomer", titleKey: "addMoiTechCustomer", roles: ["MU"] },
    ],
  },
  {
    key: "transactions",
    titleKey: "Moi entries",
    accent: "#00b894",
    items: [
      { screen: "Transaction", titleKey: "addTransaction", roles: MOI },
      { screen: "TransactionList", titleKey: "transactionList", roles: MOI },
      { screen: "GuestEntries", titleKey: "guestEntries", roles: MOI },
      { screen: "AddExpenses", titleKey: "addExpenses", roles: MOI },
      { screen: "ExpensesList", titleKey: "expensesList", roles: MOI },
      { screen: "Others", titleKey: "addOthers", roles: MOI },
      { screen: "OthersList", titleKey: "othersList", roles: MOI },
      { screen: "Handover", titleKey: "handOver", roles: MOI },
    ],
  },
  {
    key: "family",
    titleKey: "Family tools",
    accent: "#db2777",
    items: [
      { screen: "ThankGivers", titleKey: "thankGivers", roles: MOI },
      { screen: "Invitations", titleKey: "invitations", roles: MOI },
      { screen: "MoiBook", titleKey: "moiBook", roles: MOI },
      { screen: "MoiFamily", titleKey: "familyLiveLink", roles: MOI },
      { screen: "MoiGiven", titleKey: "moiGiven", roles: ["SU", "AU"] },
      { screen: "MoiReturn", titleKey: "moiReturn", roles: ["SU", "AU"] },
      { screen: "OldNotebooks", titleKey: "oldNotebooks", roles: ["SU", "AU"] },
      { screen: "History", titleKey: "history", roles: ["SU", "AU"] },
    ],
  },
  {
    key: "reports",
    titleKey: "Reports",
    accent: "#6c5ce7",
    items: [
      { screen: "IncomeReport", titleKey: "receiptReport", roles: ["SU", "AU"] },
      { screen: "ExpensesReport", titleKey: "expenseReport", roles: ["SU", "AU"] },
      { screen: "OthersReport", titleKey: "othersReport", roles: ["SU", "AU"] },
      { screen: "RegionalReport", titleKey: "locationAmountReport", roles: ["SU", "AU"] },
      { screen: "SummaryReport", titleKey: "summaryReport", roles: ["SU", "AU"] },
    ],
  },
  {
    key: "masters",
    titleKey: "Setup",
    accent: "#636e72",
    items: [
      { screen: "FunctionMaster", titleKey: "functionMaster", roles: ["SU", "AU"] },
      { screen: "UserMaster", titleKey: "userMaster", roles: ["SU", "AU"] },
    ],
  },
  {
    key: "more",
    titleKey: "mobile_more",
    accent: "#74b9ff",
    items: [
      { screen: "Partner", titleKey: "partnerDashboard", roles: ["AU", "MU"] },
      { screen: "ThemeSettings", titleKey: "Theme Settings", roles: ALL },
      { screen: "ChangePassword", titleKey: "changePassword", roles: ALL },
      { screen: "UserGuide", titleKey: "userGuide", roles: ALL },
      { screen: "Help", titleKey: "help", roles: ALL },
    ],
  },
];


/** Menu groups this role can use (each with only its allowed items). */
export function appMenuFor(role: string) {
  return APP_MENU.map((g) => ({ ...g, items: g.items.filter((i) => i.roles.includes(role)) })).filter((g) => g.items.length);
}
