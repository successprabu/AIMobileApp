import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ActivityIndicator, View } from "react-native";
import { MD3DarkTheme, MD3LightTheme, type MD3Theme } from "react-native-paper";
import {
  darkTheme,
  lightTheme,
  type AppTheme,
  type ThemeMode,
} from "../theme/themes";

const THEME_KEY = "appThemeMode";

type ThemeContextValue = {
  mode: ThemeMode;
  theme: AppTheme;
  paperTheme: MD3Theme;
  setMode: (mode: ThemeMode) => Promise<void>;
  toggleMode: () => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function buildPaperTheme(app: AppTheme): MD3Theme {
  const base = app.mode === "dark" ? MD3DarkTheme : MD3LightTheme;
  return {
    ...base,
    roundness: 12,
    colors: {
      ...base.colors,
      primary: app.colors.primary,
      secondary: app.colors.secondary,
      background: app.colors.background,
      surface: app.colors.surface,
      onSurface: app.colors.text,
      onBackground: app.colors.text,
      outline: app.colors.border,
      surfaceVariant: app.colors.inputBg,
      onSurfaceVariant: app.colors.textMuted,
      onPrimary: app.colors.textInverse,
      elevation: {
        ...base.colors.elevation,
        level0: app.colors.background,
        level1: app.colors.surface,
        level2: app.colors.surfaceElevated,
      },
    },
  };
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("light");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_KEY);
        if (!cancelled && (stored === "light" || stored === "dark")) {
          setModeState(stored);
        }
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const theme = mode === "dark" ? darkTheme : lightTheme;

  const setMode = useCallback(async (next: ThemeMode) => {
    setModeState(next);
    await AsyncStorage.setItem(THEME_KEY, next);
  }, []);

  const toggleMode = useCallback(async () => {
    const next = mode === "light" ? "dark" : "light";
    await setMode(next);
  }, [mode, setMode]);

  const value = useMemo(
    () => ({
      mode,
      theme,
      paperTheme: buildPaperTheme(theme),
      setMode,
      toggleMode,
    }),
    [mode, theme, setMode, toggleMode]
  );

  if (!hydrated) {
    return (
      <View style={{ flex: 1, backgroundColor: lightTheme.colors.background }} />
    );
  }

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useThemeContext() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useThemeContext must be used within ThemeProvider");
  return ctx;
}
