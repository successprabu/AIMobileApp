/**
 * Smoke test: Add Others (Transaction/UpdateTransaction type O).
 * Usage: TEST_USER=... TEST_PASS=... node scripts/test-add-others.mjs
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
    console.error("User has no functionId");
    process.exit(1);
  }

  const now = dateUTC();
  const payload = {
    id: 0,
    customerId: user.customerID,
    villageName: "Test Village Others",
    initial: "K",
    name: "API Others Test",
    oldAmount: 0,
    newAmount: 0,
    amount: 100,
    remarks: "remarks",
    phoneNo: "",
    createdBy: String(user.id),
    createdDt: now,
    updatedBy: String(user.id),
    updatedDt: now,
    isActive: true,
    type: "O",
    returnStatus: "N",
    returnRemark: "",
    functionId: user.functionId,
    others: 500,
    othersType: "ring",
    othersRemark: "gold ring",
  };

  const save = await axios.post(`${BASE}Transaction/UpdateTransaction`, payload, {
    headers,
  });
  console.log("SAVE:", save.data?.result, save.data?.message);
  if (!save.data?.result) process.exit(1);

  const list = await axios.get(`${BASE}Transaction/GetTransaction`, {
    params: {
      customer_id: user.customerID,
      customer_name: "API Others Test",
      trans_type: "O",
      village_name: "",
      mobile: "",
      user_type: user.userType,
      userId: user.id,
      current_page: 1,
      page_size: 10,
    },
    headers,
  });
  const found = (list.data?.data?.transactions ?? []).some(
    (t) => t.name === "API Others Test" && t.othersType === "ring"
  );
  console.log("LIST:", list.data?.result, "found:", found);
  if (!found) process.exit(1);
  console.log("OK");
}

main().catch((e) => {
  console.error(e.response?.data ?? e.message);
  process.exit(1);
});
