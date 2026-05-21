import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { DrawerToggleButton } from "@react-navigation/drawer";
import type { MainStackParamList } from "./types";
import RoleDashboardScreen from "../screens/RoleDashboardScreen";
import ComingSoonScreen from "../screens/ComingSoonScreen";
import FunctionMasterScreen from "../screens/FunctionMasterScreen";
import TransactionReportScreen from "../screens/TransactionReportScreen";
import RegionalReportScreen from "../screens/RegionalReportScreen";
import SummaryReportScreen from "../screens/SummaryReportScreen";

const Stack = createNativeStackNavigator<MainStackParamList>();

export default function MainStackNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Dashboard"
      screenOptions={{
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
      <Stack.Screen name="UserMaster" component={ComingSoonScreen} />
      <Stack.Screen name="Transaction" component={ComingSoonScreen} />
      <Stack.Screen name="TransactionList" component={ComingSoonScreen} />
      <Stack.Screen name="AddExpenses" component={ComingSoonScreen} />
      <Stack.Screen name="ExpensesList" component={ComingSoonScreen} />
      <Stack.Screen name="Others" component={ComingSoonScreen} />
      <Stack.Screen name="OthersList" component={ComingSoonScreen} />
      <Stack.Screen name="Handover" component={ComingSoonScreen} />
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
