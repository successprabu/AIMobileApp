/**
 * Sign-in data in the phone's secure storage (Android Keystore) instead of plain AsyncStorage.
 * Values are split into chunks (SecureStore is meant for small values). On the first read after an
 * update, a value still in AsyncStorage is moved here and removed from AsyncStorage.
 * On web (dev preview) SecureStore is not available, so AsyncStorage is used.
 */
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

const CHUNK = 1800;
const native = Platform.OS !== "web";

async function readSecure(key: string): Promise<string | null> {
  const n = Number(await SecureStore.getItemAsync(`${key}.n`));
  if (!n) return null;
  const parts: string[] = [];
  for (let i = 0; i < n; i++) {
    const p = await SecureStore.getItemAsync(`${key}.${i}`);
    if (p == null) return null;
    parts.push(p);
  }
  return parts.join("");
}

async function removeSecure(key: string): Promise<void> {
  const n = Number(await SecureStore.getItemAsync(`${key}.n`)) || 0;
  for (let i = 0; i < n; i++) await SecureStore.deleteItemAsync(`${key}.${i}`);
  await SecureStore.deleteItemAsync(`${key}.n`);
}

export async function secureSet(key: string, value: string): Promise<void> {
  if (!native) return AsyncStorage.setItem(key, value);
  await removeSecure(key);
  const n = Math.max(1, Math.ceil(value.length / CHUNK));
  for (let i = 0; i < n; i++) await SecureStore.setItemAsync(`${key}.${i}`, value.slice(i * CHUNK, (i + 1) * CHUNK));
  await SecureStore.setItemAsync(`${key}.n`, String(n));
}

export async function secureGet(key: string): Promise<string | null> {
  if (!native) return AsyncStorage.getItem(key);
  try {
    const v = await readSecure(key);
    if (v != null) return v;
  } catch {
    /* Keystore problem (e.g. restored backup): fall through to the old place. */
  }
  const old = await AsyncStorage.getItem(key);
  if (old != null) {
    try {
      await secureSet(key, old);
      await AsyncStorage.removeItem(key);
    } catch {
      /* keep it where it was */
    }
  }
  return old;
}

export async function secureRemove(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
  if (native) await removeSecure(key).catch(() => undefined);
}
