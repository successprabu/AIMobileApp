import type { LangCode } from "../context/LanguageContext";

const TRANSLITERATION_LANGS = new Set<LangCode>(["ta", "hi", "ml", "te", "kn"]);

/** Languages that support Google Input Tools transliteration (Roman → native script). */
export function isSuggestionLanguage(lang: LangCode): boolean {
  return TRANSLITERATION_LANGS.has(lang);
}

/** True when app UI is English but we still have a regional target for suggestions. */
export function canUseSuggestions(
  suggestionTargetLanguage: LangCode
): boolean {
  return isSuggestionLanguage(suggestionTargetLanguage);
}

function uniqueUpTo(items: string[], max: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const t = item.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= max) break;
  }
  return out;
}

/** Google Input Tools: Roman/English typing → native script options (web Transaction.js). */
export async function fetchTransliterationSuggestions(
  text: string,
  lang: LangCode
): Promise<string[]> {
  if (!text.trim() || !TRANSLITERATION_LANGS.has(lang)) return [];

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
    // ignore
  }
  return [];
}

/**
 * Suggestions for text fields: type in English (Roman letters) → up to 5 options
 * in the regional language chosen in the app menu.
 */
export async function fetchInputSuggestions(
  text: string,
  suggestionTargetLanguage: LangCode
): Promise<string[]> {
  if (!text.trim() || !isSuggestionLanguage(suggestionTargetLanguage)) {
    return [];
  }

  const transliterated = await fetchTransliterationSuggestions(
    text,
    suggestionTargetLanguage
  );

  // (English → regional translation was removed: it needed a Google key inside the app, where anyone could read it.)
  return uniqueUpTo(transliterated, 5);
}
