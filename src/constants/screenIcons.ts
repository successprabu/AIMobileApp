import type { MaterialCommunityIcons } from "@expo/vector-icons";
import type { MainStackParamList } from "../navigation/types";

type Icon = keyof typeof MaterialCommunityIcons.glyphMap;

/**
 * One icon and colour per screen, used by the sidebar, the bottom bar and anywhere else a screen is linked, so the
 * same screen always looks the same.
 */
export const SCREEN_ICON: Partial<Record<keyof MainStackParamList, { icon: Icon; color: string }>> = {
  Dashboard: { icon: "home-variant", color: "#c2185b" },
  ClientList: { icon: "account-group", color: "#6c5ce7" },
  RegisterClient: { icon: "account-plus", color: "#00b894" },
  Enquiries: { icon: "email-fast-outline", color: "#0ea5e9" },
  MahalBookings: { icon: "calendar-heart", color: "#e84393" },
  MyMahals: { icon: "office-building", color: "#5f27cd" },
  FollowUps: { icon: "message-badge-outline", color: "#14b8a6" },
  AddMoitechCustomer: { icon: "account-heart", color: "#00b894" },
  FunctionMaster: { icon: "calendar-star", color: "#f59e0b" },
  UserMaster: { icon: "account-cog", color: "#475569" },
  Transaction: { icon: "receipt-text-plus", color: "#10b981" },
  TransactionList: { icon: "receipt-text-outline", color: "#c2185b" },
  AddExpenses: { icon: "cash-minus", color: "#f97316" },
  ExpensesList: { icon: "wallet-outline", color: "#ef4444" },
  Others: { icon: "gift-outline", color: "#06b6d4" },
  OthersList: { icon: "playlist-star", color: "#0891b2" },
  Handover: { icon: "handshake-outline", color: "#f39c12" },
  MoiGiven: { icon: "hand-heart-outline", color: "#8b5cf6" },
  History: { icon: "history", color: "#64748b" },
  IncomeReport: { icon: "chart-line", color: "#c2185b" },
  ExpensesReport: { icon: "chart-bar", color: "#f97316" },
  OthersReport: { icon: "chart-donut", color: "#00b894" },
  RegionalReport: { icon: "map-marker-radius", color: "#6c5ce7" },
  SummaryReport: { icon: "chart-pie", color: "#a855f7" },
  ThemeSettings: { icon: "palette-outline", color: "#ec4899" },
  ChangePassword: { icon: "lock-reset", color: "#0ea5e9" },
  UserGuide: { icon: "book-open-page-variant-outline", color: "#10b981" },
  Help: { icon: "lifebuoy", color: "#3498db" },
};

export const screenIcon = (screen: keyof MainStackParamList) => SCREEN_ICON[screen] ?? { icon: "circle-outline" as Icon, color: "#c2185b" };
