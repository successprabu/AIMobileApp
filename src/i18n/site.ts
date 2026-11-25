import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import ta from "./site/ta.json";
import hi from "./site/hi.json";
import te from "./site/te.json";
import kn from "./site/kn.json";
import ml from "./site/ml.json";

/**
 * Sentence dictionary shared with the website (Account_UI src/language/site/*.json): the English sentence is the key.
 * Use it for Mahal screens: const tx = useTx(); tx("Add expense"). Anything not in the dictionary shows in English.
 * When the website adds sentences, copy its site/*.json files here again.
 */
const SITE_TEXT: Record<string, Record<string, string>> = { ta, hi, te, kn, ml };

type Vars = Record<string, string | number | null | undefined>;
const fill = (s: string, vars?: Vars) =>
  vars ? s.replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k: string) => (vars[k] == null ? m : String(vars[k]))) : s;

/** Translate one English sentence into a language code (en, ta, hi, te, kn, ml). */
export const siteText = (lang: string, text: string, vars?: Vars) => {
  const core = text.trim();
  const hit = SITE_TEXT[lang]?.[core];
  return fill(hit ? text.replace(core, hit) : text, vars);
};

/** Hook: re-renders when the app language changes. */
export const useTx = () => {
  const { i18n } = useTranslation();
  const lang = (i18n.resolvedLanguage || i18n.language || "en").slice(0, 2);
  return useCallback((text: string, vars?: Vars) => siteText(lang, text, vars), [lang]);
};

/** "ta" when the app is in Tamil, else "en": the language of customer WhatsApp messages. */
export const useMessageLang = (): "ta" | "en" => {
  const { i18n } = useTranslation();
  return (i18n.resolvedLanguage || i18n.language || "en").startsWith("ta") ? "ta" : "en";
};
