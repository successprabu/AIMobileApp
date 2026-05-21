/**
 * Smoke test: login + list + save function master.
 * Usage: TEST_USER=... TEST_PASS=... node scripts/test-function-master.mjs
 */
import axios from "axios";

const BASE = "https://successapi.azurewebsites.net/api/";
const USER = process.env.TEST_USER;
const PASS = process.env.TEST_PASS;

const dateUTC = (d = new Date()) =>
  new Date(new Date(d).toUTCString()).toISOString();

async function main() {
  if (!USER || !PASS) {
    console.error("Set TEST_USER and TEST_PASS");
    process.exit(1);
  }

  const check = await axios.get(
    `${BASE}Auth/UserAccountCheck?userName=${encodeURIComponent(USER)}&appName=MOI`
  );
  const ut = check.data.data[0];
  const login = await axios.post(`${BASE}Auth/UserLogin`, {
    username: USER.trim(),
    password: PASS,
    userType: ut.userType,
    userTypeDescription: ut.userTypeDescription,
  });
  if (!login.data?.result) throw new Error(login.data?.message ?? "login failed");

  const u = login.data.data;
  const headers = { Authorization: `Bearer ${u.token}` };
  const now = dateUTC();
  const today = new Date().toISOString().slice(0, 10);

  const save = await axios.post(
    `${BASE}Master/UpdateCustomerFunction`,
    {
      id: 0,
      customerId: u.customerID,
      functionName: `AutoTest ${Date.now() % 100000}`,
      functionDate: today,
      mahalName: "Auto Mahal",
      funPersionNames: "Auto Person",
      remarks: "automated test",
      funMessage: "",
      createdBy: String(u.id),
      createdDt: now,
      updatedBy: String(u.id),
      updatedDt: now,
      isActive: true,
    },
    { headers }
  );

  console.log("SAVE result:", save.data?.result, save.data?.message);
  if (!save.data?.result) process.exit(1);

  const list = await axios.get(`${BASE}Master/GetFunction`, {
    params: {
      customer_id: u.customerID,
      function_name: "",
      current_page: 1,
      page_size: 20,
    },
    headers,
  });
  const count = list.data?.data?.functions?.length ?? 0;
  console.log("LIST count:", count);
  console.log("PASS — function master save + list OK");
}

main().catch((e) => {
  console.error("FAIL:", e.response?.data ?? e.message);
  process.exit(1);
});
