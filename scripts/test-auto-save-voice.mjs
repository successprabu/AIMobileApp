/**
 * Unit checks for auto-save voice command detection (no API).
 * Run: node scripts/test-auto-save-voice.mjs
 */

function isVoiceSaveCommand(transcript) {
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

const cases = [
  ["OK", true],
  ["okay.", true],
  ["save", true],
  ["please save now", true],
  ["village name", false],
  ["", false],
  ["1000", false],
];

let failed = 0;
for (const [input, expected] of cases) {
  const got = isVoiceSaveCommand(input);
  if (got !== expected) {
    console.error(`FAIL: "${input}" expected ${expected}, got ${got}`);
    failed++;
  }
}

if (failed) {
  process.exit(1);
}
console.log(`All ${cases.length} voice save command tests passed.`);
