import type { NavigatorScreenParams } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

export type RootDrawerParamList = {
  Home: NavigatorScreenParams<MainStackParamList> | undefined;
};

export type MainStackParamList = {
  Dashboard: undefined;
  ClientList: undefined;
  RegisterClient: { type?: "moitech" | "mahal" } | undefined;
  Enquiries: undefined;
  MyMahals: undefined;
  FollowUps: undefined;
  MahalExpenses: undefined;
  MahalStaff: undefined;
  MahalReviews: undefined;
  MahalVendors: undefined;
  MahalReports: undefined;
  MahalForm: { mahalId?: number } | undefined;
  MahalBookings: { tab?: string } | undefined;
  BookingForm: { bookingId?: number; mahalId?: number } | undefined;
  AddMoitechCustomer: undefined;
  FunctionMaster: undefined;
  UserMaster: undefined;
  Transaction: undefined;
  TransactionList: undefined;
  AddExpenses: undefined;
  ExpensesList: undefined;
  Others: undefined;
  OthersList: undefined;
  Handover: undefined;
  IncomeReport: undefined;
  ExpensesReport: undefined;
  OthersReport: undefined;
  RegionalReport: undefined;
  SummaryReport: undefined;
  ThemeSettings: undefined;
  Help: undefined;
  UserGuide: undefined;
  MoiGiven: undefined;
  ChangePassword: undefined;
  History: { action?: string } | undefined;
};

export type MainStackProps<T extends keyof MainStackParamList> =
  NativeStackScreenProps<MainStackParamList, T>;
