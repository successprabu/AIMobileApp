import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";
import en from "./locales/en.json";
import ta from "./locales/ta.json";
import ml from "./locales/ml.json";
import te from "./locales/te.json";
import kn from "./locales/kn.json";
import hi from "./locales/hi.json";

const resources = {
  en: { translation: en },
  ta: { translation: ta },
  ml: { translation: ml },
  te: { translation: te },
  kn: { translation: kn },
  hi: { translation: hi },
} as const;

const deviceCode = Localization.getLocales()[0]?.languageCode ?? "en";
const deviceLng = deviceCode in resources ? deviceCode : "en";

void i18n.use(initReactI18next).init({
  resources,
  lng: deviceLng,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
  compatibilityJSON: "v4",
});

export default i18n;
