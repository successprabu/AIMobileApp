import { useEffect, useMemo, useRef } from "react";
import { useAutoSave } from "../context/AutoSaveContext";
import { transactionFormFingerprint } from "../utils/formFingerprint";

type Options = {
  formData: unknown;
  isValid: boolean;
  saving: boolean;
  onSave: (source: "auto" | "voice") => Promise<boolean>;
  debounceMs?: number;
};

/**
 * When auto-save is ON and mandatory fields are valid, saves after debounce.
 * Skips duplicate saves for the same form fingerprint until the form changes.
 */
export function useFormAutoSave({
  formData,
  isValid,
  saving,
  onSave,
  debounceMs = 900,
}: Options) {
  const { autoSaveEnabled, loaded } = useAutoSave();
  const lastSavedFingerprint = useRef<string | null>(null);
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  const fingerprint = useMemo(
    () => transactionFormFingerprint(formData as Parameters<typeof transactionFormFingerprint>[0]),
    [formData]
  );

  useEffect(() => {
    if (!loaded || !autoSaveEnabled || saving || !isValid) return;
    if (fingerprint === lastSavedFingerprint.current) return;

    const timer = setTimeout(() => {
      if (fingerprint === lastSavedFingerprint.current) return;
      void onSaveRef.current("auto").then((ok) => {
        if (ok) lastSavedFingerprint.current = fingerprint;
      });
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [
    loaded,
    autoSaveEnabled,
    fingerprint,
    isValid,
    saving,
    debounceMs,
  ]);

  const markSavedFingerprint = () => {
    lastSavedFingerprint.current = fingerprint;
  };

  const resetSaveFingerprint = () => {
    lastSavedFingerprint.current = null;
  };

  return { markSavedFingerprint, resetSaveFingerprint };
}
