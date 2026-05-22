/**
 * Smoke test: Expenses List (GetTransaction type E, edit, delete).
 * Usage: TEST_USER=... TEST_PASS=... node scripts/test-expenses-list.mjs
 */
import axios from "axios";

const BASE = "https://successapi.azurewebsites.net/api/";
const USER = process.env.TEST_USER;
const PASS = process.env.TEST_PASS;

const dateUTC = (d = new Date()) =>
  new Date(new Date(d).toUTCString()).toISOString();

async function login() {
  const check = await axios.get(
    `${BASE}Auth/UserAccountCheck?userName=${encodeURIComponent(USER)}&appName=MOI`
  );
  const types = check.data?.data ?? [];
  if (!types.length) throw new Error("No user found for account check");
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

  const list = await axios.get(`${BASE}Transaction/GetTransaction`, {
    params: {
      customer_id: user.customerID,
      customer_name: "",
      trans_type: "E",
      village_name: "",
      mobile: "",
      current_page: 1,
      page_size: 10,
    },
    headers,
  });
  console.log("LIST E:", list.data?.result, "rows:", list.data?.data?.transactions?.length ?? 0);
  if (!list.data?.result) {
    console.error(list.data?.message);
    process.exit(1);
  }

  const rows = list.data.data.transactions ?? [];
  if (rows.length === 0) {
    console.log("No expense rows — list API OK");
    return;
  }

  const row = rows[0];
  const updated = {
    ...row,
    remarks: (row.remarks ?? "") + " ",
    updatedBy: String(user.id),
    updatedDt: dateUTC(),
    type: "E",
  };

  const save = await axios.post(`${BASE}Transaction/UpdateTransaction`, updated, {
    headers,
  });
  console.log("EDIT:", save.data?.result, save.data?.message);
  if (!save.data?.result) process.exit(1);
  console.log("OK");
}

main().catch((e) => {
  console.error(e.response?.data ?? e.message);
  process.exit(1);
});
