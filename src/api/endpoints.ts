/**
 * Same URL layout as web `CommonApiURL.js` (API unchanged).
 */
const rawBase =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  "https://successapi.azurewebsites.net/api/";

export const BASE_URL = rawBase.endsWith("/") ? rawBase : `${rawBase}/`;

const AUTH = "Auth/";

export const LOGIN_API = `${BASE_URL}${AUTH}UserLogin`;
export const LOGIN_USER_ACCOUNT_CHECK_API = `${BASE_URL}${AUTH}UserAccountCheck?`;

/** Relative to BASE_URL for authenticated GET/POST (matches web CommonMethod). */
export const PATHS = {
  TRANSACTION: "Transaction/",
  REPORT: "Report/",
  DASHBOARD_SUMMARY: "Transaction/GetDashboard?",
  DASHBOARD_DETAIL: "Transaction/GetDashboardDetail?",
  REPORT_TRANSACTION: "Report/GetTransactionReport?",
  REPORT_ALL: "Report/GetAllTransaction?",
  REPORT_REGIONAL: "Report/GetRegionalSummaryReport?",
  REPORT_OVERALL: "Report/GetOverallSummaryReport?",
  REPORT_OTHERS_SUMMARY: "Report/GetOthersSummaryReport?",
  MASTER_SAVE_FUNCTION: "Master/UpdateCustomerFunction",
  MASTER_LIST_FUNCTION: "Master/GetFunction",
  AUTH_ADD_CUSTOMER: "Auth/AddCustomer",
  MASTER_UPDATE_CUSTOMER: "Master/UpdateCustomer",
  MASTER_LIST_CUSTOMERS: "Master/GetCustomer",
  SAVE_TRANSACTION: "Transaction/UpdateTransaction",
} as const;
