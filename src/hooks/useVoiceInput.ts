import { useCallback, useEffect, useState } from "react";
import { useLanguage } from "../context/LanguageContext";
import { speechLocaleForLanguage } from "../utils/speechLocale";
import {
  isSpeechRecognitionAvailable,
  isSpeechRecognitionSupported,
  requestSpeechPermissions,
  startSpeechRecognition,
  stopSpeechRecognition,
  subscribeSpeechEvents,
} from "../services/speechRecognition";

export function useVoiceInput(onResult: (field: string, transcript: string) => void) {
  const { language } = useLanguage();
  const [recordingField, setRecordingField] = useState<string | null>(null);
  const supported = isSpeechRecognitionSupported();

  useEffect(() => {
    if (!supported) return;

    const unsubscribe = subscribeSpeechEvents({
      onResult: (transcript) => {
        if (recordingField) onResult(recordingField, transcript);
      },
      onEnd: () => setRecordingField(null),
      onError: () => setRecordingField(null),
    });

    return unsubscribe ?? undefined;
  }, [supported, recordingField, onResult]);

  const toggleRecording = useCallback(
    async (field: string): Promise<boolean | "unsupported"> => {
      if (!supported) return "unsupported";

      if (recordingField === field) {
        stopSpeechRecognition();
        setRecordingField(null);
        return true;
      }

      if (recordingField) stopSpeechRecognition();

      const available = await isSpeechRecognitionAvailable();
      if (!available) return false;

      const granted = await requestSpeechPermissions();
      if (!granted) return false;

      setRecordingField(field);
      const started = startSpeechRecognition({
        lang: speechLocaleForLanguage(language),
        interimResults: true,
        continuous: false,
      });
      if (!started) {
        setRecordingField(null);
        return false;
      }
      return true;
    },
    [language, recordingField, supported]
  );

  return { recordingField, toggleRecording, speechSupported: supported };
}
