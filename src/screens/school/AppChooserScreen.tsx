import React from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { useSchoolAuth, type ActiveApp } from "../../context/SchoolAuthContext";
import { useAppTheme } from "../../hooks/useAppTheme";
import { Rise } from "../../components/ui/AuthUi";

/** Shown when the same person has a DigiMoi / Mahal login and a School login: pick which to open. */
export default function AppChooserScreen() {
  const { user } = useAuth();
  const { school, setActiveApp } = useSchoolAuth();
  const { theme } = useAppTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const options: { id: ActiveApp; title: string; text: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; color: string }[] = [];
  if (user) {
    options.push({
      id: "mysuccess",
      title: "DigiMoi / Mahal",
      text: `Moi accounts and hall bookings · ${user.name ?? ""}`,
      icon: "hand-heart-outline",
      color: "#6366f1",
    });
  }
  if (school) {
    options.push({
      id: "school",
      title: school.user.role === "parent" ? "School – Parent" : "School ERP",
      text: `${school.schoolName ?? school.user.schoolId} · ${school.user.name}`,
      icon: "school-outline",
      color: "#10b981",
    });
  }
  return (
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={[styles.wrap, { paddingTop: insets.top + 40 }]}>
      <Text style={[styles.h1, { color: c.text }]}>Which app do you want to open?</Text>
      <Text style={{ color: c.textMuted, marginBottom: 24 }}>You can switch any time from the menu.</Text>
      {options.map((o, i) => (
        <Rise key={o.id} delay={i * 90}>
          <Pressable
            onPress={() => void setActiveApp(o.id)}
            style={[styles.card, { backgroundColor: c.surface, borderColor: `${o.color}55` }]}
            accessibilityRole="button"
            accessibilityLabel={o.title}
          >
            <View style={[styles.icon, { backgroundColor: `${o.color}1f` }]}>
              <MaterialCommunityIcons name={o.icon} size={30} color={o.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.text, fontWeight: "800", fontSize: 17 }}>{o.title}</Text>
              <Text style={{ color: c.textMuted, marginTop: 2 }}>{o.text}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={26} color={o.color} />
          </Pressable>
        </Rise>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 20 },
  h1: { fontSize: 24, fontWeight: "800", marginBottom: 6 },
  card: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 18, borderWidth: 1.5, marginBottom: 14 },
  icon: { width: 56, height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center" },
});
