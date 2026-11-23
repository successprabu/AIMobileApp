import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../context/AuthContext";
import { useAppTheme } from "../hooks/useAppTheme";
import LoginScreen from "../screens/LoginScreen";
import RegistrationScreen from "../screens/RegistrationScreen";
import AppDrawerNavigator from "./AppDrawerNavigator";
import type { AuthStackParamList } from "../screens/RegistrationScreen";
import ForgotPasswordScreen from "../screens/ForgotPasswordScreen";
import { HeaderBackground, HeaderTitle } from "../components/ui/AppBars";

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function RootNavigator() {
  const { user, isReady } = useAuth();
  const { theme, mode } = useAppTheme();
  const c = theme.colors;

  const navTheme = {
    ...(mode === "dark" ? DarkTheme : DefaultTheme),
    colors: {
      ...(mode === "dark" ? DarkTheme.colors : DefaultTheme.colors),
      primary: c.primary,
      background: c.background,
      card: c.surface,
      text: c.text,
      border: c.border,
    },
  };

  if (!isReady) {
    return (
      <View style={[styles.centered, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      {user ? (
        <AppDrawerNavigator />
      ) : (
        <Stack.Navigator
          screenOptions={{
            headerShown: true,
            headerStyle: { backgroundColor: c.header },
            headerTintColor: c.headerText,
            headerTitleStyle: { fontWeight: "800" },
            headerShadowVisible: false,
            animation: "slide_from_right",
            headerBackground: () => <HeaderBackground color={c.header} />,
            headerTitle: ({ children }) => <HeaderTitle tint={c.headerText}>{children}</HeaderTitle>,
            contentStyle: { backgroundColor: c.background },
          }}
        >
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="SignUp"
            component={RegistrationScreen}
            options={{ title: "My Success" }}
          />
          <Stack.Screen
            name="ForgotPassword"
            component={ForgotPasswordScreen}
            options={{ title: "Forgot password" }}
          />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
