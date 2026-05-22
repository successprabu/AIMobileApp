/**
 * Verifies session functionId update wiring.
 * Run: node scripts/test-session-function-id.mjs
 */
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const dir = dirname(fileURLToPath(import.meta.url));
const read = (p) => readFileSync(join(dir, p), "utf8");

const auth = read("../src/context/AuthContext.tsx");
const fn = read("../src/screens/FunctionMasterScreen.tsx");
const receipt = read("../src/screens/NewReceiptScreen.tsx");
const util = read("../src/utils/functionSession.ts");

const checks = [
  [auth.includes("updateUser"), "AuthContext exposes updateUser"],
  [fn.includes("updateUser({ functionId:"), "Function master updates session"],
  [fn.includes("resolveFunctionIdAfterSave"), "resolve id after save"],
  [receipt.includes("useSessionFunctionId"), "receipt uses session functionId"],
  [receipt.includes("useSyncFormFunctionId"), "receipt syncs form functionId"],
  [util.includes("fetchCustomerFunctions"), "fetch functions helper"],
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
console.log("Session functionId checks passed");
