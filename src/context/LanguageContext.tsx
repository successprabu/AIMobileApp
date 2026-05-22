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
const REGIONAL_LANG_KEY = "lastRegionalLanguage";

export type LangCode = "en" | "ta" | "ml" | "te" | "kn" | "hi";

const SUPPORTED: LangCode[] = ["en", "ta", "ml", "te", "kn", "hi"];
const REGIONAL: LangCode[] = ["ta", "ml", "te", "kn", "hi"];

export function isRegionalLanguage(lang: LangCode): boolean {
  return REGIONAL.includes(lang);
}

type LanguageContextValue = {
  language: LangCode;
  /** Regional language used for typing suggestions (menu language, or last regional). */
  suggestionTargetLanguage: LangCode;
  supportedLanguages: LangCode[];
  changeLanguage: (lang: LangCode) => Promise<void>;
};

const LanguageContext = createContext<LanguageContextValue | undefined>(
  undefined
);

async function readSuggestionTarget(appLang: LangCode): Promise<LangCode> {
  if (isRegionalLanguage(appLang)) return appLang;
  const last = await AsyncStorage.getItem(REGIONAL_LANG_KEY);
  if (last && isRegionalLanguage(last as LangCode)) return last as LangCode;
  return "ta";
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<LangCode>("en");
  const [suggestionTargetLanguage, setSuggestionTargetLanguage] =
    useState<LangCode>("ta");
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
        const suggestionTarget = await readSuggestionTarget(next);
        if (!cancelled) {
          setLanguage(next);
          setSuggestionTargetLanguage(suggestionTarget);
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
    if (isRegionalLanguage(lang)) {
      setSuggestionTargetLanguage(lang);
      await AsyncStorage.setItem(REGIONAL_LANG_KEY, lang);
    } else {
      setSuggestionTargetLanguage(await readSuggestionTarget(lang));
    }
  }, []);

  const value = useMemo(
    () => ({
      language,
      suggestionTargetLanguage,
      supportedLanguages: SUPPORTED,
      changeLanguage,
    }),
    [language, suggestionTargetLanguage, changeLanguage]
  );

  if (!hydrated) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#c2185b" />
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
