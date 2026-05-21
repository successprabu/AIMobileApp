import type { LangCode } from "../context/LanguageContext";

/** Maps app language to device speech recognition locale (web + regional languages). */
export function speechLocaleForLanguage(lang: LangCode): string {
  const map: Record<LangCode, string> = {
    en: "en-US",
    ta: "ta-IN",
    hi: "hi-IN",
    ml: "ml-IN",
    te: "te-IN",
    kn: "kn-IN",
  };
  return map[lang] ?? "en-US";
}
