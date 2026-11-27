/**
 * DigiMoi / Mahal notifications (new guest moi entry, new hall booking request) from the MySuccess API.
 * Uses the same Firebase token as School notifications; the API sends only to signed-in mobile numbers.
 */
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../api/endpoints";
import { devicePushToken } from "../school/push";

const KEY = "mysuccessPushToken";

/** After a DigiMoi / Mahal sign-in. Never throws. */
export async function registerMySuccessPush(accessToken: string): Promise<void> {
  try {
    const token = await devicePushToken();
    if (!token) return;
    await axios.post(`${BASE_URL}Push/Register`, { token, platform: "android" }, { headers: { Authorization: `Bearer ${accessToken}` }, timeout: 15000 });
    await AsyncStorage.setItem(KEY, token);
  } catch {
    /* offline or older API: try again next start */
  }
}

/** Before signing out of DigiMoi / Mahal (needs the sign-in still valid). Never throws. */
export async function unregisterMySuccessPush(accessToken?: string): Promise<void> {
  try {
    const token = await AsyncStorage.getItem(KEY);
    if (!token) return;
    await AsyncStorage.removeItem(KEY);
    if (!accessToken) return;
    await axios.post(`${BASE_URL}Push/Unregister`, { token }, { headers: { Authorization: `Bearer ${accessToken}` }, timeout: 10000 });
  } catch {
    /* the token is removed on the server when Firebase reports it gone */
  }
}
