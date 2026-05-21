/**
 * Quick API smoke test (login + function list). Run: node scripts/test-api.mjs
 * Credentials passed via env vars only — not stored in repo.
 */
import axios from "axios";

const BASE = "https://successapi.azurewebsites.net/api/";
const USER = process.env.TEST_USER;
const PASS = process.env.TEST_PASS;

if (!USER || !PASS) {
  console.error("Set TEST_USER and TEST_PASS env vars");
  process.exit(1);
}

async function main() {
  console.log("1. Account check...");
  const check = await axios.get(
    `${BASE}Auth/UserAccountCheck?userName=${encodeURIComponent(USER)}&appName=MOI`
  );
  const types = check.data?.data ?? [];
  console.log("   result:", check.data?.result, "types:", types.length);
  if (!types.length) {
    console.error("   No user found");
    process.exit(1);
  }
  const userType = types[0].userType;
  const userTypeDescription = types[0].userTypeDescription;
  console.log("   userType:", userType, userTypeDescription);

  console.log("2. Login...");
  const login = await axios.post(`${BASE}Auth/UserLogin`, {
    username: USER.trim(),
    password: PASS,
    userType,
    userTypeDescription,
  });
  if (!login.data?.result || !login.data?.data?.token) {
    console.error("   Login failed:", login.data?.message);
    process.exit(1);
  }
  const user = login.data.data;
  console.log("   OK — name:", user.name ?? user.userName, "role:", user.userType);
  console.log("   customerID:", user.customerID, "functionId:", user.functionId);

  const token = user.token;
  const headers = { Authorization: `Bearer ${token}` };

  if (user.userType === "SU" || user.userType === "AU") {
    console.log("3. Function list (Master/GetFunction)...");
    const list = await axios.get(`${BASE}Master/GetFunction`, {
      params: {
        id: "",
        customer_id: user.customerID,
        function_name: "",
        current_page: 1,
        page_size: 5,
      },
      headers,
    });
    const fns = list.data?.data?.functions ?? [];
    console.log("   result:", list.data?.result, "count:", fns.length);
    if (fns[0]) {
      console.log("   sample:", fns[0].functionName, fns[0].mahalName);
    }
  } else {
    console.log("3. Skip function list — role", user.userType, "(needs SU/AU)");
  }

  console.log("\nAll API checks passed.");
}

main().catch((e) => {
  console.error("Error:", e.response?.data?.message ?? e.message);
  process.exit(1);
});
