import { useCallback, useRef } from "react";
import { isVoiceSaveCommand } from "../utils/voiceSaveCommand";

/**
 * Wraps a speech field handler: saying "OK" (or similar) triggers save instead of filling a field.
 */
export function useVoiceSaveSpeech(
  baseHandler: (field: string, transcript: string) => void,
  onVoiceSave: () => void
) {
  const onVoiceSaveRef = useRef(onVoiceSave);
  onVoiceSaveRef.current = onVoiceSave;

  return useCallback(
    (field: string, transcript: string) => {
      if (isVoiceSaveCommand(transcript)) {
        onVoiceSaveRef.current();
        return;
      }
      baseHandler(field, transcript);
    },
    [baseHandler]
  );
}
