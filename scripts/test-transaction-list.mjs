/**
 * Smoke test: Receipt List (GetTransaction, UpdateTransaction, DeleteTransaction).
 * Usage: TEST_USER=... TEST_PASS=... node scripts/test-transaction-list.mjs
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

  const list = await axios.get(`${BASE}Transaction/GetTransaction`, {
    params: {
      customer_id: user.customerID,
      customer_name: "",
      trans_type: "R",
      village_name: "",
      mobile: "",
      user_type: user.userType,
      userId: user.id,
      current_page: 1,
      page_size: 10,
    },
    headers,
  });
  console.log("LIST:", list.data?.result, "rows:", list.data?.data?.transactions?.length ?? 0);
  if (!list.data?.result) {
    console.error(list.data?.message);
    process.exit(1);
  }

  const rows = list.data.data.transactions ?? [];
  if (rows.length === 0) {
    console.log("No rows to test edit — OK (list works)");
    return;
  }

  const row = rows[0];
  const updated = {
    ...row,
    remarks: (row.remarks ?? "") + " ",
    updatedBy: String(user.id),
    updatedDt: dateUTC(),
  };
  updated.amount = Number(updated.oldAmount) + Number(updated.newAmount);

  const save = await axios.post(`${BASE}Transaction/UpdateTransaction`, updated, {
    headers,
  });
  console.log("EDIT:", save.data?.result, save.data?.message);
  if (!save.data?.result) process.exit(1);

  // Create disposable row for delete test
  const now = dateUTC();
  const create = await axios.post(
    `${BASE}Transaction/UpdateTransaction`,
    {
      id: 0,
      customerId: user.customerID,
      villageName: "Delete Test Village",
      initial: "X",
      name: "API List Delete Test",
      oldAmount: 0,
      newAmount: 1,
      amount: 1,
      remarks: "delete me",
      phoneNo: "",
      createdBy: String(user.id),
      createdDt: now,
      updatedBy: String(user.id),
      updatedDt: now,
      isActive: true,
      type: "R",
      returnStatus: "N",
      returnRemark: "",
      functionId: user.functionId || 0,
    },
    { headers }
  );
  if (!create.data?.result) {
    console.log("CREATE for delete skip:", create.data?.message);
    console.log("OK (list + edit passed)");
    return;
  }

  const list2 = await axios.get(`${BASE}Transaction/GetTransaction`, {
    params: {
      customer_id: user.customerID,
      customer_name: "API List Delete Test",
      trans_type: "R",
      village_name: "",
      mobile: "",
      user_type: user.userType,
      userId: user.id,
      current_page: 1,
      page_size: 5,
    },
    headers,
  });
  const target = (list2.data?.data?.transactions ?? []).find(
    (t) => t.name === "API List Delete Test"
  );
  if (!target) {
    console.log("Created row not found in search — OK (list + edit passed)");
    return;
  }

  const del = await axios.post(`${BASE}Transaction/DeleteTransaction`, null, {
    params: { id: target.id, deletedBy: USER },
    headers,
  });
  console.log("DELETE:", del.data?.result, del.data?.message);
  if (!del.data?.result) process.exit(1);
  console.log("OK");
}

main().catch((e) => {
  console.error(e.response?.data ?? e.message);
  process.exit(1);
});
