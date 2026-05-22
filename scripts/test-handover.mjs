/**
 * Smoke test: Handover reports + UpdateHandover.
 * Usage: TEST_USER=... TEST_PASS=... node scripts/test-handover.mjs
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

function calculateOverallTotals(data) {
  const userTotals = data.reduce((acc, item) => {
    const key = item.createdBy;
    if (!acc[key]) {
      acc[key] = { receipt: 0, expense: 0, others: 0, createdById: item.createdById };
    }
    if (item.type === "R") acc[key].receipt += item.total;
    else if (item.type === "E") acc[key].expense += item.total;
    else if (item.type === "O") acc[key].others += item.total;
    acc[key].createdById = item.createdById;
    return acc;
  }, {});
  return Object.entries(userTotals).map(([username, totals]) => ({
    userId: totals.createdById,
    username,
    ...totals,
    total: totals.receipt + totals.others - totals.expense,
  }));
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
  };

  const overall = await axios.get(`${BASE}Report/GetOverallSummaryReport`, {
    params,
    headers,
  });
  console.log("OVERALL:", overall.data?.result, "rows:", overall.data?.data?.length ?? 0);
  if (!overall.data?.result) {
    console.error(overall.data?.message);
    process.exit(1);
  }

  const others = await axios.get(`${BASE}Report/GetOthersSummaryReport`, {
    params,
    headers,
  });
  console.log("OTHERS:", others.data?.result, "rows:", others.data?.data?.length ?? 0);
  if (!others.data?.result) {
    console.error(others.data?.message);
    process.exit(1);
  }

  const rows = calculateOverallTotals(overall.data.data ?? []);
  if (rows.length === 0) {
    console.log("No handover rows to save — reports OK");
    return;
  }

  const row = rows[0];
  const totalRcdAmount = row.receipt === 0 ? row.others : row.receipt;
  const now = dateUTC();
  const payload = {
    id: 0,
    customerId: user.customerID,
    functionId: user.functionId || 0,
    handoverBy: Number(row.userId),
    receivedBy: "API Handover Test",
    receivedByMoible: "9000000001",
    totalRcdAmount,
    handoverAmount: totalRcdAmount,
    differnceAmount: 0,
    remarks: "handover smoke test",
    createdBy: String(user.id),
    createdDt: now,
    updatedBy: String(user.id),
    updatedDt: now,
    isActive: true,
    status: 1,
  };

  const save = await axios.post(`${BASE}Transaction/UpdateHandover`, payload, {
    headers,
  });
  console.log("SAVE:", save.data?.result, save.data?.message);
  if (!save.data?.result) process.exit(1);
  console.log("OK");
}

main().catch((e) => {
  console.error(e.response?.data ?? e.message);
  process.exit(1);
});
