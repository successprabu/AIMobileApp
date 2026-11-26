import React, { useState } from "react";
import { Alert, Linking } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { IconButton, Menu } from "react-native-paper";
import { SCHOOL_SITE } from "../api/school";
import { useAuth } from "../context/AuthContext";
import { useSchoolAuth } from "../context/SchoolAuthContext";
import { useAppTheme } from "../hooks/useAppTheme";
import { HeaderBackground, HeaderTitle } from "../components/ui/AppBars";
import ParentHomeScreen from "../screens/school/ParentHomeScreen";
import StaffHomeScreen from "../screens/school/StaffHomeScreen";
import SchoolChangePasswordScreen from "../screens/school/SchoolChangePasswordScreen";

export type SchoolStackParamList = {
  SchoolHome: undefined;
  SchoolChangePassword: undefined;
};

const Stack = createNativeStackNavigator<SchoolStackParamList>();

/** The "⋮" menu on School screens: switch app, change password, website, sign out. */
function SchoolMenu({ tint, onChangePassword }: { tint: string; onChangePassword: () => void }) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const { schoolSignOut, setActiveApp } = useSchoolAuth();
  const close = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };
  const signOut = () =>
    Alert.alert("Sign out of School?", user ? "You stay signed in to DigiMoi / Mahal." : undefined, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: () =>
          void (async () => {
            await schoolSignOut();
            await setActiveApp(user ? "mysuccess" : null);
          })(),
      },
    ]);
  return (
    <Menu visible={open} onDismiss={() => setOpen(false)} anchor={<IconButton icon="dots-vertical" iconColor={tint} onPress={() => setOpen(true)} accessibilityLabel="Menu" />}>
      {user ? <Menu.Item leadingIcon="swap-horizontal" title="Open DigiMoi / Mahal" onPress={close(() => void setActiveApp("mysuccess"))} /> : null}
      <Menu.Item leadingIcon="key-outline" title="Change password" onPress={close(onChangePassword)} />
      <Menu.Item leadingIcon="web" title="School website" onPress={close(() => void Linking.openURL(SCHOOL_SITE))} />
      <Menu.Item leadingIcon="logout" title="Sign out of School" onPress={close(signOut)} />
    </Menu>
  );
}

/** School part of the app: parents get their child's home, staff get the ERP home. */
export default function SchoolNavigator() {
  const { school } = useSchoolAuth();
  const { theme } = useAppTheme();
  const c = theme.colors;
  if (!school) return null;
  const isParent = school.user.role === "parent";
  const mustChange = !!school.user.mustChangePassword;

  return (
    <Stack.Navigator
      screenOptions={({ navigation }) => ({
        headerStyle: { backgroundColor: c.header },
        headerTintColor: c.headerText,
        headerShadowVisible: false,
        headerBackground: () => <HeaderBackground color={c.header} />,
        headerTitle: ({ children }) => <HeaderTitle tint={c.headerText}>{children}</HeaderTitle>,
        headerRight: () => <SchoolMenu tint={c.headerText} onChangePassword={() => navigation.navigate("SchoolChangePassword")} />,
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
            options={{ title: isParent ? school.schoolName ?? "School" : "School ERP" }}
          />
          <Stack.Screen name="SchoolChangePassword" component={SchoolChangePasswordScreen} options={{ title: "Change password" }} />
        </>
      )}
    </Stack.Navigator>
  );
}
