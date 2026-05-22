/**
 * Smoke test: Dashboard summary + detail APIs.
 * Usage: TEST_USER=... TEST_PASS=... node scripts/test-dashboard.mjs
 */
import axios from "axios";

const BASE = "https://successapi.azurewebsites.net/api/";
const USER = process.env.TEST_USER;
const PASS = process.env.TEST_PASS;

async function login() {
  const check = await axios.get(
    `${BASE}Auth/UserAccountCheck?userName=${encodeURIComponent(USER)}&appName=MOI`
  );
  const types = check.data?.data ?? [];
  if (!types.length) throw new Error("No user found");
  const ut = types[0];
  const res = await axios.post(`${BASE}Auth/UserLogin`, {
    username: USER.trim(),
    password: PASS,
    userType: ut.userType,
    userTypeDescription: ut.userTypeDescription,
  });
  if (!res.data?.result) throw new Error(res.data?.message ?? "login failed");
  return { user: res.data.data, headers: { Authorization: `Bearer ${res.data.data.token}` } };
}

async function main() {
  if (!USER || !PASS) {
    console.error("Set TEST_USER and TEST_PASS");
    process.exit(1);
  }

  const { user, headers } = await login();
  const params = {
    customer_id: user.customerID,
    function_id: user.functionId || 0,
    user_type: user.userType,
    userId: user.id,
  };

  const summary = await axios.get(`${BASE}Transaction/GetDashboard`, { params, headers });
  console.log("SUMMARY:", summary.data?.result, summary.data?.data);
  if (!summary.data?.result) process.exit(1);

  const detail = await axios.get(`${BASE}Transaction/GetDashboardDetail`, {
    params,
    headers,
  });
  console.log(
    "DETAIL:",
    detail.data?.result,
    "rows:",
    Array.isArray(detail.data?.data) ? detail.data.data.length : 0
  );
  if (!detail.data?.result) process.exit(1);
  console.log("OK");
}

main().catch((e) => {
  console.error(e.response?.data ?? e.message);
  process.exit(1);
});
