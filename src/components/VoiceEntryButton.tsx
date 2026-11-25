import React, { useEffect, useRef, useState } from "react";
import { Button } from "react-native-paper";
import { useLanguage } from "../context/LanguageContext";
import { speechLocaleForLanguage } from "../utils/speechLocale";
import { useTx } from "../i18n/site";
import { parseVoiceEntry, type VoiceEntry } from "../api/moitech";
import {
  isSpeechRecognitionAvailable,
  isSpeechRecognitionSupported,
  requestSpeechPermissions,
  startSpeechRecognition,
  stopSpeechRecognition,
  subscribeSpeechEvents,
} from "../services/speechRecognition";

/**
 * Voice-only entry: say the whole receipt in one go ("காரைக்குடி முருகன் ஐயாயிரத்து ஒன்று"); AI turns it into place,
 * name and amount and onFill puts them in the form to check and save.
 */
export default function VoiceEntryButton({ onFill, onMessage }: { onFill: (v: VoiceEntry) => void; onMessage: (text: string, isError?: boolean) => void }) {
  const tx = useTx();
  const { language } = useLanguage();
  const [state, setState] = useState<"idle" | "listening" | "thinking">("idle");
  const heard = useRef("");
  const active = useRef(false);

  useEffect(() => {
    const off = subscribeSpeechEvents({
      onResult: (t) => {
        if (active.current) heard.current = t;
      },
      onEnd: () => {
        if (!active.current) return;
        active.current = false;
        const text = heard.current.trim();
        if (!text) {
          setState("idle");
          return;
        }
        setState("thinking");
        void parseVoiceEntry(text, language).then((r) => {
          setState("idle");
          if (!r.ok || !r.data) return onMessage(tx(r.message), true);
          onFill(r.data);
          const miss = (r.data.missing ?? []).map((m) => tx(m === "village" ? "Place" : m === "name" ? "Name" : "Amount"));
          onMessage(miss.length ? `${tx("Heard")}: “${text}”. ${tx("Please fill")}: ${miss.join(", ")}` : `${tx("Heard")}: “${text}”`);
        });
      },
      onError: () => {
        active.current = false;
        setState("idle");
      },
    });
    return () => off?.();
  }, [language, onFill, onMessage, tx]);

  if (!isSpeechRecognitionSupported()) return null;

  const press = async () => {
    if (state === "listening") {
      stopSpeechRecognition();
      return;
    }
    if (!(await isSpeechRecognitionAvailable()) || !(await requestSpeechPermissions())) {
      onMessage(tx("Could not understand. Please say it again or type it."), true);
      return;
    }
    heard.current = "";
    active.current = true;
    setState("listening");
    if (!startSpeechRecognition({ lang: speechLocaleForLanguage(language), interimResults: true, continuous: false })) {
      active.current = false;
      setState("idle");
    }
  };

  return (
    <Button mode={state === "listening" ? "contained" : "outlined"} icon={state === "listening" ? "microphone" : "account-voice"} loading={state === "thinking"}
      disabled={state === "thinking"} buttonColor={state === "listening" ? "#dc2626" : undefined} onPress={press} style={{ borderRadius: 12, marginBottom: 12 }}>
      {tx(state === "listening" ? "Listening… tap to stop" : "Speak whole entry")}
    </Button>
  );
}
