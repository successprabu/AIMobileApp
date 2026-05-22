import React from "react";
import {
  createDrawerNavigator,
  type DrawerNavigationProp,
} from "@react-navigation/drawer";
import HomeShell from "./HomeShell";
import AppDrawerContent from "./AppDrawerContent";
import { useAppTheme } from "../hooks/useAppTheme";
import type { RootDrawerParamList } from "./types";

export type { RootDrawerParamList } from "./types";

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
        component={HomeShell}
        options={{ title: "Home" }}
      />
    </Drawer.Navigator>
  );
}
