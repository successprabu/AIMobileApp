import type { AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { jwtDecode } from "jwt-decode";
import { BASE_URL } from "./endpoints";
import { getStoredUserJson, setStoredUserJson } from "../storage/userStorage";

/**
 * Sign-in session: a 30-minute access token renewed in the background with a 30-day refresh token. Each renewal
 * gives a new refresh token and the old one stops working. Logins from before refresh tokens last until their
 * token expires.
 */
type Stored = { token?: string; refreshToken?: string; refreshExpires?: string };

const read = async (): Promise<Stored | null> => {
  try {
    const raw = await getStoredUserJson();
    return raw ? (JSON.parse(raw) as Stored) : null;
  } catch {
    return null;
  }
};

export const tokenExpiry = (token?: string): number => {
  if (!token) return 0;
  try {
    const exp = jwtDecode<{ exp?: number }>(token).exp;
    return exp ? exp * 1000 : 0;
  } catch {
    return 0;
  }
};

/** When this sign-in ends: the refresh token's end when there is one, else the access token's. */
export const sessionEndsAt = (u: Stored | null | undefined): number => {
  if (!u?.token) return 0;
  if (u.refreshToken && u.refreshExpires) {
    const s = u.refreshExpires.endsWith("Z") ? u.refreshExpires : `${u.refreshExpires}Z`;
    const t = Date.parse(s);
    if (!Number.isNaN(t)) return t;
  }
  return tokenExpiry(u.token);
};

let renewed: ((patch: { token: string; refreshToken: string; refreshExpires: string }) => void) | null = null;
/** AuthContext listens, so the signed-in user in memory carries the new token too. */
export const onSessionRenewed = (fn: typeof renewed) => {
  renewed = fn;
};

let pending: Promise<string | null> | null = null;
/** New access token from the refresh token (one request at a time). null: the sign-in is over or offline. */
export const refreshSession = (): Promise<string | null> => {
  if (pending) return pending;
  pending = (async () => {
    const u = await read();
    if (!u?.refreshToken) return null;
    try {
      const r = await fetch(`${BASE_URL}Auth/Refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: u.refreshToken }),
      });
      const body = (await r.json().catch(() => null)) as { result?: boolean; data?: { token: string; refreshToken: string; refreshExpires: string } } | null;
      if (!r.ok || !body?.result || !body.data?.token) return r.status === 401 ? "" : null;
      const latest = (await read()) ?? u;
      await setStoredUserJson(JSON.stringify({ ...latest, ...body.data }));
      renewed?.(body.data);
      return body.data.token;
    } catch {
      return null;
    }
  })().finally(() => {
    pending = null;
  });
  return pending;
};

/** Tells the API this phone signed out (its refresh token stops working). Never throws. */
export const revokeSession = async (): Promise<void> => {
  const u = await read();
  if (!u?.refreshToken) return;
  try {
    await fetch(`${BASE_URL}Auth/Logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: u.refreshToken }),
    });
  } catch {
    /* offline: the token still expires by itself */
  }
};

const bearer = (h: unknown) => {
  const headers = (h ?? {}) as Record<string, unknown> & { set?: (k: string, v: string) => void };
  return /^Bearer\s+\S+/.test(String(headers.Authorization ?? headers.authorization ?? ""));
};
const setBearer = (h: unknown, token: string) => {
  const headers = h as Record<string, unknown> & { set?: (k: string, v: string) => void };
  if (typeof headers.set === "function") headers.set("Authorization", `Bearer ${token}`);
  else headers.Authorization = `Bearer ${token}`;
};

/**
 * Every API call uses axios: a token about to expire is renewed before a signed-in call; a 401 is retried once
 * after renewing; when renewing is refused, onEnded signs the user out. Returns a function that removes these.
 */
export const installSessionInterceptors = (client: AxiosInstance, onEnded: () => void): (() => void) => {
  const req = client.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
    if (!bearer(config.headers)) return config;
    const u = await read();
    if (u?.refreshToken && tokenExpiry(u.token) - Date.now() < 60000) {
      const token = await refreshSession();
      if (token) setBearer(config.headers, token);
    }
    return config;
  });
  const res = client.interceptors.response.use(
    (response) => response,
    async (error) => {
      const config = error?.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
      if (error?.response?.status === 401 && config && bearer(config.headers)) {
        const u = await read();
        if (!config._retried && u?.refreshToken) {
          config._retried = true;
          const token = await refreshSession();
          if (token) {
            setBearer(config.headers, token);
            return client(config);
          }
        }
        onEnded();
      }
      return Promise.reject(error);
    }
  );
  return () => {
    client.interceptors.request.eject(req);
    client.interceptors.response.eject(res);
  };
};
