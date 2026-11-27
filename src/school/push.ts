/**
 * School push notifications on this phone (Firebase Cloud Messaging through expo-notifications).
 * Needs google-services.json in the build; without it (or without permission) nothing happens.
 */
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { registerPushToken, unregisterPushToken } from "../api/school";

const TOKEN_KEY = "schoolPushToken";

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

/**
 * This phone's Firebase token, after asking for permission once (null without permission, without Firebase in
 * this build, or on an emulator). Also creates the Android notification channels.
 */
export async function devicePushToken(): Promise<string | null> {
  try {
    if (Platform.OS !== "android" || !Device.isDevice) return null;
    await Notifications.setNotificationChannelAsync("school", {
      name: "School: homework, fees, bus alerts",
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: "#059669",
    });
    await Notifications.setNotificationChannelAsync("mysuccess", {
      name: "DigiMoi & Mahal: guest entries, booking requests",
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: "#c2185b",
    });
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") status = (await Notifications.requestPermissionsAsync()).status;
    if (status !== "granted") return null;
    return ((await Notifications.getDevicePushTokenAsync()).data as string) || null;
  } catch {
    return null;
  }
}

/** Ask once for permission and tell the school server where to send. Never throws. */
export async function registerSchoolPush(): Promise<void> {
  try {
    const token = await devicePushToken();
    if (!token) return;
    await registerPushToken(token);
    await AsyncStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* No Firebase setup in this build, or offline: try again next start. */
  }
}

/** On sign-out: stop notifications for this phone. Call before the school token is cleared. */
export async function unregisterSchoolPush(): Promise<void> {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (!token) return;
  await unregisterPushToken(token);
  await AsyncStorage.removeItem(TOKEN_KEY);
}
