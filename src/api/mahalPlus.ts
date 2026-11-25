import { call } from "./mahal";

/**
 * Mahal Phase 2 (API: MahalPlusController): day prices, packages and add-ons, quotes, reviews, vendors, the event-day
 * checklist and yearly reports. Same { ok, message, data } results as api/mahal.
 */
const R = "MahalPlus/";

export type PackageItem = {
  id: number;
  mahalId: number;
  kind: "package" | "addon";
  name: string;
  description?: string | null;
  price: number;
  unit: "day" | "event";
  sortOrder: number;
  isActive: boolean;
};
export type QuoteLine = { id: number; name: string; price: number; unit: string; qty: number; amount: number };
export type Quote = { days: { date: string; price: number; kind: "muhurtham" | "weekend" | "weekday" }[]; rent: number; package: QuoteLine | null; addons: QuoteLine[]; total: number };
export type Pricing = { mahalId: number; weekendPrice: number | null; muhurthamPrice: number | null; weekdayDiscount: number | null; specialDates: string[] };
export type Review = {
  id: number; mahalId: number; mahalName: string; bookingId: number; bookingRef?: string | null; customerName: string; phone: string;
  eventType?: string | null; fromDate: string; rating: number; comment?: string | null; isHidden: boolean; reply?: string | null; createdDt: string;
};
export type ReviewList = { items: Review[]; average: number; count: number; stars: { stars: number; count: number }[] };
export type Vendor = { id: number; mahalId: number; category: string; name: string; phone?: string | null; note?: string | null; sortOrder: number; isActive: boolean };
export type ChecklistItem = { id: number; text: string; sortOrder?: number; isActive: boolean };
export type BookingChecklist = { bookingId: number; items: { id: number; text: string; done: boolean; doneBy?: string | null; doneDt?: string | null }[]; doneCount: number; total: number; note?: string | null };
export type ReportMonth = { month: string; bookedDays: number; hallDays: number; occupancy: number; events: number; income: number; expenses: number; profit: number };
export type Report = {
  year: number;
  halls: { id: number; mahalName: string }[];
  months: ReportMonth[];
  totals: { events: number; income: number; expenses: number; profit: number; bookedDays: number; occupancy: number; dues: number };
  eventTypes: { eventType: string; count: number; income: number }[];
  dues: { id: number; bookingRef?: string | null; customerName: string; phone: string; eventType?: string | null; fromDate: string; mahalName?: string | null; balance: number; overdue: boolean }[];
};

/** Query string with repeated keys for lists (addonIds=1&addonIds=2), which the API binds as a list. */
const qs = (params: Record<string, string | number | null | undefined | (string | number)[]>) => {
  const parts: string[] = [];
  Object.entries(params).forEach(([k, v]) => {
    if (v == null || v === "") return;
    (Array.isArray(v) ? v : [v]).forEach((x) => parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(x))}`));
  });
  return parts.length ? `?${parts.join("&")}` : "";
};

// ---- prices and packages
export const savePricing = (p: Pricing) => call<Pricing>("post", `${R}SavePricing`, p);
export const listPackages = (mahalId: number) => call<PackageItem[]>("get", `${R}Packages`, undefined, { mahalId });
export const savePackage = (p: Partial<PackageItem>) => call<PackageItem>("post", `${R}SavePackage`, p);
export const deletePackage = (id: number) => call<null>("post", `${R}DeletePackage`, undefined, { id });
/** from/to as on bookings ("2026-12-04T06:00:00", end exclusive). */
export const getQuote = (q: { mahalId: number; from: string; to: string; packageId?: number | null; addonIds?: number[] }) =>
  call<Quote>("get", `${R}Quote${qs({ mahalId: q.mahalId, from: q.from, to: q.to, packageId: q.packageId || undefined, addonIds: q.addonIds ?? [] })}`);

// ---- reviews
export const listReviews = (mahalId?: number) => call<ReviewList>("get", `${R}Reviews`, undefined, { mahalId: mahalId || undefined });
export const replyReview = (id: number, reply: string) => call<{ id: number; reply: string | null }>("post", `${R}Reviews/Reply`, { id, reply });
export const hideReview = (id: number, hidden: boolean) => call<{ id: number; isHidden: boolean }>("post", `${R}Reviews/Hide`, { id, hidden });

// ---- vendors
export const listVendors = (mahalId?: number) => call<{ items: Vendor[]; categories: string[] }>("get", `${R}Vendors`, undefined, { mahalId: mahalId || undefined });
export const saveVendor = (v: Partial<Vendor>) => call<Vendor>("post", `${R}SaveVendor`, v);
export const deleteVendor = (id: number) => call<null>("post", `${R}DeleteVendor`, undefined, { id });

// ---- event-day checklist
export const listChecklistItems = (mahalId: number) => call<ChecklistItem[]>("get", `${R}Checklist/Items`, undefined, { mahalId });
export const saveChecklistItems = (mahalId: number, items: { id: number; text: string; isActive: boolean }[]) =>
  call<null>("post", `${R}Checklist/SaveItems`, { mahalId, items });
export const getChecklist = (bookingId: number) => call<BookingChecklist>("get", `${R}Checklist`, undefined, { bookingId });
export const tickChecklist = (bookingId: number, itemId: number, done: boolean) => call<BookingChecklist>("post", `${R}Checklist/Tick`, { bookingId, itemId, done });
export const saveHandoverNote = (bookingId: number, note: string) => call<{ note: string | null }>("post", `${R}Checklist/Note`, { bookingId, note });

// ---- reports
export const getReport = (year: number, mahalId?: number) => call<Report>("get", `${R}Report`, undefined, { year, mahalId: mahalId || undefined });

export const VENDOR_CATEGORIES = ["Catering", "Decoration", "Photography", "Music", "Flowers", "Makeup", "Priest", "Transport", "Lighting", "Other"];
