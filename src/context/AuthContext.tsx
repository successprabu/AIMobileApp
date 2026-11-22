import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import type { AuthUser } from "../types/auth";
import {
  clearStoredUser,
  getStoredUserJson,
  setStoredUserJson,
} from "../storage/userStorage";

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
          const decoded = jwtDecode<{ exp?: number }>(parsed.token);
          const now = Date.now() / 1000;
          if (decoded.exp != null && decoded.exp < now) {
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

  // Any API call that gets 401 for a signed-in request ends the session (every API call uses axios).
  useEffect(() => {
    const id = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        const headers = (error?.config?.headers ?? {}) as Record<string, unknown>;
        const auth = String(headers.Authorization ?? headers.authorization ?? "");
        if (error?.response?.status === 401 && /^Bearer\s+\S+/.test(auth)) void endSession();
        return Promise.reject(error);
      }
    );
    return () => axios.interceptors.response.eject(id);
  }, [endSession]);

  // Also sign out by itself when the login's time runs out (timers are capped at ~24 days).
  useEffect(() => {
    if (!user?.token) return undefined;
    let ms: number;
    try {
      const exp = jwtDecode<{ exp?: number }>(user.token).exp;
      if (exp == null) return undefined;
      ms = exp * 1000 - Date.now();
    } catch {
      return undefined;
    }
    if (ms <= 0) {
      void endSession();
      return undefined;
    }
    const id = setTimeout(() => void endSession(), Math.min(ms, 2147483000));
    return () => clearTimeout(id);
  }, [user?.token, endSession]);

  const signOut = useCallback(async () => {
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
