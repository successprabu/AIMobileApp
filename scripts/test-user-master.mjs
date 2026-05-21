/**
 * Smoke test: User Master list, create, update.
 * Usage: TEST_USER=... TEST_PASS=... node scripts/test-user-master.mjs
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
  const now = dateUTC();
  const phone = `99${String(Date.now()).slice(-8)}`;

  const list1 = await axios.get(`${BASE}Master/GetCustomer`, {
    params: { customer_id: user.customerID, function_name: "", current_page: 1, page_size: 50 },
    headers,
  });
  const count1 = list1.data?.data?.customers?.length ?? 0;
  console.log("LIST before:", count1);

  const save = await axios.post(
    `${BASE}Auth/AddCustomer`,
    {
      id: 0,
      customerId: user.customerID,
      functionId: user.functionId || 0,
      name: "API User Test",
      primary_phone: phone,
      secondary_phone: "",
      email: "",
      country: "",
      state: "",
      district: "",
      address_line1: "",
      address_line2: "",
      is_primary_phone_whatsup: true,
      is_secondary_phone_whatsup: false,
      pincode: 0,
      password: "Test@1234",
      conpassword: "Test@1234",
      userType: "NU",
      createdBy: String(user.id),
      createdDt: now,
      updatedBy: String(user.id),
      updatedDt: now,
      updateddBy: "SYSTEM",
      isActive: true,
    },
    { headers }
  );
  console.log("CREATE:", save.data?.result, save.data?.message);
  if (!save.data?.result) process.exit(1);

  const list2 = await axios.get(`${BASE}Master/GetCustomer`, {
    params: { customer_id: user.customerID, function_name: "", current_page: 1, page_size: 50 },
    headers,
  });
  const created = list2.data?.data?.customers?.find((c) => c.primary_phone === phone);
  if (!created) {
    console.error("FAIL: created user not in list");
    process.exit(1);
  }
  console.log("LIST after create: found id", created.id);

  const upd = await axios.post(
    `${BASE}Master/UpdateCustomer`,
    {
      ...created,
      name: "API User Test Updated",
      password: created.password,
      conpassword: created.password,
      updatedBy: String(user.id),
      updatedDt: dateUTC(),
      updateddBy: "SYSTEM",
    },
    { headers }
  );
  console.log("UPDATE:", upd.data?.result, upd.data?.message);
  if (!upd.data?.result) process.exit(1);

  console.log("PASS — user master list, create, update OK");
}

main().catch((e) => {
  console.error("FAIL:", e.response?.data ?? e.message);
  process.exit(1);
});
