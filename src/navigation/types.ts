import type { NativeStackScreenProps } from "@react-navigation/native-stack";

export type MainStackParamList = {
  Dashboard: undefined;
  ClientList: undefined;
  AddNewMahal: undefined;
  MahalBooking: undefined;
  MahalBookingList: undefined;
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
};

export type MainStackProps<T extends keyof MainStackParamList> =
  NativeStackScreenProps<MainStackParamList, T>;
