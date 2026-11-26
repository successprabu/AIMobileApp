import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { onSchoolSessionExpired, schoolName, setSchoolToken, type SchoolSession } from "../api/school";

const SESSION_KEY = "schoolSession";
const APP_KEY = "activeApp";

/** Which part of the app is open: DigiMoi / Mahal (MySuccess login) or School. */
export type ActiveApp = "mysuccess" | "school";

type Ctx = {
  school: SchoolSession | null;
  ready: boolean;
  schoolSignIn: (s: SchoolSession) => Promise<void>;
  schoolSignOut: () => Promise<void>;
  updateSchool: (patch: Partial<SchoolSession>) => Promise<void>;
  /** null = not chosen yet (the person has both logins: the app asks). */
  activeApp: ActiveApp | null;
  setActiveApp: (a: ActiveApp | null) => Promise<void>;
};

const SchoolAuthContext = createContext<Ctx | undefined>(undefined);

export function SchoolAuthProvider({ children }: { children: React.ReactNode }) {
  const [school, setSchool] = useState<SchoolSession | null>(null);
  const [activeApp, setActive] = useState<ActiveApp | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [raw, app] = await Promise.all([AsyncStorage.getItem(SESSION_KEY), AsyncStorage.getItem(APP_KEY)]);
        if (raw) {
          const s = JSON.parse(raw) as SchoolSession;
          if (s.expiresAt > Date.now()) {
            setSchoolToken(s.token);
            setSchool(s);
          } else {
            await AsyncStorage.removeItem(SESSION_KEY);
          }
        }
        if (app === "mysuccess" || app === "school") setActive(app);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const save = async (s: SchoolSession | null) => {
    if (s) await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else await AsyncStorage.removeItem(SESSION_KEY);
  };

  const schoolSignOut = useCallback(async () => {
    setSchoolToken(null);
    setSchool(null);
    await save(null);
  }, []);

  const schoolSignIn = useCallback(async (s: SchoolSession) => {
    setSchoolToken(s.token);
    const name = s.user.schoolId && s.user.schoolId !== "*" ? await schoolName(s.user.schoolId) : "All schools";
    const next = { ...s, schoolName: name ?? s.schoolName };
    setSchool(next);
    await save(next);
  }, []);

  const updateSchool = useCallback(async (patch: Partial<SchoolSession>) => {
    setSchool((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch, user: { ...prev.user, ...(patch.user ?? {}) } };
      void save(next);
      return next;
    });
  }, []);

  const setActiveApp = useCallback(async (a: ActiveApp | null) => {
    setActive(a);
    if (a) await AsyncStorage.setItem(APP_KEY, a);
    else await AsyncStorage.removeItem(APP_KEY);
  }, []);

  // The school sign-in lasts 12 hours; when the server says it ended, sign out of School only.
  useEffect(() => {
    onSchoolSessionExpired(() => void schoolSignOut());
    return () => onSchoolSessionExpired(null);
  }, [schoolSignOut]);
  useEffect(() => {
    if (!school) return undefined;
    const ms = school.expiresAt - Date.now();
    const id = setTimeout(() => void schoolSignOut(), Math.max(0, Math.min(ms, 2147483000)));
    return () => clearTimeout(id);
  }, [school, schoolSignOut]);

  const value = useMemo(
    () => ({ school, ready, schoolSignIn, schoolSignOut, updateSchool, activeApp, setActiveApp }),
    [school, ready, schoolSignIn, schoolSignOut, updateSchool, activeApp, setActiveApp],
  );
  return <SchoolAuthContext.Provider value={value}>{children}</SchoolAuthContext.Provider>;
}

export function useSchoolAuth() {
  const ctx = useContext(SchoolAuthContext);
  if (!ctx) throw new Error("useSchoolAuth must be used within SchoolAuthProvider");
  return ctx;
}
