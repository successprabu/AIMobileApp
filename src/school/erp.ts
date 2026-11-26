/** Copied from the School website (SchoolUI src/app/core/models): keep in step with it. */

export interface FeeItem {
  head: string;
  amount: number;
}

export interface Exam {
  id: string;
  name: string;
  maxMarks: number;
}

export interface SchoolSettings {
  academicYear: string;
  admissionPrefix: string;
  classes: string[];
  sections: string[];
  subjects: string[];
  exams: Exam[];
  passPercent: number;
  attendanceAlertPercent: number;
  requiredStudentFields: string[];
  defaultFees: FeeItem[];
  classFees: Record<string, FeeItem[]>;
  paymentModes: string[];
  staffDesignations: string[];
}

export interface StudentField {
  key: string;
  label: string;
  locked?: boolean;
}

export interface Student {
  id: string;
  admissionNo: string;
  status: 'Active' | 'Left' | 'Alumni';
  name: string;
  gender?: string;
  dob?: string;
  className: string;
  section?: string;
  rollNo?: string;
  admissionDate?: string;
  parentName: string;
  relation?: string;
  parentPhone: string;
  altPhone?: string;
  parentEmail?: string;
  parentOccupation?: string;
  address?: string;
  bloodGroup?: string;
  aadhaarNo?: string;
  transportRoute?: string;
  previousSchool?: string;
  medicalNotes?: string;
  concession?: number;
  /** A photo was uploaded for the ID card (served privately). */
  hasPhoto?: boolean;
  demo?: boolean;
  createdAt: string;
}

export interface Payment {
  id: string;
  receiptNo: string;
  studentId: string;
  studentName: string;
  admissionNo: string;
  className: string;
  section: string;
  academicYear: string;
  date: string;
  amount: number;
  mode: string;
  head: string;
  reference: string;
  note: string;
  collectedBy: string;
  createdAt: string;
}

export interface FeeSummary {
  items: FeeItem[];
  concession: number;
  total: number;
  paid: number;
  balance: number;
}

export interface AttendanceSummary {
  days: number;
  present: number;
  percent: number | null;
  absences: { date: string; status: string }[];
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

export interface StudentDetail {
  student: Student;
  fees: FeeSummary;
  payments: Payment[];
  attendance: AttendanceSummary;
  marks: ExamResult[];
  parentAccount: { id: string; username: string; mustChangePassword: boolean; lastLoginAt: string | null } | null;
}

export type AttendanceStatus = 'P' | 'A' | 'L' | 'H';
/** date -> (studentId | userId) -> status */
export type AttendanceBook = Record<string, Record<string, AttendanceStatus>>;

export interface MarksData {
  /** examId -> studentId -> subject -> mark */
  marks: Record<string, Record<string, Record<string, number>>>;
  /** examId -> studentId -> remark */
  remarks: Record<string, Record<string, string>>;
}

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  designation: string;
  active?: boolean;
  phone?: string;
}

export interface SchoolData {
  today: string;
  settings: SchoolSettings;
  students: Student[];
  payments: Payment[];
  attendanceStudents: AttendanceBook;
  attendanceStaff: AttendanceBook;
  marks: MarksData;
  enquiries: { id: string; type: string; status: string; createdAt: string; grade: string; parentName: string }[];
  staff: StaffMember[];
  parents: { id: string; username: string; mustChangePassword: boolean; lastLoginAt: string | null; children: string[] }[];
}

export interface ParentChild {
  school: { id: string; label: string };
  student: Student;
  settings: Pick<SchoolSettings, 'academicYear' | 'exams' | 'subjects' | 'passPercent' | 'attendanceAlertPercent'>;
  fees: FeeSummary;
  payments: Payment[];
  attendance: Record<string, AttendanceStatus>;
  attendanceSummary: AttendanceSummary;
  marks: ExamResult[];
}

export interface AiResult {
  text: string;
  source: 'ai' | 'built-in';
}

export interface PermissionDef {
  key: string;
  label: string;
  group: string;
}

export interface RolesResponse {
  roles: Record<string, { label: string; permissions: string[] }>;
  permissions: PermissionDef[];
  labels: Record<string, string>;
}

export function gradeFor(percent: number | null): string {
  if (percent === null) return '-';
  if (percent >= 91) return 'A1';
  if (percent >= 81) return 'A2';
  if (percent >= 71) return 'B1';
  if (percent >= 61) return 'B2';
  if (percent >= 51) return 'C1';
  if (percent >= 41) return 'C2';
  if (percent >= 33) return 'D';
  return 'E';
}

export const ATTENDANCE_LABELS: Record<AttendanceStatus, string> = { P: 'Present', A: 'Absent', L: 'Leave', H: 'Half day' };

export type ApplicationStatus = 'Submitted' | 'Under review' | 'Visit scheduled' | 'Approved' | 'Admitted' | 'Rejected';

export interface ApplicationForm {
  open: boolean;
  session: string;
  classes: string[];
  documents: string[];
}
export interface ApplicationInput {
  student: { name: string; dob: string; gender: string; className: string; previousSchool: string };
  parent: { name: string; relation: string; phone: string; email: string; occupation: string };
  address: string;
  message: string;
  documents: { label: string; fileId: string }[];
  consent: boolean;
  website?: string;
}
export interface Application extends Omit<ApplicationInput, 'consent' | 'website'> {
  id: string;
  applicationNo: string;
  session: string;
  status: ApplicationStatus;
  publicNote: string;
  createdAt: string;
  updatedAt: string;
  studentId?: string;
  admissionNo?: string;
  history: { status: string; at: string; by: string; note: string }[];
}
export interface OnlinePaymentSettings {
  enabled: boolean;
  keyId: string;
  hasSecret: boolean;
  updatedAt?: string | null;
}
export interface BusStop {
  name: string;
  morning: string;
  evening: string;
}
export interface BusRoute {
  id?: string;
  name: string;
  vehicleNo: string;
  driverName: string;
  driverPhone: string;
  attendantName: string;
  fee: number;
  stops: BusStop[];
  /** studentId → stop name */
  students: Record<string, string>;
}
export interface BusAlert {
  id: string;
  routeId: string;
  routeName: string;
  text: string;
  date: string;
  at: string;
  by: string;
}
export interface Book {
  id?: string;
  accessionNo: string;
  title: string;
  author: string;
  category: string;
  copies: number;
  shelf: string;
}
export interface Loan {
  id: string;
  bookId: string;
  title: string;
  accessionNo: string;
  studentId: string;
  studentName: string;
  className: string;
  issuedOn: string;
  dueDate: string;
  returnedAt: string | null;
  issuedBy: string;
}
export type UserRole = 'superadmin' | 'admin' | 'teacher' | 'nonteaching' | 'parent';
export interface AdminUser {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  /** School id, or '*' for the super admin. */
  schoolId: string;
  phone: string;
  active: boolean;
  mustChangePassword: boolean;
  /** Per-user access set by the super admin (null = role default). */
  permissions: string[] | null;
  children?: { schoolId: string; studentId: string }[];
  designation?: string;
  createdAt: string;
  lastLoginAt: string | null;
}

export const inr = (n: number | null | undefined) => '₹' + Math.round(n ?? 0).toLocaleString('en-IN');
