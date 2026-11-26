import React, { useEffect } from "react";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useSchoolAuth } from "../context/SchoolAuthContext";
import { useAppTheme } from "../hooks/useAppTheme";
import { HeaderBackground, HeaderTitle, MenuButton } from "../components/ui/AppBars";
import SchoolDrawerContent from "./SchoolDrawerContent";
import { setSchoolStack } from "../school/schoolMenu";
import DashboardScreen from "../screens/school/DashboardScreen";
import AiAssistantScreen from "../screens/school/AiAssistantScreen";
import StudentsScreen from "../screens/school/StudentsScreen";
import StudentDetailScreen from "../screens/school/StudentDetailScreen";
import StudentFormScreen from "../screens/school/StudentFormScreen";
import FeesScreen from "../screens/school/FeesScreen";
import TransportScreen from "../screens/school/TransportScreen";
import LibraryScreen from "../screens/school/LibraryScreen";
import IdCardsScreen from "../screens/school/IdCardsScreen";
import ReportsScreen from "../screens/school/ReportsScreen";
import UsersScreen from "../screens/school/UsersScreen";
import OnlinePaymentsScreen from "../screens/school/OnlinePaymentsScreen";
import SchoolSettingsScreen from "../screens/school/SchoolSettingsScreen";
import ParentHomeScreen from "../screens/school/ParentHomeScreen";
import StaffHomeScreen from "../screens/school/StaffHomeScreen";
import SchoolChangePasswordScreen from "../screens/school/SchoolChangePasswordScreen";
import AttendanceScreen from "../screens/school/AttendanceScreen";
import MarksScreen from "../screens/school/MarksScreen";
import PostNoticeScreen from "../screens/school/PostNoticeScreen";
import CollectFeeScreen from "../screens/school/CollectFeeScreen";
import AdmissionsScreen from "../screens/school/AdmissionsScreen";
import BusAlertScreen from "../screens/school/BusAlertScreen";
import SchoolBottomBar, { type ParentSection, type SchoolTabNav } from "../screens/school/SchoolBottomBar";
import { SCHOOL_GREEN } from "../screens/school/schoolUi";
import { View } from "react-native";

export type SchoolStackParamList = {
  SchoolHome: { section?: ParentSection; at?: number } | undefined;
  SchoolChangePassword: undefined;
  SchoolAttendance: undefined;
  SchoolMarks: undefined;
  SchoolPost: undefined;
  SchoolCollectFee: { studentId?: string } | undefined;
  SchoolAdmissions: undefined;
  SchoolBusAlert: undefined;
  SchoolDashboard: undefined;
  SchoolAi: undefined;
  SchoolStudents: undefined;
  SchoolStudent: { id: string };
  SchoolStudentForm: { id?: string } | undefined;
  SchoolFees: undefined;
  SchoolTransport: undefined;
  SchoolLibrary: undefined;
  SchoolIdCards: undefined;
  SchoolReports: undefined;
  SchoolUsers: undefined;
  SchoolOnlinePayments: undefined;
  SchoolSettings: undefined;
};

const Stack = createNativeStackNavigator<SchoolStackParamList>();
const Drawer = createDrawerNavigator();

/** Detail screens keep the back arrow; every other School screen shows the menu button. */
const DETAIL = new Set(["SchoolStudent", "SchoolStudentForm"]);

/** Lets the side menu and bottom bar open screens in this stack. */
function StackLink({ navigation }: { navigation: unknown }) {
  useEffect(() => {
    setSchoolStack(navigation as Parameters<typeof setSchoolStack>[0]);
  }, [navigation]);
  return null;
}

/** School part of the app: a side menu grouped like the website, around the School screens. */
export default function SchoolNavigator() {
  const { theme } = useAppTheme();
  return (
    <Drawer.Navigator
      drawerContent={(p) => <SchoolDrawerContent {...p} />}
      screenOptions={{ headerShown: false, drawerType: "front", drawerStyle: { width: 300, backgroundColor: theme.colors.drawerBg } }}
    >
      <Drawer.Screen name="SchoolStack" component={SchoolStack} />
    </Drawer.Navigator>
  );
}

/** Parents get their child's home, staff get the ERP home and every ERP screen. */
function SchoolStack() {
  const { school } = useSchoolAuth();
  const { theme } = useAppTheme();
  const c = theme.colors;
  if (!school) return null;
  const isParent = school.user.role === "parent";
  const mustChange = !!school.user.mustChangePassword;

  return (
    <Stack.Navigator
      screenLayout={({ children, navigation, route }) => (
        <View style={{ flex: 1, backgroundColor: c.background }}>
          <StackLink navigation={navigation} />
          <View style={{ flex: 1 }}>{children}</View>
          <SchoolBottomBar
            navigation={navigation as unknown as SchoolTabNav}
            routeName={route.name}
            section={(route.params as { section?: ParentSection } | undefined)?.section}
          />
        </View>
      )}
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: SCHOOL_GREEN },
        headerTintColor: "#fff",
        headerShadowVisible: false,
        headerBackground: () => <HeaderBackground color={SCHOOL_GREEN} />,
        headerTitle: ({ children }) => <HeaderTitle tint="#fff">{children}</HeaderTitle>,
        ...(DETAIL.has(route.name) || mustChange ? {} : { headerLeft: () => <MenuButton tint="#fff" /> }),
        contentStyle: { backgroundColor: c.background },
        animation: "slide_from_right",
      })}
    >
      {mustChange ? (
        <Stack.Screen name="SchoolChangePassword" component={SchoolChangePasswordScreen} options={{ title: "New password" }} />
      ) : (
        <>
          <Stack.Screen
            name="SchoolHome"
            component={isParent ? ParentHomeScreen : StaffHomeScreen}
            options={{ title: school.schoolName ?? "School" }}
          />
          <Stack.Screen name="SchoolChangePassword" component={SchoolChangePasswordScreen} options={{ title: "Change password" }} />
          <Stack.Screen name="SchoolAttendance" component={AttendanceScreen} options={{ title: "Attendance" }} />
          <Stack.Screen name="SchoolMarks" component={MarksScreen} options={{ title: "Enter marks" }} />
          <Stack.Screen name="SchoolPost" component={PostNoticeScreen} options={{ title: "Homework & circulars" }} />
          <Stack.Screen name="SchoolCollectFee" component={CollectFeeScreen} options={{ title: "Collect fee" }} />
          <Stack.Screen name="SchoolAdmissions" component={AdmissionsScreen} options={{ title: "Enquiries & applications" }} />
          <Stack.Screen name="SchoolBusAlert" component={BusAlertScreen} options={{ title: "Bus alert" }} />
          <Stack.Screen name="SchoolDashboard" component={DashboardScreen} options={{ title: "Dashboard" }} />
          <Stack.Screen name="SchoolAi" component={AiAssistantScreen} options={{ title: "AI assistant" }} />
          <Stack.Screen name="SchoolStudents" component={StudentsScreen} options={{ title: "Students" }} />
          <Stack.Screen name="SchoolStudent" component={StudentDetailScreen} options={{ title: "Student" }} />
          <Stack.Screen name="SchoolStudentForm" component={StudentFormScreen} options={{ title: "Student" }} />
          <Stack.Screen name="SchoolFees" component={FeesScreen} options={{ title: "Fees" }} />
          <Stack.Screen name="SchoolTransport" component={TransportScreen} options={{ title: "Transport" }} />
          <Stack.Screen name="SchoolLibrary" component={LibraryScreen} options={{ title: "Library" }} />
          <Stack.Screen name="SchoolIdCards" component={IdCardsScreen} options={{ title: "ID cards & hall tickets" }} />
          <Stack.Screen name="SchoolReports" component={ReportsScreen} options={{ title: "Reports" }} />
          <Stack.Screen name="SchoolUsers" component={UsersScreen} options={{ title: "Staff & logins" }} />
          <Stack.Screen name="SchoolOnlinePayments" component={OnlinePaymentsScreen} options={{ title: "Online payments" }} />
          <Stack.Screen name="SchoolSettings" component={SchoolSettingsScreen} options={{ title: "School settings" }} />
        </>
      )}
    </Stack.Navigator>
  );
}
