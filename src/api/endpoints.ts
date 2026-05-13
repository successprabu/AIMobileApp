/**
 * Same API paths as the web app (`src/components/common/CommonApiURL.js`).
 * Override base URL with EXPO_PUBLIC_API_BASE_URL (no backend changes required).
 */
const rawBase =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  "https://successapi.azurewebsites.net/api/";

export const BASE_URL = rawBase.endsWith("/") ? rawBase : `${rawBase}/`;

const AUTH = "Auth/";

export const LOGIN_API = `${BASE_URL}${AUTH}UserLogin`;
export const LOGIN_USER_ACCOUNT_CHECK_API = `${BASE_URL}${AUTH}UserAccountCheck?`;
