import React from "react";
import {
  createDrawerNavigator,
  type DrawerNavigationProp,
} from "@react-navigation/drawer";
import type { NavigatorScreenParams } from "@react-navigation/native";
import MainStackNavigator from "./MainStackNavigator";
import AppDrawerContent from "./AppDrawerContent";
import { useAppTheme } from "../hooks/useAppTheme";
import type { MainStackParamList } from "./types";

export type RootDrawerParamList = {
  Home: NavigatorScreenParams<MainStackParamList> | undefined;
};

const Drawer = createDrawerNavigator<RootDrawerParamList>();

export type AppDrawerNavigation = DrawerNavigationProp<RootDrawerParamList>;

export default function AppDrawerNavigator() {
  const { theme } = useAppTheme();
  return (
    <Drawer.Navigator
      drawerContent={(props) => <AppDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: "front",
        swipeEnabled: true,
        overlayColor: theme.colors.overlay,
        drawerStyle: {
          width: "88%",
          maxWidth: 340,
          backgroundColor: "transparent",
        },
      }}
    >
      <Drawer.Screen
        name="Home"
        component={MainStackNavigator}
        options={{ title: "Home" }}
      />
    </Drawer.Navigator>
  );
}
