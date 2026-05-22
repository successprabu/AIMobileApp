import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
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
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isReady, setIsReady] = useState(false);

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
    setUser(userData);
  }, []);

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

  const value = useMemo(
    () => ({ user, isReady, signIn, signOut, updateUser }),
    [user, isReady, signIn, signOut, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
