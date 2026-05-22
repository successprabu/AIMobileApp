export { APP_DISPLAY_NAME, lightTheme, darkTheme, type AppTheme, type ThemeMode } from "./themes";

import { lightTheme } from "./themes";

/** @deprecated Use useAppTheme().theme.colors */
export const colors = {
  background: lightTheme.colors.background,
  surface: lightTheme.colors.surface,
  primary: lightTheme.colors.primary,
  primaryDark: "#0770c2",
  secondary: lightTheme.colors.secondary,
  success: lightTheme.colors.success,
  warning: lightTheme.colors.warning,
  danger: lightTheme.colors.danger,
  text: lightTheme.colors.text,
  textMuted: lightTheme.colors.textMuted,
  border: lightTheme.colors.border,
  drawerGradientTop: lightTheme.colors.drawerHeader,
  drawerGradientBottom: lightTheme.colors.drawerHeaderAlt,
};

export const paperThemeOverrides = { roundness: 12 };

export const stackHeaderOptions = {
  headerStyle: { backgroundColor: lightTheme.colors.header },
  headerTintColor: lightTheme.colors.headerText,
  headerTitleStyle: { fontWeight: "600" as const },
  headerShadowVisible: false,
};

export const screenStyles = {
  screen: { flex: 1, backgroundColor: lightTheme.colors.background },
};
