import React from "react";
import { StyleSheet, View } from "react-native";
import AppBottomBar from "../components/AppBottomBar";
import MainStackNavigator from "./MainStackNavigator";

/** Drawer Home screen: stack content + the emoji bottom bar. */
export default function HomeShell() {
  return (
    <View style={styles.root}>
      <View style={styles.stack}>
        <MainStackNavigator />
      </View>
      <AppBottomBar />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  stack: { flex: 1 },
});
