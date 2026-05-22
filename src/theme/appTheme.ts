import { StyleSheet } from "react-native";

export const APP_DISPLAY_NAME = "My Success";

export const colors = {
  background: "#f0f4f8",
  surface: "#ffffff",
  primary: "#0984e3",
  primaryDark: "#0770c2",
  secondary: "#6c5ce7",
  success: "#00b894",
  warning: "#fdcb6e",
  danger: "#e17055",
  text: "#2d3436",
  textMuted: "#636e72",
  border: "#e9ecef",
  drawerGradientTop: "#0984e3",
  drawerGradientBottom: "#6c5ce7",
};

export const paperThemeOverrides = {
  roundness: 12,
};

export const screenStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    marginBottom: 12,
    backgroundColor: colors.surface,
    borderRadius: 14,
  },
  sectionTitle: {
    fontWeight: "700",
    color: colors.text,
    marginBottom: 10,
  },
});

export const stackHeaderOptions = {
  headerStyle: { backgroundColor: colors.primary },
  headerTintColor: "#fff",
  headerTitleStyle: { fontWeight: "600" as const },
  headerShadowVisible: false,
};
