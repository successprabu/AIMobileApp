import axios from "axios";
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
  isOnlineBooking?: boolean;
  isActive?: boolean;
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
};

export type BookingCounts = { Pending: number; Upcoming: number; Completed: number; Cancelled: number; All: number };

export type MahalSummary = {
  mahalCount: number;
  onlineCount: number;
  pendingRequests: number;
  upcomingEvents: number;
  monthBookings: number;
  monthRevenue: number;
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

async function call<T>(method: "get" | "post", path: string, body?: unknown, params?: Record<string, unknown>): Promise<ApiResult<T>> {
  try {
    const res = await axios({ method, url: `${BASE_URL}${path}`, data: body, params, timeout: 20000, headers: await headers() });
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
