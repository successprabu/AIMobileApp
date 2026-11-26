/**
 * School Website & ERP server (separate from the MySuccess API).
 * Staff sign in with a username like "kathryns.admin"; parents with their mobile number.
 * Its own axios instance, so the MySuccess token renewal never touches school calls.
 */
import axios, { AxiosError } from "axios";

export const SCHOOL_SITE = "https://myschool-d5f9fueuajgvdkaj.westus3-01.azurewebsites.net";

export const schoolHttp = axios.create({ baseURL: `${SCHOOL_SITE}/api`, timeout: 20000 });

let token: string | null = null;
let onExpired: (() => void) | null = null;

export function setSchoolToken(t: string | null) {
  token = t;
}
export function onSchoolSessionExpired(fn: (() => void) | null) {
  onExpired = fn;
}

schoolHttp.interceptors.request.use((cfg) => {
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});
schoolHttp.interceptors.response.use(
  (r) => r,
  (err: AxiosError) => {
    // 401 on anything except the login itself: the 12-hour school sign-in ended.
    if (err.response?.status === 401 && !String(err.config?.url ?? "").includes("/auth/")) onExpired?.();
    return Promise.reject(err);
  },
);

/** The server's message, or a fallback. */
export function schoolError(e: unknown, fallback: string): string {
  const msg = (e as AxiosError<{ message?: string }>)?.response?.data?.message;
  return msg || fallback;
}

// ---------------------------------------------------------------- types

export type SchoolRole = "superadmin" | "admin" | "teacher" | "nonteaching" | "parent";

export interface SchoolUser {
  id: string;
  username: string;
  name: string;
  role: SchoolRole;
  schoolId: string;
  mustChangePassword?: boolean;
}

export interface SchoolSession {
  token: string;
  user: SchoolUser;
  permissions: string[];
  /** When the sign-in ends (ms). The school server gives 12-hour sign-ins. */
  expiresAt: number;
  schoolName?: string;
}

export interface FeePayment {
  id: string;
  receiptNo: string;
  date: string;
  amount: number;
  mode: string;
  head: string;
  reference?: string;
}

export interface ExamResult {
  examId: string;
  exam: string;
  maxMarks: number;
  subjects: { subject: string; mark: number | null }[];
  total: number;
  max: number;
  percent: number | null;
  failed: string[];
  remark: string;
}

export interface ParentChild {
  school: { id: string; label: string };
  student: {
    id: string;
    name: string;
    className: string;
    section?: string;
    admissionNo: string;
    rollNo?: string;
    hasPhoto?: boolean;
  };
  settings: { academicYear: string; attendanceAlertPercent: number; passPercent: number };
  fees: { items: { head: string; amount: number }[]; concession: number; total: number; paid: number; balance: number };
  payments: FeePayment[];
  attendance: Record<string, "P" | "A" | "L" | "H">;
  attendanceSummary: { days: number; present: number; percent: number | null; absences: { date: string; status: string }[] };
  marks: ExamResult[];
}

export interface Circular {
  id: string;
  type: "circular" | "homework" | "exam";
  title: string;
  text: string;
  date: string;
  dueDate: string;
  attachment: { fileId: string; name: string } | null;
  createdBy: string;
  read?: boolean;
}

export interface BusInfo {
  name?: string;
  vehicleNo?: string;
  driverName?: string;
  driverPhone?: string;
  attendantName?: string;
  stop?: string;
  stopTimes?: { name: string; morning: string; evening: string } | null;
  alerts: { id: string; routeName: string; text: string; at: string }[];
}

export interface ParentCampus {
  schoolId: string;
  studentId: string;
  bus: BusInfo;
  books: { id: string; title: string; issuedOn: string; dueDate: string }[];
}

// ---------------------------------------------------------------- calls

export async function schoolLogin(username: string, password: string): Promise<SchoolSession> {
  const r = await schoolHttp.post<{ token: string; user: SchoolUser; permissions: string[] }>("/auth/login", { username, password });
  return { ...r.data, expiresAt: Date.now() + 12 * 3600 * 1000 - 60_000 };
}

export async function schoolChangePassword(currentPassword: string, newPassword: string): Promise<void> {
  await schoolHttp.post("/auth/change-password", { currentPassword, newPassword });
}

export async function schoolForgotPassword(username: string): Promise<string> {
  const r = await schoolHttp.post<{ message: string }>("/auth/forgot", { username });
  return r.data.message;
}

export async function parentChildren(): Promise<ParentChild[]> {
  return (await schoolHttp.get<{ children: ParentChild[] }>("/parent/children")).data.children;
}

export async function parentCirculars(): Promise<{ schoolId: string; studentId: string; items: Circular[] }[]> {
  return (await schoolHttp.get<{ children: { schoolId: string; studentId: string; items: Circular[] }[] }>("/parent/circulars")).data.children;
}

export async function markCircularRead(schoolId: string, id: string): Promise<void> {
  await schoolHttp.post(`/parent/circulars/${encodeURIComponent(schoolId)}/${encodeURIComponent(id)}/read`, {});
}

export async function parentCampus(): Promise<ParentCampus[]> {
  return (await schoolHttp.get<{ children: ParentCampus[] }>("/parent/campus")).data.children;
}

/** A link the browser can open with the parent's sign-in (attachments are private). */
export function circularFileUrl(schoolId: string, id: string): string {
  return `${SCHOOL_SITE}/api/circulars/${encodeURIComponent(schoolId)}/${encodeURIComponent(id)}/file`;
}

export async function schoolName(schoolId: string): Promise<string | undefined> {
  try {
    const r = await axios.get<{ name?: string }>(`${SCHOOL_SITE}/config/schools/${encodeURIComponent(schoolId)}.json`, { timeout: 10000 });
    return r.data.name;
  } catch {
    return undefined;
  }
}
