import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "mysuccess_auto_save_enabled";

type AutoSaveContextValue = {
  autoSaveEnabled: boolean;
  setAutoSaveEnabled: (value: boolean) => void;
  loaded: boolean;
};

const AutoSaveContext = createContext<AutoSaveContextValue | null>(null);

export function AutoSaveProvider({ children }: { children: React.ReactNode }) {
  const [autoSaveEnabled, setAutoSaveEnabledState] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!cancelled && raw != null) {
          setAutoSaveEnabledState(raw === "1");
        }
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setAutoSaveEnabled = useCallback((value: boolean) => {
    setAutoSaveEnabledState(value);
    void AsyncStorage.setItem(STORAGE_KEY, value ? "1" : "0");
  }, []);

  const value = useMemo(
    () => ({ autoSaveEnabled, setAutoSaveEnabled, loaded }),
    [autoSaveEnabled, setAutoSaveEnabled, loaded]
  );

  return (
    <AutoSaveContext.Provider value={value}>{children}</AutoSaveContext.Provider>
  );
}

export function useAutoSave() {
  const ctx = useContext(AutoSaveContext);
  if (!ctx) {
    throw new Error("useAutoSave must be used within AutoSaveProvider");
  }
  return ctx;
}
