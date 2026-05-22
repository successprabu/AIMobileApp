/**
 * Smoke checks for login keyboard handling.
 * Run: node scripts/test-login-keyboard.mjs
 */
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const dir = dirname(fileURLToPath(import.meta.url));
const login = readFileSync(join(dir, "../src/screens/LoginScreen.tsx"), "utf8");
const hook = readFileSync(join(dir, "../src/hooks/useKeyboardAwareScroll.ts"), "utf8");
const app = readFileSync(join(dir, "../app.json"), "utf8");

const checks = [
  [login.includes("useKeyboardAwareScroll"), "login uses keyboard scroll hook"],
  [login.includes('setFieldAnchorRef("password")'), "password field anchor"],
  [login.includes("onFocus={() => onFieldFocus(\"password\")}"), "password focus scroll"],
  [login.includes('behavior={Platform.OS === "ios" ? "padding" : "height"}'), "KAV height on Android"],
  [login.includes("forceTextInputFocus={false}"), "eye icon does not steal focus"],
  [hook.includes("measureInWindow"), "measureInWindow scroll"],
  [app.includes('"softwareKeyboardLayoutMode": "resize"'), "Android resize keyboard mode"],
];

let failed = 0;
for (const [ok, label] of checks) {
  if (!ok) {
    console.error("FAIL:", label);
    failed++;
  } else {
    console.log("OK:", label);
  }
}
if (failed) process.exit(1);
console.log("Login keyboard checks passed");
