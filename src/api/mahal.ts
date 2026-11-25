import axios from "axios";
import { Platform } from "react-native";
import { BASE_URL } from "./endpoints";
import { getStoredUserJson } from "../storage/userStorage";

/**
 * Mahal booking API (MahalBookingController), same endpoints as the web app.
 * Every call resolves to { ok, message, data } and never throws.
 */

export type MahalBookingStatus = "Pending" | "Confirmed" | "Rejected" | "Cancelled" | "Completed";

export type Mahal = {
  id: number;
  customerId?: number;
  mahalName: string;
  description?: string | null;
  contactPerson?: string | null;
  contactNumber?: string | null;
  country?: number;
  state?: number;
  district?: number;
  districtName?: string | null;
  stateName?: string | null;
  addressLine1?: string;
  addressLine2?: string | null;
  landmark?: string | null;
  pincode?: number;
  capacity?: number | null;
  diningCapacity?: number | null;
  roomCount?: number | null;
  pricePerDay?: number | null;
  advanceAmount?: number | null;
  amenities?: string[];
  eventTypes?: string[];
  imageUrl?: string | null;
  /** Uploaded photo ids, cover first. */
  photos?: number[];
  coverPhotoId?: number | null;
  isOnlineBooking?: boolean;
  isActive?: boolean;
  // Billing (owner): GST invoice and online advance payment through the hall's own Razorpay account.
  gstEnabled?: boolean;
  gstin?: string | null;
  gstRate?: number | null;
  payOnline?: boolean;
  razorpayKeyId?: string | null;
  hasRazorpaySecret?: boolean;
  // Day prices (Phase 2)
  weekendPrice?: number | null;
  muhurthamPrice?: number | null;
  weekdayDiscount?: number | null;
  specialDates?: string[];
  pendingRequests?: number;
  upcomingEvents?: number;
};

export type Booking = {
  id: number;
  mahalId: number;
  mahalName?: string;
  bookingRef?: string | null;
  customerName: string;
  primary_phone: string;
  email?: string | null;
  eventType?: string | null;
  guestCount?: number | null;
  fromDate: string;
  toDate: string;
  status: MahalBookingStatus;
  source?: string;
  totalAmount: number;
  discount: number;
  advance: number;
  rcdAmount: number;
  balance: number;
  payMethod?: string | null;
  remarks?: string | null;
  cancelReason?: string | null;
  createdDt?: string;
  /** Set once an invoice has been made. */
  invoiceNo?: number | null;
  // Package and add-ons (Phase 2)
  packageId?: number | null;
  packageName?: string | null;
  addonIds?: number[];
  addons?: { id: number; name: string; amount: number }[];
};

export type BookingCounts = { Pending: number; Upcoming: number; Completed: number; Cancelled: number; All: number };

export type MahalSummary = {
  mahalCount: number;
  onlineCount: number;
  pendingRequests: number;
  upcomingEvents: number;
  monthBookings: number;
  /** null for staff logins (they don't see income). */
  monthRevenue: number | null;
  isStaff?: boolean;
  balanceDue: number;
  upcoming: Booking[];
  pending: Booking[];
  months: { month: string; count: number; amount: number }[];
};

export type ApiResult<T> = { ok: boolean; message: string; data?: T; status?: number };

async function headers() {
  const raw = await getStoredUserJson();
  const token = raw ? (JSON.parse(raw) as { token?: string }).token ?? "" : "";
  return token ? { Authorization: `Bearer ${token}` } : undefined;
}

export async function call<T>(method: "get" | "post", path: string, body?: unknown, params?: Record<string, unknown>, timeout = 20000): Promise<ApiResult<T>> {
  try {
    const res = await axios({ method, url: `${BASE_URL}${path}`, data: body, params, timeout, headers: await headers() });
    const json = (res.data ?? {}) as { result?: boolean; message?: string; data?: T };
    return { ok: json.result !== false, message: json.message ?? "", data: json.data };
  } catch (err) {
    const e = err as { response?: { status?: number; data?: { message?: string; data?: T } } };
    const status = e.response?.status;
    let message = e.response?.data?.message;
    if (!message) {
      if (status === 401) message = "Your session has ended. Please sign in again.";
      else if (status === 403) message = "Only mahal admins can manage bookings. Sign out and sign in again.";
      else if (!e.response) message = "Could not reach the server. Check your connection and try again.";
      else message = "Something went wrong. Please try again.";
    }
    return { ok: false, message, data: e.response?.data?.data, status };
  }
}

const R = "MahalBooking/";

export const getMahalSummary = () => call<MahalSummary>("get", `${R}Summary`);
export const listMyMahals = () => call<Mahal[]>("get", `${R}MyMahals`);
export const saveMahal = (mahal: Record<string, unknown>) => call<Mahal>("post", `${R}SaveMahal`, mahal);
export const listBookings = (params: Record<string, unknown>) =>
  call<{ items: Booking[]; total: number; counts: BookingCounts }>("get", `${R}Bookings`, undefined, params);
export const getBooking = (id: number) => call<Booking>("get", `${R}Booking`, undefined, { id });
export const saveBooking = (booking: Record<string, unknown>) => call<Booking>("post", `${R}SaveBooking`, booking);
export const setBookingStatus = (id: number, status: MahalBookingStatus, reason?: string) =>
  call<Booking>("post", `${R}SetStatus`, { id, status, reason });
export const recordPayment = (id: number, amount: number, payMethod: string) =>
  call<Booking>("post", `${R}RecordPayment`, { id, amount, payMethod });

export const getStates = (countryId = 1) => call<{ id: number; stateName: string }[]>("get", "DropDown/GetStateDropDown", undefined, { countryId });
export const getDistricts = (stateId: number) =>
  call<{ id: number; districtName: string }[]>("get", "DropDown/GetDistrictDropDown", undefined, { stateId });

// ---- shared helpers

export const EVENT_TYPES = ["Marriage", "Reception", "Engagement", "Birthday", "Baby shower", "Ear piercing", "House warming", "Corporate", "Other"];
export const AMENITIES = [
  "Air conditioned",
  "Parking",
  "Generator backup",
  "Dining hall",
  "Kitchen",
  "Rooms for guests",
  "Bride & groom rooms",
  "Stage & decoration",
  "Sound system",
  "Lift",
  "Wheelchair access",
  "Catering available",
];
export const PAY_METHODS = ["Cash", "UPI", "Bank transfer", "Card", "Cheque"];

/** Past confirmed events count as completed. */
export const effectiveStatus = (b: Pick<Booking, "status" | "toDate">): MahalBookingStatus =>
  b.status === "Confirmed" && b.toDate && new Date(b.toDate) <= new Date() ? "Completed" : b.status;

export const STATUS_LABEL: Record<MahalBookingStatus, string> = {
  Pending: "Request",
  Confirmed: "Confirmed",
  Completed: "Completed",
  Cancelled: "Cancelled",
  Rejected: "Declined",
};

const pad = (n: number) => String(n).padStart(2, "0");
/** "2026-11-17" in the phone's own calendar. */
export const toDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
/** "2026-11-17T18:30:00": wall-clock time, the way the API stores booking times. */
export const toLocalIso = (d: Date) => `${toDay(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;

export const fmtRange = (from: string, to?: string) => {
  const a = new Date(from);
  let b = to ? new Date(to) : null;
  if (b && b.getHours() === 0 && b.getMinutes() === 0) b = new Date(b.getTime() - 60000);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  if (!b || toDay(a) === toDay(b)) return a.toLocaleDateString("en-IN", { ...opts, year: "numeric" });
  return `${a.toLocaleDateString("en-IN", opts)} – ${b.toLocaleDateString("en-IN", { ...opts, year: "numeric" })}`;
};

export const fmtDateTime = (v: string) =>
  new Date(v).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

// ---- hall photos (same API as the website)
/** Address of a hall photo. thumb: the small copy for lists. */
export const photoUrl = (id: number, thumb = false) => `${BASE_URL}MahalBooking/Public/Photo/${id}${thumb ? "?size=thumb" : ""}`;

/** Uploads a photo already shrunk on the phone (full + small copy, both JPEG files on the device). */
export async function uploadPhoto(mahalId: number, fullUri: string, thumbUri?: string): Promise<ApiResult<{ id: number }[]>> {
  const form = new FormData();
  form.append("mahalId", String(mahalId));
  // On a phone React Native sends files from { uri, name, type }; the browser version needs the file itself.
  const part = async (uri: string, name: string) =>
    Platform.OS === "web" ? await (await fetch(uri)).blob() : ({ uri, name, type: "image/jpeg" } as unknown as Blob);
  form.append("file", await part(fullUri, "photo.jpg"), "photo.jpg");
  if (thumbUri) form.append("thumb", await part(thumbUri, "thumb.jpg"), "thumb.jpg");
  try {
    const res = await axios.post(`${BASE_URL}${R}Photos/Upload`, form, {
      timeout: 60000,
      // The phone needs the multipart type set; the browser sets it itself (with the boundary).
      headers: { ...(await headers()), ...(Platform.OS === "web" ? {} : { "Content-Type": "multipart/form-data" }) },
    });
    const json = (res.data ?? {}) as { result?: boolean; message?: string; data?: { id: number }[] };
    return { ok: json.result !== false, message: json.message ?? "", data: json.data };
  } catch (err) {
    const e = err as { response?: { data?: { message?: string } } };
    return { ok: false, message: e.response?.data?.message ?? "The photo could not be uploaded. Check your connection and try again." };
  }
}
export const deletePhoto = (id: number) => call<{ id: number }[]>("post", `${R}Photos/Delete`, undefined, { id });
export const setCoverPhoto = (id: number) => call<{ id: number }[]>("post", `${R}Photos/Cover`, undefined, { id });
