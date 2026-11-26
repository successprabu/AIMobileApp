/**
 * Things the app does in the background, with no screen of its own:
 *  - School push notifications: register this phone after a School sign-in; a tap opens the School app.
 *  - Update check (APK installs): once a day, tell the user when a newer version is on GitHub.
 */
import { useEffect, useRef } from "react";
import { Alert, Linking, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Application from "expo-application";
import * as Notifications from "expo-notifications";
import { useSchoolAuth } from "./context/SchoolAuthContext";
import { registerSchoolPush } from "./school/push";

const RELEASES = "https://api.github.com/repos/successprabu/AIMobileApp/releases/latest";
const DOWNLOAD = "https://mysuccess.azurewebsites.net/download-app";
const CHECKED_KEY = "updateCheckedAt";

/** "1.0.27" > "1.0.26" */
function newer(a: string, b: string): boolean {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] || 0;
    const y = pb[i] || 0;
    if (x !== y) return x > y;
  }
  return false;
}

async function checkForUpdate() {
  if (Platform.OS !== "android") return;
  const current = Application.nativeApplicationVersion;
  if (!current || current === "1.0.0") return; // local development build
  const last = Number(await AsyncStorage.getItem(CHECKED_KEY)) || 0;
  if (Date.now() - last < 20 * 3600 * 1000) return;
  await AsyncStorage.setItem(CHECKED_KEY, String(Date.now()));
  const r = await fetch(RELEASES, { headers: { Accept: "application/vnd.github+json" } });
  if (!r.ok) return;
  const tag = String(((await r.json()) as { tag_name?: string }).tag_name ?? "").replace(/^android-v/, "");
  if (!/^\d+\.\d+\.\d+$/.test(tag) || !newer(tag, current)) return;
  Alert.alert("Update available", `Version ${tag} of My Success is ready (you have ${current}).`, [
    { text: "Later", style: "cancel" },
    { text: "Update", onPress: () => void Linking.openURL(DOWNLOAD) },
  ]);
}

export default function AppServices() {
  const { school, setActiveApp } = useSchoolAuth();
  const registeredFor = useRef<string | null>(null);

  useEffect(() => {
    void checkForUpdate().catch(() => undefined);
  }, []);

  // Register once per School sign-in (after the temporary password is changed).
  useEffect(() => {
    if (!school || school.user.mustChangePassword) {
      registeredFor.current = null;
      return;
    }
    if (registeredFor.current === school.token) return;
    registeredFor.current = school.token;
    void registerSchoolPush();
  }, [school]);

  // Tapping a school notification opens the School part of the app.
  useEffect(() => {
    const open = (r: Notifications.NotificationResponse | null) => {
      const data = r?.notification.request.content.data as { schoolId?: string } | undefined;
      if (data?.schoolId && school) void setActiveApp("school");
    };
    void Notifications.getLastNotificationResponseAsync().then(open).catch(() => undefined);
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, [school, setActiveApp]);

  return null;
}
