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

// ---------------------------------------------------------------- parents: Ask AI, pay in the app

export async function parentAsk(studentId: string, question: string): Promise<string> {
  const r = await schoolHttp.post<{ text: string }>("/ai", { task: "parent-assistant", studentId, question }, { timeout: 45000 });
  return r.data.text;
}

/** Schools of this parent that take online payment. */
export async function parentPayAvailable(): Promise<Record<string, boolean>> {
  return (await schoolHttp.get<{ schools: Record<string, boolean> }>("/parent/pay/available")).data.schools;
}

/** A one-time checkout page (opens in the phone's browser; UPI apps open from there). */
export async function parentPayLink(schoolId: string, studentId: string, amount: number): Promise<string> {
  const r = await schoolHttp.post<{ payUrl: string }>("/parent/pay/order", { schoolId, studentId, amount, forApp: true });
  return `${SCHOOL_SITE}${r.data.payUrl}`;
}

// ---------------------------------------------------------------- staff

export interface SchoolSettings {
  academicYear: string;
  classes: string[];
  sections: string[];
  subjects: string[];
  exams: { id: string; name: string; maxMarks: number }[];
  paymentModes: string[];
  passPercent: number;
}

export interface SchoolStudent {
  id: string;
  name: string;
  className: string;
  section?: string;
  admissionNo: string;
  rollNo?: string;
  parentName?: string;
  parentPhone?: string;
  status: string;
  transportRoute?: string;
}

export type AttStatus = "P" | "A" | "L" | "H";

const sidPath = (sid: string) => `/schools/${encodeURIComponent(sid)}`;

export async function schoolSettings(sid: string): Promise<SchoolSettings> {
  return (await schoolHttp.get<{ settings: SchoolSettings }>(`${sidPath(sid)}/settings`)).data.settings;
}

export async function schoolStudents(sid: string): Promise<SchoolStudent[]> {
  return (await schoolHttp.get<{ items: SchoolStudent[] }>(`${sidPath(sid)}/students`)).data.items;
}

export async function getAttendance(sid: string, date: string): Promise<Record<string, AttStatus>> {
  return (await schoolHttp.get<{ records: Record<string, AttStatus> }>(`${sidPath(sid)}/attendance/students`, { params: { date } })).data.records;
}

export async function putAttendance(sid: string, date: string, records: Record<string, AttStatus | null>): Promise<number> {
  return (await schoolHttp.put<{ saved: number }>(`${sidPath(sid)}/attendance/students`, { date, records })).data.saved;
}

export type MarksData = { marks: Record<string, Record<string, Record<string, number>>>; remarks: Record<string, Record<string, string>> };

export async function getMarks(sid: string): Promise<MarksData> {
  const d = (await schoolHttp.get<Partial<MarksData>>(`${sidPath(sid)}/marks`)).data;
  return { marks: d.marks ?? {}, remarks: d.remarks ?? {} };
}

export async function putMarks(sid: string, examId: string, records: Record<string, Record<string, number | null>>): Promise<string[]> {
  return (await schoolHttp.put<{ errors: string[] }>(`${sidPath(sid)}/marks`, { examId, records })).data.errors ?? [];
}

/** Photo (JPEG data URL, under 1 MB) → file id for a circular. */
export async function uploadCircularFile(sid: string, dataUrl: string): Promise<string> {
  return (await schoolHttp.post<{ fileId: string }>(`${sidPath(sid)}/circulars/files`, { data: dataUrl }, { timeout: 60000 })).data.fileId;
}

export async function postCircular(
  sid: string,
  c: { type: Circular["type"]; title: string; text: string; classes: string[]; dueDate?: string; attachment?: { fileId: string; name: string } | null },
): Promise<void> {
  await schoolHttp.post(`${sidPath(sid)}/circulars`, c);
}

export async function staffCirculars(sid: string): Promise<(Circular & { readCount: number; audience: number; classes: string[] })[]> {
  return (await schoolHttp.get<{ items: (Circular & { readCount: number; audience: number; classes: string[] })[] }>(`${sidPath(sid)}/circulars`)).data.items;
}

export interface StudentFees {
  student: SchoolStudent;
  fees: ParentChild["fees"];
  payments: FeePayment[];
}

export async function studentFees(sid: string, studentId: string): Promise<StudentFees> {
  return (await schoolHttp.get<StudentFees>(`${sidPath(sid)}/students/${encodeURIComponent(studentId)}`)).data;
}

export async function collectFee(
  sid: string,
  p: { studentId: string; amount: number; mode: string; head?: string; reference?: string; note?: string },
): Promise<{ item: FeePayment & { studentName: string; className: string; section?: string; admissionNo: string; collectedBy?: string }; fees: ParentChild["fees"] }> {
  return (await schoolHttp.post(`${sidPath(sid)}/payments`, p)).data;
}

export interface Enquiry {
  id: string;
  schoolId: string;
  type: string;
  parentName: string;
  studentName: string;
  phone: string;
  email: string;
  grade: string;
  message: string;
  status: string;
  createdAt: string;
}

export async function enquiries(sid: string): Promise<{ items: Enquiry[]; statuses: string[] }> {
  return (await schoolHttp.get(`/admin/enquiries`, { params: { schoolId: sid } })).data;
}

export async function setEnquiryStatus(sid: string, id: string, status: string): Promise<void> {
  await schoolHttp.patch(`/admin/enquiries/${encodeURIComponent(sid)}/${encodeURIComponent(id)}`, { status });
}

export interface Application {
  id: string;
  applicationNo: string;
  status: string;
  createdAt: string;
  student: { name: string; className: string; dob?: string };
  parent: { name: string; phone: string; email?: string };
}

export async function applications(sid: string): Promise<{ items: Application[]; statuses: string[] }> {
  return (await schoolHttp.get(`${sidPath(sid)}/applications`)).data;
}

export async function setApplicationStatus(sid: string, id: string, status: string): Promise<void> {
  await schoolHttp.patch(`${sidPath(sid)}/applications/${encodeURIComponent(id)}`, { status });
}

export interface BusRoute {
  id: string;
  name: string;
  vehicleNo?: string;
}

export async function transport(sid: string): Promise<{ routes: BusRoute[]; alerts: { id: string; routeName: string; text: string; at: string; by: string }[] }> {
  return (await schoolHttp.get(`${sidPath(sid)}/transport`)).data;
}

export async function sendBusAlert(sid: string, routeId: string, text: string): Promise<void> {
  await schoolHttp.post(`${sidPath(sid)}/transport/alerts`, { routeId, text });
}

// ---------------------------------------------------------------- phone: push & sign-out everywhere

export async function registerPushToken(token: string): Promise<void> {
  await schoolHttp.post("/push/register", { token });
}

export async function unregisterPushToken(token: string): Promise<void> {
  await schoolHttp.post("/push/unregister", { token }).catch(() => undefined);
}

export async function schoolLogoutAll(): Promise<void> {
  await schoolHttp.post("/auth/logout-all", {});
}
