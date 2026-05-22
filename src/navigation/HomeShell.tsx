import React from "react";
import { StyleSheet, View } from "react-native";
import ContextualFooter from "../components/ContextualFooter";
import MainStackNavigator from "./MainStackNavigator";

/** Drawer Home screen: stack content + contextual footer (web-style header links). */
export default function HomeShell() {
  return (
    <View style={styles.root}>
      <View style={styles.stack}>
        <MainStackNavigator />
      </View>
      <ContextualFooter />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  stack: { flex: 1 },
});
