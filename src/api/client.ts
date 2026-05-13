import axios from "axios";
import { BASE_URL } from "./endpoints";
import { getStoredUserJson } from "../storage/userStorage";

export async function authGet<T = unknown>(
  path: string,
  params?: Record<string, string | number | undefined | null>
): Promise<T> {
  const raw = await getStoredUserJson();
  const token = raw ? (JSON.parse(raw) as { token?: string }).token ?? "" : "";
  const { data } = await axios.get<T>(`${BASE_URL}${path}`, {
    params: params ?? undefined,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  return data;
}
