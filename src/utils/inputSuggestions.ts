import type { LangCode } from "../context/LanguageContext";

const SUPPORTED = new Set<LangCode>(["ta", "hi", "ml", "te", "kn"]);

/** Google Input Tools transliteration (same API as web Transaction.js). */
export async function fetchTransliterationSuggestions(
  text: string,
  lang: LangCode
): Promise<string[]> {
  if (!text.trim() || !SUPPORTED.has(lang)) return [];

  try {
    const itc = `${lang}-t-i0-und`;
    const url = `https://inputtools.google.com/request?text=${encodeURIComponent(text)}&itc=${itc}&num=5`;
    const response = await fetch(url);
    const data = (await response.json()) as unknown;

    if (
      data &&
      Array.isArray(data) &&
      Array.isArray(data[1]) &&
      data[1][0] &&
      Array.isArray((data[1][0] as unknown[])[1])
    ) {
      return (data[1][0] as [unknown, string[]])[1];
    }
  } catch {
    // Caller shows toast
  }
  return [];
}

export function isSuggestionLanguage(lang: LangCode): boolean {
  return SUPPORTED.has(lang);
}
