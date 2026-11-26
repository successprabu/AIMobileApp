/**
 * School ERP calls used by the staff screens (same server and routes as the School website's admin).
 */
import * as FileSystem from "expo-file-system/legacy";
import { SCHOOL_SITE, schoolHttp } from "./school";
import type {
  AdminUser,
  AiResult,
  Application,
  AttendanceBook,
  AttendanceStatus,
  Book,
  BusRoute,
  Loan,
  OnlinePaymentSettings,
  Payment,
  SchoolData,
  SchoolSettings,
  StaffMember,
  Student,
  StudentDetail,
  StudentField,
  UserRole,
} from "../school/erp";

const s = (sid: string) => `/schools/${encodeURIComponent(sid)}`;

// ---------------- whole school (dashboard, reports)
export async function schoolData(sid: string): Promise<SchoolData> {
  return (await schoolHttp.get<SchoolData>(`${s(sid)}/data`, { timeout: 45000 })).data;
}

export type AiTask = "school-summary" | "staff-ask" | "fee-reminder" | "report-remark" | "student-insight";
export async function schoolAi(body: { task: AiTask; schoolId: string; question?: string; studentId?: string; examId?: string }): Promise<AiResult> {
  return (await schoolHttp.post<AiResult>("/ai", body, { timeout: 60000 })).data;
}
export async function aiStatus(): Promise<{ enabled: boolean; model: string | null }> {
  return (await schoolHttp.get("/ai/status")).data;
}

// ---------------- settings
export async function getSettings(sid: string): Promise<{ settings: SchoolSettings; studentFields: StudentField[] }> {
  return (await schoolHttp.get(`${s(sid)}/settings`)).data;
}
export async function saveSettings(sid: string, change: Partial<SchoolSettings>): Promise<SchoolSettings> {
  return (await schoolHttp.put<{ settings: SchoolSettings }>(`${s(sid)}/settings`, change)).data.settings;
}

// ---------------- students
export async function studentList(sid: string): Promise<Student[]> {
  return (await schoolHttp.get<{ items: Student[] }>(`${s(sid)}/students`)).data.items;
}
export async function studentDetail(sid: string, id: string): Promise<StudentDetail> {
  return (await schoolHttp.get<StudentDetail>(`${s(sid)}/students/${encodeURIComponent(id)}`)).data;
}
export type ParentLogin = { username: string; created: boolean } | null;
export async function createStudent(sid: string, data: Partial<Student>): Promise<{ item: Student; parentLogin: ParentLogin }> {
  return (await schoolHttp.post(`${s(sid)}/students`, data)).data;
}
export async function updateStudent(sid: string, id: string, data: Partial<Student>): Promise<{ item: Student; parentLogin: ParentLogin }> {
  return (await schoolHttp.patch(`${s(sid)}/students/${encodeURIComponent(id)}`, data)).data;
}
/** JPEG data URL. */
export async function uploadStudentPhoto(sid: string, id: string, image: string): Promise<void> {
  await schoolHttp.put(`${s(sid)}/students/${encodeURIComponent(id)}/photo`, { image }, { timeout: 60000 });
}
/** The student's photo as a data URL (for ID cards), or null. */
export async function studentPhotoDataUrl(sid: string, id: string, token: string): Promise<string | null> {
  try {
    const target = `${FileSystem.cacheDirectory ?? ""}photo-${id}.jpg`;
    const r = await FileSystem.downloadAsync(`${SCHOOL_SITE}/api${s(sid)}/students/${encodeURIComponent(id)}/photo`, target, { headers: { Authorization: `Bearer ${token}` } });
    if (r.status !== 200) return null;
    const b64 = await FileSystem.readAsStringAsync(r.uri, { encoding: FileSystem.EncodingType.Base64 });
    const type = r.headers["Content-Type"] ?? r.headers["content-type"] ?? "image/jpeg";
    return `data:${type};base64,${b64}`;
  } catch {
    return null;
  }
}
export async function resetParentPassword(userId: string): Promise<void> {
  await schoolHttp.post(`/admin/users/${encodeURIComponent(userId)}/reset-parent`, {});
}

// ---------------- fees
export async function payments(sid: string, studentId?: string): Promise<Payment[]> {
  return (await schoolHttp.get<{ items: Payment[] }>(`${s(sid)}/payments`, { params: studentId ? { studentId } : {} })).data.items;
}

// ---------------- staff attendance & marks remarks
export async function staffMembers(sid: string): Promise<StaffMember[]> {
  return (await schoolHttp.get<{ items: StaffMember[] }>(`${s(sid)}/staff`)).data.items;
}
export async function getStaffAttendance(sid: string, date: string): Promise<Record<string, AttendanceStatus>> {
  return (await schoolHttp.get<{ records: Record<string, AttendanceStatus> }>(`${s(sid)}/attendance/staff`, { params: { date } })).data.records;
}
export async function putStaffAttendance(sid: string, date: string, records: Record<string, AttendanceStatus | null>): Promise<number> {
  return (await schoolHttp.put<{ saved: number }>(`${s(sid)}/attendance/staff`, { date, records })).data.saved;
}
export type { AttendanceBook };
export async function saveRemark(sid: string, examId: string, studentId: string, remark: string): Promise<void> {
  await schoolHttp.put(`${s(sid)}/remarks`, { examId, studentId, remark });
}

// ---------------- circulars
export async function deleteCircular(sid: string, id: string): Promise<void> {
  await schoolHttp.delete(`${s(sid)}/circulars/${encodeURIComponent(id)}`);
}

// ---------------- applications
export async function applicationList(sid: string): Promise<{ items: Application[]; statuses: string[] }> {
  return (await schoolHttp.get(`${s(sid)}/applications`)).data;
}
export async function updateApplication(sid: string, id: string, change: { status?: string; note?: string; publicNote?: string }): Promise<Application> {
  return (await schoolHttp.patch<{ item: Application }>(`${s(sid)}/applications/${encodeURIComponent(id)}`, change)).data.item;
}
export async function admitApplication(sid: string, id: string, body: { className: string; section: string }): Promise<{ item: Application; student: { id: string; admissionNo: string } }> {
  return (await schoolHttp.post(`${s(sid)}/applications/${encodeURIComponent(id)}/admit`, body)).data;
}
export async function applicationFileToShare(sid: string, id: string, fileId: string, token: string): Promise<string> {
  const target = `${FileSystem.cacheDirectory ?? ""}${fileId}`;
  const r = await FileSystem.downloadAsync(`${SCHOOL_SITE}/api${s(sid)}/applications/${encodeURIComponent(id)}/files/${encodeURIComponent(fileId)}`, target, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (r.status !== 200) throw new Error("download");
  return r.uri;
}

// ---------------- transport
export async function transportData(sid: string): Promise<{ routes: BusRoute[]; alerts: { id: string; routeId: string; routeName: string; text: string; date: string; at: string; by: string }[] }> {
  return (await schoolHttp.get(`${s(sid)}/transport`)).data;
}
export async function saveRoutes(sid: string, routes: BusRoute[]): Promise<BusRoute[]> {
  return (await schoolHttp.put<{ routes: BusRoute[] }>(`${s(sid)}/transport`, { routes })).data.routes;
}
export async function deleteBusAlert(sid: string, id: string): Promise<void> {
  await schoolHttp.delete(`${s(sid)}/transport/alerts/${encodeURIComponent(id)}`);
}

// ---------------- library
export async function library(sid: string): Promise<{ books: Book[]; loans: Loan[] }> {
  return (await schoolHttp.get(`${s(sid)}/library`)).data;
}
export async function saveBooks(sid: string, books: Book[]): Promise<Book[]> {
  return (await schoolHttp.put<{ books: Book[] }>(`${s(sid)}/library/books`, { books })).data.books;
}
export async function issueBook(sid: string, bookId: string, studentId: string, dueDate: string): Promise<Loan> {
  return (await schoolHttp.post<{ loan: Loan }>(`${s(sid)}/library/issue`, { bookId, studentId, dueDate })).data.loan;
}
export async function returnBook(sid: string, loanId: string): Promise<Loan> {
  return (await schoolHttp.post<{ loan: Loan }>(`${s(sid)}/library/return/${encodeURIComponent(loanId)}`, {})).data.loan;
}

// ---------------- staff & logins
export async function userList(parents = false): Promise<{ items: AdminUser[]; assignableRoles: UserRole[]; labels: Record<string, string> }> {
  return (await schoolHttp.get("/admin/users", { params: parents ? { role: "parent" } : {} })).data;
}
export async function createUser(u: { username: string; name: string; role: UserRole; schoolId: string; designation: string; phone: string; password: string }): Promise<AdminUser> {
  return (await schoolHttp.post<{ item: AdminUser }>("/admin/users", u)).data.item;
}
export async function updateUser(id: string, change: Partial<{ active: boolean; role: UserRole; password: string; name: string; designation: string; phone: string }>): Promise<AdminUser> {
  return (await schoolHttp.patch<{ item: AdminUser }>(`/admin/users/${encodeURIComponent(id)}`, change)).data.item;
}

// ---------------- online payments (school's own Razorpay keys)
export async function onlinePayments(sid: string): Promise<OnlinePaymentSettings> {
  return (await schoolHttp.get<OnlinePaymentSettings>(`${s(sid)}/online-payments`)).data;
}
export async function saveOnlinePayments(sid: string, body: { enabled: boolean; keyId: string; keySecret?: string }): Promise<OnlinePaymentSettings> {
  return (await schoolHttp.put<OnlinePaymentSettings>(`${s(sid)}/online-payments`, body)).data;
}
