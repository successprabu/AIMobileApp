import axios from "axios";
import { BASE_URL } from "./endpoints";
import { getStoredUserJson } from "../storage/userStorage";
import type { ApiResult } from "./mahal";

/**
 * Super admin and account tools: client list, registering clients and users, and the
 * website enquiries inbox. Same endpoints as the web app; every call resolves to { ok, message, data }.
 */

export type Customer = {
  id: number;
  name: string;
  primary_phone: string;
  email?: string | null;
  userType?: string;
  appName?: string;
  customerId?: number;
  isActive: boolean;
  is_primary_phone_whatsup?: boolean;
  createdDt?: string;
  activated_To?: string | null;
  [key: string]: unknown;
};

export type EnquiryStatus = "New" | "Replied" | "Closed";
export type EnquirySummary = { id: number; name: string; phone?: string | null; email?: string | null; topic: string; preview?: string; status: EnquiryStatus; createdDt: string };
export type EnquiryReply = { id?: number; message: string; channel: string; sentTo?: string | null; delivered?: boolean; error?: string | null; createdBy?: string | null; createdDt: string };
export type Enquiry = EnquirySummary & { message: string; source?: string; replies?: EnquiryReply[] };

async function headers() {
  const raw = await getStoredUserJson();
  const token = raw ? (JSON.parse(raw) as { token?: string }).token ?? "" : "";
  return token ? { Authorization: `Bearer ${token}` } : undefined;
}

export async function call<T>(method: "get" | "post", path: string, body?: unknown, params?: Record<string, unknown>): Promise<ApiResult<T>> {
  try {
    const res = await axios({ method, url: `${BASE_URL}${path}`, data: body, params, timeout: 20000, headers: await headers() });
    const json = (res.data ?? {}) as { result?: boolean; message?: string; data?: T } | string;
    if (typeof json === "string") return { ok: true, message: json };
    return { ok: json.result !== false, message: json.message ?? "", data: json.data };
  } catch (err) {
    const e = err as { response?: { status?: number; data?: { message?: string } | string } };
    const status = e.response?.status;
    const d = e.response?.data;
    let message = typeof d === "string" ? d : d?.message;
    if (!message) {
      if (status === 401) message = "Your session has ended. Please sign in again.";
      else if (status === 403) message = "Only super admins can do this. Sign out and sign in again.";
      else if (!e.response) message = "Could not reach the server. Check your connection and try again.";
      else message = "Something went wrong. Please try again.";
    }
    return { ok: false, message, status };
  }
}

// ---- customers / users
export const listCustomers = (params: Record<string, unknown>) =>
  call<{ customers: Customer[]; totalPages: number; totalRecords: number }>("get", "Master/GetCustomer", undefined, params);
export const updateCustomer = (customer: Customer) => call<Customer>("post", "Master/UpdateCustomer", customer);
export const addCustomer = (customer: Record<string, unknown>) => call<Customer>("post", "Auth/AddCustomer", customer);

// ---- enquiries (super admins)
export const listEnquiries = (params: { status?: string; search?: string; page?: number; pageSize?: number }) =>
  call<{ items: EnquirySummary[]; total: number; counts: Partial<Record<EnquiryStatus, number>> }>("get", "Enquiry/List", undefined, {
    status: params.status || undefined,
    search: params.search || undefined,
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 20,
  });
export const getEnquiry = (id: number) => call<Enquiry>("get", "Enquiry/Get", undefined, { id });
export const replyToEnquiry = (enquiryId: number, message: string, channel: "email" | "whatsapp") =>
  call<{ whatsappUrl?: string }>("post", "Enquiry/Reply", { enquiryId, message, channel });
export const setEnquiryStatus = (enquiryId: number, status: EnquiryStatus) => call<unknown>("post", "Enquiry/UpdateStatus", { enquiryId, status });

/** Readable temporary password (no 0/O or 1/l). */
export const newPassword = () => {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
};

export const waDigits = (phone?: string | null) => {
  const d = (phone ?? "").replace(/\D/g, "");
  return d.length === 10 ? `91${d}` : d;
};

export const USER_TYPE_LABEL: Record<string, string> = { SU: "Super Admin", AU: "Admin", NU: "User", MU: "Mahal Admin" };

export const timeAgo = (v: string) => {
  const d = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(v) ? v : `${v}Z`);
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} h ago`;
  const days = Math.round(hrs / 24);
  return days < 7 ? `${days} d ago` : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

/** Anyone signed in: send a message to the MySuccess team (lands in the super admin's Enquiries). */
export const submitEnquiry = (form: { name: string; phone?: string; email?: string; topic: string; message: string }) =>
  call<unknown>("post", "Enquiry/Submit", { name: form.name, phone: form.phone || null, email: form.email || null, topic: form.topic, message: form.message, website: "" });

export const CONTACT = {
  email: "mysuccesstechnologies@gmail.com",
  phoneDisplay: "+91 80503 86769",
  phoneTel: "+918050386769",
  whatsapp: "918050386769",
  hours: "Mon – Sat, 9:00 AM – 8:00 PM IST",
};
