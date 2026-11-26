/**
 * Attendance marked without network is kept on the phone and sent later.
 * One entry per school + date; a later save for the same day merges into it.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AxiosError } from "axios";
import { putAttendance, type AttStatus } from "../api/school";

const KEY = "schoolAttendanceQueue";

export type PendingAttendance = { sid: string; date: string; records: Record<string, AttStatus | null>; savedAt: string };

export async function pendingAttendance(): Promise<PendingAttendance[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PendingAttendance[]) : [];
  } catch {
    return [];
  }
}

async function write(list: PendingAttendance[]) {
  if (list.length) await AsyncStorage.setItem(KEY, JSON.stringify(list));
  else await AsyncStorage.removeItem(KEY);
}

export async function queueAttendance(sid: string, date: string, records: Record<string, AttStatus | null>) {
  const list = await pendingAttendance();
  const old = list.find((p) => p.sid === sid && p.date === date);
  if (old) Object.assign(old.records, records);
  else list.push({ sid, date, records, savedAt: new Date().toISOString() });
  await write(list);
}

/** No answer from the server at all (no network, timeout), as opposed to a refusal. */
export function isOffline(e: unknown): boolean {
  const err = e as AxiosError;
  return !!err?.isAxiosError && !err.response;
}

/** Sends what is waiting. Returns how many days were sent; stops at the first network failure. */
export async function flushAttendance(): Promise<number> {
  const list = await pendingAttendance();
  let sent = 0;
  for (const p of [...list]) {
    try {
      await putAttendance(p.sid, p.date, p.records);
    } catch (e) {
      // No network, or signed out: keep it and try again after the next sign-in.
      if (isOffline(e) || (e as AxiosError)?.response?.status === 401) break;
      // Refused for good (future date, no permission, ...): drop it so it doesn't block the rest.
    }
    list.splice(list.indexOf(p), 1);
    sent++;
    await write(list);
  }
  return sent;
}
