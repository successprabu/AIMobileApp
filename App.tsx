import "./src/i18n";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Provider as PaperProvider } from "react-native-paper";
import { ThemeProvider, useThemeContext } from "./src/context/ThemeContext";
import { AuthProvider } from "./src/context/AuthContext";
import { LanguageProvider } from "./src/context/LanguageContext";
import RootNavigator from "./src/navigation/RootNavigator";

function AppInner() {
  const { paperTheme, mode } = useThemeContext();
  return (
    <PaperProvider theme={paperTheme}>
      <LanguageProvider>
        <AuthProvider>
          <RootNavigator />
          <StatusBar style={mode === "dark" ? "light" : "dark"} />
        </AuthProvider>
      </LanguageProvider>
    </PaperProvider>
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
