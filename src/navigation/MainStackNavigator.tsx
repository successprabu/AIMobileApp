import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { DrawerToggleButton } from "@react-navigation/drawer";
import type { MainStackParamList } from "./types";
import RoleDashboardScreen from "../screens/RoleDashboardScreen";
import HelpScreen from "../screens/HelpScreen";
import UserGuideScreen from "../screens/UserGuideScreen";
import MoiGivenScreen from "../screens/MoiGivenScreen";
import ChangePasswordScreen from "../screens/ChangePasswordScreen";
import HistoryScreen from "../screens/HistoryScreen";
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
import ThemeSettingsScreen from "../screens/ThemeSettingsScreen";
import MahalBookingsScreen from "../screens/mahal/MahalBookingsScreen";
import BookingFormScreen from "../screens/mahal/BookingFormScreen";
import MyMahalsScreen from "../screens/mahal/MyMahalsScreen";
import MahalFormScreen from "../screens/mahal/MahalFormScreen";
import ClientListScreen from "../screens/admin/ClientListScreen";
import RegisterClientScreen from "../screens/admin/RegisterClientScreen";
import EnquiriesScreen from "../screens/admin/EnquiriesScreen";
import MoitechRegScreen from "../screens/admin/MoitechRegScreen";
import { Pressable } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppTheme } from "../hooks/useAppTheme";

const Stack = createNativeStackNavigator<MainStackParamList>();

export default function MainStackNavigator() {
  const { theme } = useAppTheme();
  const c = theme.colors;

  return (
    <Stack.Navigator
      initialRouteName="Dashboard"
      screenOptions={{
        headerShown: true,
        animation: "slide_from_right",
        headerStyle: { backgroundColor: c.header },
        headerTintColor: c.headerText,
        headerTitleStyle: { fontWeight: "600" },
        headerShadowVisible: false,
        headerLeft: (props) => <DrawerToggleButton {...props} tintColor={c.headerText} />,
        contentStyle: { backgroundColor: c.background },
      }}
    >
      <Stack.Screen name="Dashboard" component={RoleDashboardScreen} />
      <Stack.Screen name="ClientList" component={ClientListScreen} />
      <Stack.Screen name="Enquiries" component={EnquiriesScreen} />
      <Stack.Screen name="RegisterClient" component={RegisterClientScreen} />
      <Stack.Screen name="MyMahals" component={MyMahalsScreen} />
      <Stack.Screen name="MahalBookings" component={MahalBookingsScreen} />
      {/* Forms open on top of a list, so they get a back arrow instead of the menu button. */}
      <Stack.Screen
        name="MahalForm"
        component={MahalFormScreen}
        options={({ navigation }) => ({
          headerLeft: () => (
            <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Back" hitSlop={12} style={{ paddingRight: 16, paddingVertical: 4 }}>
              <MaterialCommunityIcons name="arrow-left" size={24} color={c.headerText} />
            </Pressable>
          ),
        })}
      />
      <Stack.Screen
        name="BookingForm"
        component={BookingFormScreen}
        options={({ navigation }) => ({
          headerLeft: () => (
            <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Back" hitSlop={12} style={{ paddingRight: 16, paddingVertical: 4 }}>
              <MaterialCommunityIcons name="arrow-left" size={24} color={c.headerText} />
            </Pressable>
          ),
        })}
      />
      <Stack.Screen name="AddMoitechCustomer" component={MoitechRegScreen} />
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
      <Stack.Screen name="ThemeSettings" component={ThemeSettingsScreen} />
      <Stack.Screen name="Help" component={HelpScreen} />
      <Stack.Screen name="UserGuide" component={UserGuideScreen} />
      <Stack.Screen name="MoiGiven" component={MoiGivenScreen} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
      <Stack.Screen name="History" component={HistoryScreen} />
    </Stack.Navigator>
  );
}
