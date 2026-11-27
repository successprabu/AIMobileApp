import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { unregisterMySuccessPush } from "../push/mysuccessPush";
import axios from "axios";
import type { AuthUser } from "../types/auth";
import {
  clearStoredUser,
  getStoredUserJson,
  setStoredUserJson,
} from "../storage/userStorage";
import { installSessionInterceptors, onSessionRenewed, revokeSession, sessionEndsAt } from "../api/session";

type AuthContextValue = {
  user: AuthUser | null;
  isReady: boolean;
  signIn: (userData: AuthUser) => Promise<void>;
  signOut: () => Promise<void>;
  /** Merge fields into the stored session (e.g. functionId after creating a function). */
  updateUser: (patch: Partial<AuthUser>) => Promise<void>;
  /** True after the app signed out because the login expired; the login screen shows a short note. */
  sessionEnded: boolean;
  clearSessionEnded: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await getStoredUserJson();
        if (cancelled) return;
        if (raw) {
          const parsed = JSON.parse(raw) as AuthUser;
          if (sessionEndsAt(parsed) < Date.now()) {
            await clearStoredUser();
            setSessionEnded(true);
          } else {
            setUser(parsed);
          }
        }
      } catch {
        await clearStoredUser();
      } finally {
        if (!cancelled) setIsReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (userData: AuthUser) => {
    await setStoredUserJson(JSON.stringify(userData));
    setSessionEnded(false);
    setUser(userData);
  }, []);

  // The login expired: sign out and go back to the login screen (it shows "Your session has ended").
  const endSession = useCallback(async () => {
    await clearStoredUser();
    setSessionEnded(true);
    setUser(null);
  }, []);

  // Every API call uses axios: the 30-minute token is renewed in the background; a 401 that cannot be fixed by
  // renewing ends the session.
  useEffect(() => installSessionInterceptors(axios, () => void endSession()), [endSession]);
  useEffect(() => {
    onSessionRenewed((patch) => setUser((prev) => (prev ? { ...prev, ...patch } : prev)));
    return () => onSessionRenewed(null);
  }, []);

  // Also sign out by itself when the sign-in's time runs out (timers are capped at ~24 days).
  useEffect(() => {
    if (!user?.token) return undefined;
    const ends = sessionEndsAt(user);
    if (!ends) return undefined;
    const ms = ends - Date.now();
    if (ms <= 0) {
      void endSession();
      return undefined;
    }
    const id = setTimeout(() => void endSession(), Math.min(ms, 2147483000));
    return () => clearTimeout(id);
  }, [user, endSession]);

  const signOut = useCallback(async () => {
    try {
      const raw = await getStoredUserJson();
      await unregisterMySuccessPush(raw ? (JSON.parse(raw) as { token?: string }).token : undefined);
    } catch {
      /* never blocks signing out */
    }
    await revokeSession();
    await clearStoredUser();
    setUser(null);
  }, []);

  const updateUser = useCallback(async (patch: Partial<AuthUser>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      void setStoredUserJson(JSON.stringify(next));
      return next;
    });
  }, []);

  const clearSessionEnded = useCallback(() => setSessionEnded(false), []);
  const value = useMemo(
    () => ({ user, isReady, signIn, signOut, updateUser, sessionEnded, clearSessionEnded }),
    [user, isReady, signIn, signOut, updateUser, sessionEnded, clearSessionEnded]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
