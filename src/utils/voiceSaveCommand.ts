/** Recognize voice intent to save (e.g. user says "OK" after filling the form). */
export function isVoiceSaveCommand(transcript: string): boolean {
  const normalized = transcript
    .trim()
    .toLowerCase()
    .replace(/[.,!?'"]/g, "")
    .replace(/\s+/g, " ");

  if (!normalized) return false;

  const exact = new Set([
    "ok",
    "okay",
    "ok ok",
    "save",
    "save now",
    "submit",
    "done",
    "confirm",
  ]);

  if (exact.has(normalized)) return true;

  return (
    normalized.endsWith(" ok") ||
    normalized.startsWith("ok ") ||
    normalized.includes("save it") ||
    normalized.includes("save now")
  );
}
