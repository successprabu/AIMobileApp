import { secureGet, secureRemove, secureSet } from "./secureStore";

const USER_KEY = "user";

/** In memory too: every API call reads the sign-in, and secure storage is slower than AsyncStorage. */
let cache: string | null | undefined;

/** The MySuccess sign-in (tokens + profile), kept in the phone's secure storage. */
export async function getStoredUserJson(): Promise<string | null> {
  if (cache === undefined) cache = await secureGet(USER_KEY);
  return cache;
}

export async function setStoredUserJson(json: string): Promise<void> {
  cache = json;
  await secureSet(USER_KEY, json);
}

export async function clearStoredUser(): Promise<void> {
  cache = null;
  await secureRemove(USER_KEY);
}
