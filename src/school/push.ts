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

/** Ask once for permission and tell the school server where to send. Never throws. */
export async function registerSchoolPush(): Promise<void> {
  try {
    if (Platform.OS !== "android" || !Device.isDevice) return;
    await Notifications.setNotificationChannelAsync("school", {
      name: "School: homework, fees, bus alerts",
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: "#059669",
    });
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") status = (await Notifications.requestPermissionsAsync()).status;
    if (status !== "granted") return;
    const token = (await Notifications.getDevicePushTokenAsync()).data as string;
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
