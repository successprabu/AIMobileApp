export type ThemeMode = "light" | "dark";

/** Primary brand pink (maroon-burgundy) — buttons, headers, links, accents. */
export const PRIMARY_PINK = "#c2185b";
export const PRIMARY_PINK_DARK = "#ad1457";
export const PRIMARY_PINK_LIGHT = "#f06292";

export type AppTheme = {
  mode: ThemeMode;
  colors: {
    background: string;
    surface: string;
    surfaceElevated: string;
    card: string;
    primary: string;
    primaryMuted: string;
    secondary: string;
    success: string;
    danger: string;
    warning: string;
    text: string;
    textMuted: string;
    textInverse: string;
    border: string;
    header: string;
    headerText: string;
    drawerBg: string;
    drawerHeader: string;
    drawerHeaderAlt: string;
    drawerFooter: string;
    overlay: string;
    inputBg: string;
    chipBg: string;
    chipSelected: string;
    marriageAccent: string;
    marriageSoft: string;
  };
};

export const lightTheme: AppTheme = {
  mode: "light",
  colors: {
    background: "#f5f5f7",
    surface: "#ffffff",
    surfaceElevated: "#ffffff",
    card: "#ffffff",
    primary: PRIMARY_PINK,
    primaryMuted: "rgba(194, 24, 91, 0.12)",
    secondary: PRIMARY_PINK_DARK,
    success: "#00b894",
    danger: "#e17055",
    warning: "#fdcb6e",
    text: "#2d3436",
    textMuted: "#636e72",
    textInverse: "#ffffff",
    border: "#e8e0e3",
    header: PRIMARY_PINK,
    headerText: "#ffffff",
    drawerBg: "#faf8f9",
    drawerHeader: PRIMARY_PINK,
    drawerHeaderAlt: PRIMARY_PINK_DARK,
    drawerFooter: "#ffffff",
    overlay: "rgba(0, 0, 0, 0.45)",
    inputBg: "#ffffff",
    chipBg: "#f5eef1",
    chipSelected: PRIMARY_PINK,
    marriageAccent: PRIMARY_PINK,
    marriageSoft: "#fce4ec",
  },
};

/** Dark theme — black backgrounds, pink primary. */
export const darkTheme: AppTheme = {
  mode: "dark",
  colors: {
    background: "#000000",
    surface: "#121212",
    surfaceElevated: "#1a1a1a",
    card: "#1e1e1e",
    primary: PRIMARY_PINK_LIGHT,
    primaryMuted: "rgba(240, 98, 146, 0.22)",
    secondary: PRIMARY_PINK,
    success: "#55efc4",
    danger: "#ff7675",
    warning: "#ffeaa7",
    text: "#f5f5f5",
    textMuted: "#a0a0a0",
    textInverse: "#000000",
    border: "#333333",
    header: PRIMARY_PINK,
    headerText: "#ffffff",
    drawerBg: "#000000",
    drawerHeader: PRIMARY_PINK_DARK,
    drawerHeaderAlt: "#880e4f",
    drawerFooter: "#121212",
    overlay: "rgba(0, 0, 0, 0.75)",
    inputBg: "#2a2a2a",
    chipBg: "#2a2a2a",
    chipSelected: PRIMARY_PINK_LIGHT,
    marriageAccent: PRIMARY_PINK_LIGHT,
    marriageSoft: "rgba(194, 24, 91, 0.35)",
  },
};

export const APP_DISPLAY_NAME = "My Success";
