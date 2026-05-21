import {
  requireOptionalNativeModule,
  type EventSubscription,
} from "expo-modules-core";

type ResultEvent = {
  results?: { transcript?: string }[];
};

type SpeechNativeModule = {
  start: (options: {
    lang?: string;
    interimResults?: boolean;
    continuous?: boolean;
  }) => void;
  stop: () => void;
  isRecognitionAvailable?: () => boolean | Promise<boolean>;
  requestPermissionsAsync?: () => Promise<{ granted: boolean }>;
  addListener: (
    eventName: string,
    listener: (event: ResultEvent) => void
  ) => EventSubscription;
};

/** Native module is only present in dev/production builds, not in Expo Go. */
export function getSpeechNativeModule(): SpeechNativeModule | null {
  return requireOptionalNativeModule<SpeechNativeModule>("ExpoSpeechRecognition");
}

export function isSpeechRecognitionSupported(): boolean {
  return getSpeechNativeModule() != null;
}

export async function isSpeechRecognitionAvailable(): Promise<boolean> {
  const mod = getSpeechNativeModule();
  if (!mod) return false;
  try {
    const v = mod.isRecognitionAvailable?.();
    return typeof v === "boolean" ? v : await v ?? false;
  } catch {
    return false;
  }
}

export async function requestSpeechPermissions(): Promise<boolean> {
  const mod = getSpeechNativeModule();
  if (!mod?.requestPermissionsAsync) return false;
  try {
    const res = await mod.requestPermissionsAsync();
    return res.granted;
  } catch {
    return false;
  }
}

export function subscribeSpeechEvents(handlers: {
  onResult: (transcript: string) => void;
  onEnd: () => void;
  onError: () => void;
}): (() => void) | null {
  const mod = getSpeechNativeModule();
  if (!mod) return null;

  const subs: EventSubscription[] = [];

  subs.push(
    mod.addListener("result", (event) => {
      const transcript = event.results?.[0]?.transcript ?? "";
      if (transcript) handlers.onResult(transcript);
    })
  );
  subs.push(mod.addListener("end", () => handlers.onEnd()));
  subs.push(mod.addListener("error", () => handlers.onError()));

  return () => {
    for (const s of subs) s.remove();
  };
}

export function startSpeechRecognition(options: {
  lang: string;
  interimResults?: boolean;
  continuous?: boolean;
}): boolean {
  const mod = getSpeechNativeModule();
  if (!mod) return false;
  try {
    mod.start({
      lang: options.lang,
      interimResults: options.interimResults ?? true,
      continuous: options.continuous ?? false,
    });
    return true;
  } catch {
    return false;
  }
}

export function stopSpeechRecognition(): void {
  try {
    getSpeechNativeModule()?.stop();
  } catch {
    // ignore
  }
}
