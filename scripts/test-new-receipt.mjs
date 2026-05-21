/**
 * Smoke test: New Receipt save (Transaction/UpdateTransaction).
 * Usage: TEST_USER=... TEST_PASS=... node scripts/test-new-receipt.mjs
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
  const ut = check.data.data[0];
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
  if (!user.functionId) {
    console.error("User has no functionId — create a function first");
    process.exit(1);
  }

  const now = dateUTC();
  const payload = {
    id: 0,
    customerId: user.customerID,
    villageName: "Test Village Mobile",
    initial: "T",
    name: "API Receipt Test",
    oldAmount: 0,
    newAmount: 100,
    amount: 100,
    remarks: "mobile smoke test",
    phoneNo: "",
    createdBy: String(user.id),
    createdDt: now,
    updatedBy: String(user.id),
    updatedDt: now,
    isActive: true,
    type: "R",
    returnStatus: "N",
    returnRemark: "",
    functionId: user.functionId,
  };

  const save = await axios.post(`${BASE}Transaction/UpdateTransaction`, payload, {
    headers,
  });
  console.log("SAVE:", save.data?.result, save.data?.message);
  if (save.data?.data?.transaction) {
    console.log("Last:", save.data.data.transaction.name, save.data.data.transaction.amount);
  }
  if (!save.data?.result) process.exit(1);
  console.log("OK");
}

main().catch((e) => {
  console.error(e.response?.data ?? e.message);
  process.exit(1);
});
