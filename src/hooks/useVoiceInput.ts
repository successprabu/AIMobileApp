import { useCallback, useState } from "react";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";
import { useLanguage } from "../context/LanguageContext";
import { speechLocaleForLanguage } from "../utils/speechLocale";

export function useVoiceInput(onResult: (field: string, transcript: string) => void) {
  const { language } = useLanguage();
  const [recordingField, setRecordingField] = useState<string | null>(null);

  useSpeechRecognitionEvent("result", (event) => {
    if (!recordingField) return;
    const transcript = event.results[0]?.transcript ?? "";
    if (transcript) onResult(recordingField, transcript);
  });

  useSpeechRecognitionEvent("end", () => setRecordingField(null));
  useSpeechRecognitionEvent("error", () => setRecordingField(null));

  const toggleRecording = useCallback(
    async (field: string) => {
      if (recordingField === field) {
        ExpoSpeechRecognitionModule.stop();
        setRecordingField(null);
        return;
      }

      if (recordingField) {
        ExpoSpeechRecognitionModule.stop();
      }

      const available = await ExpoSpeechRecognitionModule.isRecognitionAvailable();
      if (!available) return false;

      const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!perm.granted) return false;

      setRecordingField(field);
      ExpoSpeechRecognitionModule.start({
        lang: speechLocaleForLanguage(language),
        interimResults: true,
        continuous: false,
      });
      return true;
    },
    [language, recordingField]
  );

  return { recordingField, toggleRecording };
}
