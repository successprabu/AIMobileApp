import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../context/AuthContext";

/**
 * Placeholder home after login. Port web `RoleBasedDashboard` and feature screens here next.
 */
export default function DashboardScreen() {
  const { user, signOut } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dashboard</Text>
      <Text style={styles.line}>
        Signed in as{" "}
        <Text style={styles.em}>
          {(user?.userName as string) ?? (user?.username as string) ?? "User"}
        </Text>
      </Text>
      <Text style={styles.line}>Role: {user?.userType ?? "—"}</Text>
      <Text style={styles.hint}>
        This screen will be replaced with the same flows as the web app (transactions,
        reports, mahal booking, etc.), still calling the existing API.
      </Text>
      <Pressable style={styles.button} onPress={() => void signOut()}>
        <Text style={styles.buttonText}>Log out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 16,
    color: "#2d3436",
  },
  line: { fontSize: 16, color: "#636e72", marginBottom: 8 },
  em: { fontWeight: "600", color: "#2d3436" },
  hint: {
    marginTop: 24,
    fontSize: 14,
    color: "#636e72",
    lineHeight: 20,
  },
  button: {
    marginTop: 32,
    alignSelf: "flex-start",
    backgroundColor: "#636e72",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
});
