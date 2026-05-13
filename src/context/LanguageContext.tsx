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
import i18n from "../i18n";

const LANG_KEY = "appLanguage";

export type LangCode = "en" | "ta" | "ml" | "te" | "kn" | "hi";

const SUPPORTED: LangCode[] = ["en", "ta", "ml", "te", "kn", "hi"];

type LanguageContextValue = {
  language: LangCode;
  supportedLanguages: LangCode[];
  changeLanguage: (lang: LangCode) => Promise<void>;
};

const LanguageContext = createContext<LanguageContextValue | undefined>(
  undefined
);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<LangCode>("en");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(LANG_KEY);
        const next =
          stored && SUPPORTED.includes(stored as LangCode)
            ? (stored as LangCode)
            : "en";
        if (!cancelled) {
          setLanguage(next);
          await i18n.changeLanguage(next);
        }
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const changeLanguage = useCallback(async (lang: LangCode) => {
    setLanguage(lang);
    await AsyncStorage.setItem(LANG_KEY, lang);
    await i18n.changeLanguage(lang);
  }, []);

  const value = useMemo(
    () => ({
      language,
      supportedLanguages: SUPPORTED,
      changeLanguage,
    }),
    [language, changeLanguage]
  );

  if (!hydrated) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#0984e3" />
      </View>
    );
  }

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
