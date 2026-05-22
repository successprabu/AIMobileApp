import { useCallback, useEffect, useMemo, useRef } from "react";
import { useAutoSave } from "../context/AutoSaveContext";
import { transactionFormFingerprint } from "../utils/formFingerprint";

type Options = {
  formData: unknown;
  isValid: boolean;
  saving: boolean;
  onSave: (source: "auto" | "voice") => Promise<boolean>;
  /** @deprecated debounce mode — prefer `blur` so amount fields stay editable */
  debounceMs?: number;
  /**
   * `blur` — save only when the screen calls `triggerAutoSave()` (e.g. amount field onBlur).
   * `debounce` — legacy: save after form fingerprint changes (not used on entry screens).
   */
  mode?: "blur" | "debounce";
};

/**
 * When auto-save is ON and mandatory fields are valid, saves after the trigger field blurs.
 * Skips duplicate saves for the same form fingerprint until the form changes.
 */
export function useFormAutoSave({
  formData,
  isValid,
  saving,
  onSave,
  debounceMs = 900,
  mode = "blur",
}: Options) {
  const { autoSaveEnabled, loaded } = useAutoSave();
  const lastSavedFingerprint = useRef<string | null>(null);
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  const fingerprint = useMemo(
    () => transactionFormFingerprint(formData as Parameters<typeof transactionFormFingerprint>[0]),
    [formData]
  );

  const runAutoSave = useCallback(() => {
    if (!loaded || !autoSaveEnabled || saving || !isValid) return;
    if (fingerprint === lastSavedFingerprint.current) return;
    void onSaveRef.current("auto").then((ok) => {
      if (ok) lastSavedFingerprint.current = fingerprint;
    });
  }, [loaded, autoSaveEnabled, saving, isValid, fingerprint]);

  useEffect(() => {
    if (mode !== "debounce") return;
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
    mode,
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

  return { markSavedFingerprint, resetSaveFingerprint, triggerAutoSave: runAutoSave };
}
