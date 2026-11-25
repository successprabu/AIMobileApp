import { BASE_URL } from "./endpoints";
import { call } from "./mahal";

/**
 * Moitech family features, same API as the website: guest self-entry by QR, WhatsApp thank-you, family live link,
 * moi to return, moi book, invitations + RSVP, gold value, old notebooks, voice entry, partners.
 * Every call resolves to { ok, message, data } and never throws.
 */

export const SITE = "https://mysuccess.azurewebsites.net";
/** QR picture (PNG) for a MySuccess or UPI link, drawn by the API. */
export const qrImageUrl = (text: string, size = 8) => `${BASE_URL}Qr?size=${size}&text=${encodeURIComponent(text)}`;
export const upiLink = (upiId: string, name?: string | null, note?: string | null, amount?: number) =>
  `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(name || "")}&cu=INR${note ? `&tn=${encodeURIComponent(note)}` : ""}${amount ? `&am=${amount}` : ""}`;
export const inr = (n?: number | null) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
export const fullName = (x: { initial?: string | null; name: string }) => [x.initial, x.name].filter(Boolean).join(". ");

// ---- guest self-entry
export type GuestQr = { id: number; functionName: string; funPersionNames?: string | null; token: string; url: string; pending: number };
export type GuestEntry = {
  id: number; villageName: string; name: string; initial?: string | null; phoneNo?: string | null; amount: number; payMode: string;
  note?: string | null; upiRef?: string | null; status: string; decidedBy?: string | null; createdDt: string;
};
export const getGuestQr = (functionId: number) => call<GuestQr>("get", "GuestEntry/Qr", undefined, { functionId });
export const resetGuestQr = (functionId: number) => call<GuestQr>("post", "GuestEntry/ResetQr", undefined, { functionId });
export const listGuestEntries = (functionId: number, status = "Pending") =>
  call<{ items: GuestEntry[]; pending: number; accepted: number; rejected: number }>("get", "GuestEntry/Entries", undefined, { functionId, status });
export const decideGuestEntry = (d: { id: number; accept: boolean; villageName?: string; name?: string; initial?: string; amount?: number; payMode?: string }) =>
  call<unknown>("post", "GuestEntry/Decide", d);

// ---- thank-you
export type ThankRow = { id: number; villageName: string; initial?: string | null; name: string; phoneNo: string; amount: number; payMode?: string | null; thankedDt?: string | null };
export type Thanks = { function: { id: number; functionName: string; funPersionNames?: string | null }; items: ThankRow[]; total: number; withPhone: number; thanked: number };
export const listThanks = (functionId: number) => call<Thanks>("get", "Family/Thanks", undefined, { functionId });
export const markThanked = (id: number, undo = false) => call<{ id: number; thankedDt?: string | null }>("post", "Family/Thanked", undefined, { id, undo });

// ---- family live link
export type LiveShare = { id: number; functionName: string; enabled: boolean; url?: string | null; canChange: boolean };
export const getLiveShare = (functionId: number) => call<LiveShare>("get", "Family/LiveShare", undefined, { functionId });
export const setLiveShare = (req: { functionId: number; pin?: string | null; off?: boolean }) => call<LiveShare>("post", "Family/LiveShare", req);

// ---- moi to return
export type Invite = {
  id: number; name: string; initial?: string | null; place?: string | null; phone?: string | null; eventName?: string | null; eventDate: string;
  plannedAmount?: number | null; remarks?: string | null; status: string; daysLeft: number; theyGave: number; weGave: number;
  got: { amount: number; functionName?: string | null }[];
};
export type InviteList = { items: Invite[]; planned: number; given: number; skipped: number; dueWeek: number };
export const listInvites = (status = "Planned") => call<InviteList>("get", "MoiGiven/Invites", undefined, { status });
export const saveInvite = (i: Record<string, unknown>) => call<{ id: number }>("post", "MoiGiven/SaveInvite", i);
export const setInviteStatus = (req: { id: number; status: string; amount?: number }) => call<unknown>("post", "MoiGiven/InviteStatus", req);
export const deleteInvite = (id: number) => call<unknown>("post", "MoiGiven/DeleteInvite", undefined, { id });

// ---- phase 2
export type BookRow = { id: number; villageName: string; initial?: string | null; name: string; oldAmount?: number | null; newAmount?: number | null; amount: number; payMode?: string | null; phoneNo?: string | null };
export type Book = { function: { id: number; functionName: string; funPersionNames?: string | null; functionDate: string; mahalName?: string | null }; items: BookRow[] };
export const getMoiBook = (functionId: number) => call<Book>("get", "MoiPlus/Book", undefined, { functionId });

export type Gold = {
  id: number; rate?: number | null; canChange: boolean; goldWeight: number; goldValue: number; moi: number; total: number; unweighed: number;
  items: { type?: string | null; count: number; weight: number; gold: boolean; value: number }[];
};
export const getGold = (functionId: number) => call<Gold>("get", "MoiPlus/Gold", undefined, { functionId });
export const setGoldRate = (functionId: number, rate: number | null) => call<Gold>("post", "MoiPlus/Gold", { functionId, rate });

export type InviteInfo = {
  id: number; functionName: string; funPersionNames?: string | null; functionDate: string; mahalName?: string | null; funMessage?: string | null; url: string;
  replies: { id: number; name: string; phone?: string | null; place?: string | null; coming: boolean; guests: number; note?: string | null }[];
  coming: number; notComing: number; expectedGuests: number;
};
export const getInvite = (functionId: number) => call<InviteInfo>("get", "MoiPlus/Invite", undefined, { functionId });

export type Notebook = { id: number; functionName: string; functionDate: string; funPersionNames?: string | null; count: number; total: number };
export type NotebookRow = { villageName: string; initial: string; name: string; amount: number; oldAmount: number; phoneNo: string };
export const listNotebooks = () => call<{ items: Notebook[]; allowed: boolean; aiOn: boolean }>("get", "MoiPlus/Notebooks");
export const addNotebook = (n: { name: string; date: string; names?: string }) => call<Notebook>("post", "MoiPlus/Notebooks", n);
export const readNotebookPage = (functionId: number, image: string, mediaType = "image/jpeg") =>
  call<{ rows: NotebookRow[]; note?: string | null }>("post", "MoiPlus/Notebooks/Read", { functionId, image, mediaType }, undefined, 120000);
export const saveNotebook = (functionId: number, rows: NotebookRow[]) => call<{ saved: number }>("post", "MoiPlus/Notebooks/Save", { functionId, rows });

export type VoiceEntry = { villageName: string; initial: string; name: string; amount?: number | null; oldAmount?: number | null; phoneNo?: string | null; payMode: string; missing: string[] };
export const parseVoiceEntry = (text: string, language: string) => call<VoiceEntry>("post", "MoiPlus/Voice", { text, language });

// ---- partners
export type Partner = {
  id: number; name: string; code: string; kind: string; town?: string | null; upiId?: string | null; sharePercent: number; status: string;
  moitechLink: string; mahalLink: string; familyCount: number; payingCount: number; paidByFamilies: number; earned: number; paidOut: number; balance: number;
  families?: { name: string; phone: string; product: string; joined?: string | null; paid: number }[] | null;
  payouts?: { id: number; amount: number; reference?: string | null; paidDt: string }[] | null;
};
export const getMyPartner = () => call<{ applied: boolean; partner?: Partner }>("get", "Partner/Mine");
export const applyPartner = (r: { kind: string; town: string; upiId: string; note?: string }) => call<unknown>("post", "Partner/Apply", r);
