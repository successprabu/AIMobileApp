import { call } from "./mahal";

/** AI in Mahal Management (API: MahalAiController). Same { ok, message, data } results as api/mahal. */
const R = "MahalAi/";
const AI_TIMEOUT = 60000;

export type BookingDraft = {
  mahalId: number | null;
  customerName: string | null;
  phone: string | null;
  eventType: string | null;
  fromDate: string | null; // YYYY-MM-DD
  toDate: string | null; // last day, YYYY-MM-DD
  startTime: string | null; // HH:mm
  endTime: string | null;
  guestCount: number | null;
  totalAmount: number | null;
  discount: number | null;
  advance: number | null;
  payMethod: string | null;
  remarks: string | null;
  missing: string[];
  note: string | null;
};

export type FollowUpKind = "balance" | "reminder" | "thanks" | "pending";
export type FollowUp = {
  id: number;
  kind: FollowUpKind;
  status: "Open" | "Sent" | "Skipped";
  message: string | null;
  lang: string | null;
  bookingId: number;
  bookingRef: string | null;
  customerName: string;
  phone: string;
  eventType: string | null;
  fromDate: string;
  toDate: string | null;
  balance: number | null;
  mahalName: string;
};

let status: Promise<boolean> | undefined;
/** Whether AI is switched on (an API key is set on the server). Asked once per app run. */
export const aiEnabled = () => {
  status ??= call<{ enabled: boolean }>("get", `${R}Status`).then((r) => !!(r.ok && r.data?.enabled));
  return status;
};

export const parseBooking = (text: string, mahalId?: number) =>
  call<BookingDraft>("post", `${R}ParseBooking`, { text, mahalId: mahalId || null }, undefined, AI_TIMEOUT);

export const listFollowUps = () => call<{ items: FollowUp[]; open: number; aiEnabled: boolean }>("get", `${R}FollowUps`);
export const draftFollowUp = (id: number, lang: "en" | "ta") =>
  call<{ id: number; message: string; lang: string }>("post", `${R}FollowUps/Draft`, { id, lang }, undefined, AI_TIMEOUT);
export const markFollowUp = (id: number, status: "Sent" | "Skipped" | "Open", message?: string) =>
  call<{ id: number; status: string }>("post", `${R}FollowUps/Mark`, { id, status, message });
