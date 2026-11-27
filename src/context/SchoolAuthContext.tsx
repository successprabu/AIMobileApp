import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { onSchoolSessionExpired, schoolName, setSchoolToken, type SchoolSession } from "../api/school";
import { secureGet, secureRemove, secureSet } from "../storage/secureStore";

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
  /** Super admin: the school the ERP screens work on (the website's school picker). */
  pickedSchool: { id: string; label: string } | null;
  pickSchool: (p: { id: string; label: string } | null) => Promise<void>;
};

const PICK_KEY = "schoolPicked";

const SchoolAuthContext = createContext<Ctx | undefined>(undefined);

export function SchoolAuthProvider({ children }: { children: React.ReactNode }) {
  const [school, setSchool] = useState<SchoolSession | null>(null);
  const [activeApp, setActive] = useState<ActiveApp | null>(null);
  const [ready, setReady] = useState(false);
  const [picked, setPicked] = useState<{ id: string; label: string } | null>(null);
  useEffect(() => {
    void AsyncStorage.getItem(PICK_KEY).then((v) => {
      try {
        if (v) setPicked(JSON.parse(v) as { id: string; label: string });
      } catch {
        /* ignore */
      }
    });
  }, []);
  const pickSchool = useCallback(async (p: { id: string; label: string } | null) => {
    setPicked(p);
    if (p) await AsyncStorage.setItem(PICK_KEY, JSON.stringify(p));
    else await AsyncStorage.removeItem(PICK_KEY);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [raw, app] = await Promise.all([secureGet(SESSION_KEY), AsyncStorage.getItem(APP_KEY)]);
        if (raw) {
          const s = JSON.parse(raw) as SchoolSession;
          if (s.expiresAt > Date.now()) {
            setSchoolToken(s.token);
            setSchool(s);
          } else {
            await secureRemove(SESSION_KEY);
          }
        }
        if (app === "mysuccess" || app === "school") setActive(app);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const save = async (s: SchoolSession | null) => {
    if (s) await secureSet(SESSION_KEY, JSON.stringify(s));
    else await secureRemove(SESSION_KEY);
  };

  const schoolSignOut = useCallback(async () => {
    setSchoolToken(null);
    setSchool(null);
    await save(null);
  }, []);

  const schoolSignIn = useCallback(async (s: SchoolSession) => {
    setSchoolToken(s.token);
    // Open the School app at once; the school's name arrives a moment later.
    const first = { ...s, schoolName: s.schoolName ?? (s.user.schoolId === "*" ? "All schools" : undefined) };
    setSchool(first);
    void save(first);
    if (s.user.schoolId && s.user.schoolId !== "*") {
      const name = await schoolName(s.user.schoolId).catch(() => null);
      if (name) {
        setSchool((prev) => (prev && prev.token === s.token ? { ...prev, schoolName: name } : prev));
        await save({ ...first, schoolName: name });
      }
    }
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

  // The super admin works on the school picked in the menu: screens read school.user.schoolId as for any admin.
  const shown = useMemo(
    () =>
      school && school.user.role === "superadmin" && picked
        ? { ...school, schoolName: picked.label, user: { ...school.user, schoolId: picked.id } }
        : school,
    [school, picked],
  );
  const value = useMemo(
    () => ({ school: shown, ready, schoolSignIn, schoolSignOut, updateSchool, activeApp, setActiveApp, pickedSchool: picked, pickSchool }),
    [shown, ready, schoolSignIn, schoolSignOut, updateSchool, activeApp, setActiveApp, picked, pickSchool],
  );
  return <SchoolAuthContext.Provider value={value}>{children}</SchoolAuthContext.Provider>;
}

export function useSchoolAuth() {
  const ctx = useContext(SchoolAuthContext);
  if (!ctx) throw new Error("useSchoolAuth must be used within SchoolAuthProvider");
  return ctx;
}
