export type ThemeMode = "light" | "dark";

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
    background: "#f0f4f8",
    surface: "#ffffff",
    surfaceElevated: "#ffffff",
    card: "#ffffff",
    primary: "#0984e3",
    primaryMuted: "rgba(9, 132, 227, 0.12)",
    secondary: "#6c5ce7",
    success: "#00b894",
    danger: "#e17055",
    warning: "#fdcb6e",
    text: "#2d3436",
    textMuted: "#636e72",
    textInverse: "#ffffff",
    border: "#e2e8f0",
    header: "#0984e3",
    headerText: "#ffffff",
    drawerBg: "#eef2f7",
    drawerHeader: "#0c5ba8",
    drawerHeaderAlt: "#6c5ce7",
    drawerFooter: "#ffffff",
    overlay: "rgba(15, 23, 42, 0.45)",
    inputBg: "#ffffff",
    chipBg: "#f1f5f9",
    chipSelected: "#0984e3",
    marriageAccent: "#c2185b",
    marriageSoft: "#fce4ec",
  },
};

/** Dark blue palette (not pure black). */
export const darkTheme: AppTheme = {
  mode: "dark",
  colors: {
    background: "#0f2744",
    surface: "#1a365d",
    surfaceElevated: "#234876",
    card: "#1e3f6f",
    primary: "#5dade2",
    primaryMuted: "rgba(93, 173, 226, 0.18)",
    secondary: "#a29bfe",
    success: "#55efc4",
    danger: "#ff7675",
    warning: "#ffeaa7",
    text: "#e8f4fc",
    textMuted: "#94b8d4",
    textInverse: "#0f2744",
    border: "#2a5082",
    header: "#0c3d6e",
    headerText: "#e8f4fc",
    drawerBg: "#0f2744",
    drawerHeader: "#0a3260",
    drawerHeaderAlt: "#1a4a7a",
    drawerFooter: "#1a365d",
    overlay: "rgba(5, 15, 30, 0.65)",
    inputBg: "#234876",
    chipBg: "#234876",
    chipSelected: "#5dade2",
    marriageAccent: "#f48fb1",
    marriageSoft: "rgba(194, 24, 91, 0.25)",
  },
};

export const APP_DISPLAY_NAME = "My Success";
