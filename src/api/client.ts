import axios from "axios";
import { BASE_URL } from "./endpoints";
import { getStoredUserJson } from "../storage/userStorage";

function dateUTC(date = new Date()) {
  return new Date(new Date(date).toUTCString()).toISOString();
}

async function getAuthHeaders() {
  const raw = await getStoredUserJson();
  const token = raw ? (JSON.parse(raw) as { token?: string }).token ?? "" : "";
  return token ? { Authorization: `Bearer ${token}` } : undefined;
}

export async function authGet<T = unknown>(
  path: string,
  params?: Record<string, string | number | undefined | null>
): Promise<T> {
  const { data } = await axios.get<T>(`${BASE_URL}${path}`, {
    params: params ?? undefined,
    headers: await getAuthHeaders(),
  });
  return data;
}

/** POST with same common fields as web `CommonMethod.post`. */
export async function authPost<T = unknown>(
  path: string,
  payload: Record<string, unknown>
): Promise<T> {
  const raw = await getStoredUserJson();
  const user = raw ? (JSON.parse(raw) as { id?: number }) : null;
  const merged = {
    ...payload,
    createdBy: String(payload.createdBy ?? user?.id ?? "APPLICATION"),
    createdDt: payload.createdDt ?? dateUTC(),
    updatedBy: String(payload.updatedBy ?? user?.id ?? "APPLICATION"),
    updatedDt: payload.updatedDt ?? dateUTC(),
    isActive: payload.isActive ?? true,
  };
  const { data } = await axios.post<T>(`${BASE_URL}${path}`, merged, {
    headers: await getAuthHeaders(),
  });
  return data;
}
