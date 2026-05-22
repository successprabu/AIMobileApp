import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { DrawerToggleButton } from "@react-navigation/drawer";
import type { MainStackParamList } from "./types";
import RoleDashboardScreen from "../screens/RoleDashboardScreen";
import ComingSoonScreen from "../screens/ComingSoonScreen";
import NewReceiptScreen from "../screens/NewReceiptScreen";
import TransactionListScreen from "../screens/TransactionListScreen";
import NewExpensesScreen from "../screens/NewExpensesScreen";
import AddOthersScreen from "../screens/AddOthersScreen";
import FunctionMasterScreen from "../screens/FunctionMasterScreen";
import UserMasterScreen from "../screens/UserMasterScreen";
import TransactionReportScreen from "../screens/TransactionReportScreen";
import RegionalReportScreen from "../screens/RegionalReportScreen";
import SummaryReportScreen from "../screens/SummaryReportScreen";
import HandoverScreen from "../screens/HandoverScreen";
import ExpensesListScreen from "../screens/ExpensesListScreen";
import OthersListScreen from "../screens/OthersListScreen";
import { stackHeaderOptions } from "../theme/appTheme";

const Stack = createNativeStackNavigator<MainStackParamList>();

export default function MainStackNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Dashboard"
      screenOptions={{
        ...stackHeaderOptions,
        headerShown: true,
        animation: "slide_from_right",
        headerLeft: (props) => <DrawerToggleButton {...props} />,
      }}
    >
      <Stack.Screen
        name="Dashboard"
        component={RoleDashboardScreen}
        options={{ headerShown: true }}
      />
      <Stack.Screen name="ClientList" component={ComingSoonScreen} />
      <Stack.Screen name="AddNewMahal" component={ComingSoonScreen} />
      <Stack.Screen name="MahalBooking" component={ComingSoonScreen} />
      <Stack.Screen name="MahalBookingList" component={ComingSoonScreen} />
      <Stack.Screen name="AddMoitechCustomer" component={ComingSoonScreen} />
      <Stack.Screen name="FunctionMaster" component={FunctionMasterScreen} />
      <Stack.Screen name="UserMaster" component={UserMasterScreen} />
      <Stack.Screen name="Transaction" component={NewReceiptScreen} />
      <Stack.Screen name="TransactionList" component={TransactionListScreen} />
      <Stack.Screen name="AddExpenses" component={NewExpensesScreen} />
      <Stack.Screen name="ExpensesList" component={ExpensesListScreen} />
      <Stack.Screen name="Others" component={AddOthersScreen} />
      <Stack.Screen name="OthersList" component={OthersListScreen} />
      <Stack.Screen name="Handover" component={HandoverScreen} />
      <Stack.Screen name="IncomeReport" component={TransactionReportScreen} />
      <Stack.Screen name="ExpensesReport" component={TransactionReportScreen} />
      <Stack.Screen name="OthersReport" component={TransactionReportScreen} />
      <Stack.Screen name="RegionalReport" component={RegionalReportScreen} />
      <Stack.Screen name="SummaryReport" component={SummaryReportScreen} />
      <Stack.Screen name="ThemeSettings" component={ComingSoonScreen} />
      <Stack.Screen name="Help" component={ComingSoonScreen} />
    </Stack.Navigator>
  );
}
