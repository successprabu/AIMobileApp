/**
 * Optional app lock: fingerprint / face, or the phone's own PIN / pattern.
 * When on, the app asks on start and when it comes back after more than 30 seconds away.
 */
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AppState, Image, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as LocalAuthentication from "expo-local-authentication";
import { PillButton } from "../components/ui/AuthUi";

const KEY = "appLock";
const AWAY_MS = 30_000;

type Ctx = {
  lockEnabled: boolean;
  /** Turns the lock on or off after the person proves it is them. Returns an error message, or null. */
  setLockEnabled: (on: boolean) => Promise<string | null>;
};

const AppLockContext = createContext<Ctx>({ lockEnabled: false, setLockEnabled: async () => null });

/** True while the fingerprint / PIN screen is up (the phone's PIN screen briefly sends the app to the background). */
let authing = false;

async function check(prompt: string): Promise<boolean> {
  authing = true;
  try {
    const r = await LocalAuthentication.authenticateAsync({ promptMessage: prompt, cancelLabel: "Cancel", disableDeviceFallback: false });
    return r.success;
  } finally {
    authing = false;
    leftAtReset();
  }
}

let leftAtReset = () => undefined as void;

export function AppLockProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const [locked, setLocked] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const leftAt = useRef(0);
  leftAtReset = () => {
    leftAt.current = 0;
  };

  const unlock = useCallback(async () => {
    setBusy(true);
    try {
      if (await check("Unlock My Success")) setLocked(false);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void AsyncStorage.getItem(KEY).then((v) => {
      if (v === "1") {
        setEnabled(true);
        setLocked(true);
      }
      setReady(true);
    });
  }, []);

  // Ask straight away when the lock screen appears.
  useEffect(() => {
    if (ready && locked && AppState.currentState === "active") void unlock();
  }, [ready, locked, unlock]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (st) => {
      if (authing) return;
      if (st === "background") leftAt.current = Date.now();
      else if (st === "active" && enabled && leftAt.current && Date.now() - leftAt.current > AWAY_MS) setLocked(true);
    });
    return () => sub.remove();
  }, [enabled]);

  const setLockEnabled = useCallback(async (on: boolean): Promise<string | null> => {
    if (on) {
      const level = await LocalAuthentication.getEnrolledLevelAsync();
      if (level === LocalAuthentication.SecurityLevel.NONE) return "Set a screen lock (PIN, pattern or fingerprint) on your phone first.";
      if (!(await check("Turn on app lock"))) return "App lock was not turned on.";
    } else if (!(await check("Turn off app lock"))) {
      return "App lock is still on.";
    }
    await AsyncStorage.setItem(KEY, on ? "1" : "0");
    setEnabled(on);
    return null;
  }, []);

  return (
    <AppLockContext.Provider value={{ lockEnabled: enabled, setLockEnabled }}>
      {children}
      {ready && locked ? (
        <View style={styles.cover}>
          <Image source={require("../../assets/brand-logo.png")} style={styles.logo} resizeMode="contain" />
          <Text style={styles.title}>My Success is locked</Text>
          <Text style={styles.sub}>Use your fingerprint or phone PIN to open.</Text>
          <PillButton label="Unlock" icon="fingerprint" onPress={() => void unlock()} loading={busy} disabled={busy} style={{ alignSelf: "stretch", marginTop: 24 }} />
        </View>
      ) : null}
    </AppLockContext.Provider>
  );
}

export const useAppLock = () => useContext(AppLockContext);

const styles = StyleSheet.create({
  cover: { ...StyleSheet.absoluteFillObject, backgroundColor: "#0f172a", alignItems: "center", justifyContent: "center", padding: 32, zIndex: 1000, elevation: 1000 },
  logo: { width: 84, height: 84, marginBottom: 18 },
  title: { color: "#fff", fontSize: 22, fontWeight: "800" },
  sub: { color: "#cbd5e1", marginTop: 6, textAlign: "center" },
});
