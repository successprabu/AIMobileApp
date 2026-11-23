import React from "react";
import { useWindowDimensions } from "react-native";
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
  // A plain number: with "88%" plus maxWidth the drawer slid in by the uncapped width and its left edge was cut
  // off on wide phones.
  const { width } = useWindowDimensions();
  const drawerWidth = Math.round(Math.min(width * 0.88, 340));
  return (
    <Drawer.Navigator
      drawerContent={(props) => <AppDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: "front",
        swipeEnabled: true,
        overlayColor: theme.colors.overlay,
        drawerStyle: {
          width: drawerWidth,
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
