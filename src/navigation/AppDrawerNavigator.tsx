import React from "react";
import {
  createDrawerNavigator,
  type DrawerNavigationProp,
} from "@react-navigation/drawer";
import type { NavigatorScreenParams } from "@react-navigation/native";
import MainStackNavigator from "./MainStackNavigator";
import AppDrawerContent from "./AppDrawerContent";
import type { MainStackParamList } from "./types";

export type RootDrawerParamList = {
  Home: NavigatorScreenParams<MainStackParamList> | undefined;
};

const Drawer = createDrawerNavigator<RootDrawerParamList>();

export type AppDrawerNavigation = DrawerNavigationProp<RootDrawerParamList>;

export default function AppDrawerNavigator() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <AppDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: "front",
        swipeEnabled: true,
        overlayColor: "rgba(15, 23, 42, 0.45)",
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
