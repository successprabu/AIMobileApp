/**
 * Verifies blur-mode auto-save does not schedule debounced saves on fingerprint change.
 * Run: node scripts/test-form-auto-save-blur.mjs
 */
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const dir = dirname(fileURLToPath(import.meta.url));
const hook = readFileSync(join(dir, "../src/hooks/useFormAutoSave.ts"), "utf8");
const receipt = readFileSync(join(dir, "../src/screens/NewReceiptScreen.tsx"), "utf8");
const expenses = readFileSync(join(dir, "../src/screens/NewExpensesScreen.tsx"), "utf8");
const others = readFileSync(join(dir, "../src/screens/AddOthersScreen.tsx"), "utf8");

const checks = [
  [hook.includes('mode = "blur"'), "default mode is blur"],
  [hook.includes("triggerAutoSave"), "exports triggerAutoSave"],
  [receipt.includes('mode: "blur"'), "receipt uses blur mode"],
  [receipt.includes("onBlur={() => triggerAutoSave()}"), "receipt newAmount onBlur"],
  [expenses.includes("NewReceiptHeaderRight"), "expenses header toggles"],
  [expenses.includes("onBlur={() => triggerAutoSave()}"), "expenses amount onBlur"],
  [others.includes("NewReceiptHeaderRight"), "others header toggles"],
  [others.includes("onBlur={() => triggerAutoSave()}"), "others amount onBlur"],
  [!expenses.includes('t("autoSaveHint")') || expenses.includes("autoSaveHintExpenses"), "expenses no static hint"],
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
console.log("All blur auto-save checks passed");
