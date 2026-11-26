import "./src/i18n";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Provider as PaperProvider } from "react-native-paper";
import { ThemeProvider, useThemeContext } from "./src/context/ThemeContext";
import { AuthProvider } from "./src/context/AuthContext";
import { SchoolAuthProvider } from "./src/context/SchoolAuthContext";
import { LanguageProvider } from "./src/context/LanguageContext";
import { AutoSaveProvider } from "./src/context/AutoSaveContext";
import RootNavigator from "./src/navigation/RootNavigator";
import { AppLockProvider } from "./src/context/AppLockContext";
import AppServices from "./src/AppServices";

function AppInner() {
  const { paperTheme, mode } = useThemeContext();
  return (
    <LanguageProvider>
      <AuthProvider>
        <SchoolAuthProvider>
        <AutoSaveProvider>
        <PaperProvider theme={paperTheme}>
          <AppLockProvider>
            <RootNavigator />
            <AppServices />
          </AppLockProvider>
          <StatusBar style={mode === "dark" ? "light" : "dark"} />
        </PaperProvider>
        </AutoSaveProvider>
        </SchoolAuthProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AppInner />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
