/**
 * Report calculations (pure functions over the school data from /api/schools/:sid/data).
 */
import { AttendanceBook, FeeItem, SchoolData, SchoolSettings, Student, gradeFor, inr } from './erp';

export type Cell = string | number | null;

export interface ReportFilters {
  className: string;
  section: string;
  examId: string;
  month: string; // yyyy-MM
  from: string;
  to: string;
  date: string;
  studentId: string;
}

export interface Bar {
  label: string;
  value: number;
  display: string;
}

export interface ReportResult {
  columns: string[];
  rows: Cell[][];
  summary?: { label: string; value: string | number }[];
  bars?: Bar[];
  note?: string;
}

const ROLE_NAMES: Record<string, string> = { admin: 'School admin', teacher: 'Teaching staff', nonteaching: 'Non-teaching staff' };

export type FilterKey = keyof ReportFilters;

export interface ReportDef {
  id: string;
  title: string;
  group: 'Students' | 'Fees' | 'Attendance' | 'Exams' | 'Admin';
  icon: string;
  description: string;
  filters: FilterKey[];
  /** Hidden unless the user has this permission (besides "reports"). */
  needs?: string;
  run: (d: SchoolData, f: ReportFilters) => ReportResult;
}

// ------------------------------------------------------------------ helpers

export function feeItemsFor(settings: SchoolSettings, className: string): FeeItem[] {
  const items = settings.classFees?.[className];
  return items && items.length ? items : settings.defaultFees;
}

export function feeTotalFor(settings: SchoolSettings, s: Student): number {
  return feeItemsFor(settings, s.className).reduce((t, i) => t + (Number(i.amount) || 0), 0) - (Number(s.concession) || 0);
}

export function attendancePct(book: AttendanceBook, id: string, from = '', to = '9999'): { days: number; present: number; pct: number | null } {
  let days = 0;
  let present = 0;
  for (const [d, r] of Object.entries(book)) {
    if (d < from || d > to) continue;
    const v = r[id];
    if (!v) continue;
    days++;
    if (v === 'P') present++;
    else if (v === 'H') present += 0.5;
  }
  return { days, present, pct: days ? Math.round((present / days) * 1000) / 10 : null };
}

export function examResult(d: SchoolData, examId: string, s: Student) {
  const ex = d.settings.exams.find((e) => e.id === examId);
  const row = d.marks.marks?.[examId]?.[s.id] ?? {};
  const marks = d.settings.subjects.map((sub) => (typeof row[sub] === 'number' ? row[sub] : null));
  const entered = marks.filter((m): m is number => m !== null);
  const total = entered.reduce((t, m) => t + m, 0);
  const max = entered.length * (ex?.maxMarks ?? 100);
  const pct = max ? Math.round((total / max) * 1000) / 10 : null;
  const failed = d.settings.subjects.filter((sub, i) => {
    const m = marks[i];
    return m !== null && ex && (m / ex.maxMarks) * 100 < d.settings.passPercent;
  });
  return { ex, marks, total, max, pct, failed, entered: entered.length };
}

const byClass = (d: SchoolData) => (a: Student, b: Student) =>
  d.settings.classes.indexOf(a.className) - d.settings.classes.indexOf(b.className) ||
  (a.section ?? '').localeCompare(b.section ?? '') ||
  a.name.localeCompare(b.name);

function pick(d: SchoolData, f: ReportFilters, activeOnly = true): Student[] {
  return d.students
    .filter((s) => (!activeOnly || s.status === 'Active') && (!f.className || s.className === f.className) && (!f.section || s.section === f.section))
    .sort(byClass(d));
}

const pctStr = (p: number | null) => (p === null ? '—' : `${p}%`);
const monthName = (m: string) => new Date(m + '-01T00:00:00').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
const daysIn = (m: string) => {
  const [y, mo] = m.split('-').map(Number);
  return new Date(y, mo, 0).getDate();
};

/** Shared numbers for the dashboard and several reports. */
export function computeStudentStats(d: SchoolData) {
  const active = d.students.filter((s) => s.status === 'Active');
  let feeTotal = 0;
  let paidTotal = 0;
  const paidBy = new Map<string, number>();
  for (const p of d.payments) if (p.academicYear === d.settings.academicYear) paidBy.set(p.studentId, (paidBy.get(p.studentId) ?? 0) + p.amount);
  const defaulters: { s: Student; total: number; paid: number; balance: number }[] = [];
  const lowAttendance: { s: Student; pct: number }[] = [];
  const belowPass: { s: Student; subjects: string[]; exam: string }[] = [];
  const lastExam = [...d.settings.exams].reverse().find((e) => Object.keys(d.marks.marks?.[e.id] ?? {}).length);
  for (const s of active) {
    const total = feeTotalFor(d.settings, s);
    const paid = paidBy.get(s.id) ?? 0;
    feeTotal += total;
    paidTotal += paid;
    if (total - paid > 0) defaulters.push({ s, total, paid, balance: total - paid });
    const a = attendancePct(d.attendanceStudents, s.id);
    if (a.pct !== null && a.pct < d.settings.attendanceAlertPercent) lowAttendance.push({ s, pct: a.pct });
    if (lastExam) {
      const r = examResult(d, lastExam.id, s);
      if (r.failed.length) belowPass.push({ s, subjects: r.failed, exam: lastExam.name });
    }
  }
  defaulters.sort((a, b) => b.balance - a.balance);
  lowAttendance.sort((a, b) => a.pct - b.pct);
  return { active, feeTotal, paidTotal, duesTotal: Math.max(0, feeTotal - paidTotal), defaulters, lowAttendance, belowPass, lastExam };
}

// ------------------------------------------------------------------ reports

export const REPORTS: ReportDef[] = [
  // ---------------- Students
  {
    id: 'strength',
    title: 'Class-wise strength',
    group: 'Students',
    icon: 'groups',
    description: 'Boys, girls and total students in every class and section.',
    filters: [],
    run: (d) => {
      const rows: Cell[][] = [];
      const bars: Bar[] = [];
      let tb = 0,
        tg = 0;
      for (const c of d.settings.classes) {
        const inC = d.students.filter((s) => s.status === 'Active' && s.className === c);
        if (!inC.length) continue;
        const secs = Array.from(new Set(inC.map((s) => s.section || '-'))).sort();
        for (const sec of secs) {
          const x = inC.filter((s) => (s.section || '-') === sec);
          const b = x.filter((s) => s.gender === 'Male').length;
          const g = x.filter((s) => s.gender === 'Female').length;
          tb += b;
          tg += g;
          rows.push([c, sec, b, g, x.length - b - g, x.length]);
        }
        bars.push({ label: c, value: inC.length, display: String(inC.length) });
      }
      return {
        columns: ['Class', 'Section', 'Boys', 'Girls', 'Other / not set', 'Total'],
        rows,
        bars,
        summary: [
          { label: 'Total students', value: tb + tg + rows.reduce((t, r) => t + Number(r[4]), 0) },
          { label: 'Boys', value: tb },
          { label: 'Girls', value: tg },
        ],
      };
    },
  },
  {
    id: 'directory',
    title: 'Student directory',
    group: 'Students',
    icon: 'contacts',
    description: 'All students with parent contact details. Filter by class.',
    filters: ['className', 'section'],
    run: (d, f) => ({
      columns: ['Adm. no', 'Name', 'Class', 'Sec', 'Roll', 'Gender', 'DOB', 'Parent', 'Mobile', 'Transport', 'Blood'],
      rows: pick(d, f).map((s) => [s.admissionNo, s.name, s.className, s.section ?? '', s.rollNo ?? '', s.gender ?? '', s.dob ?? '', s.parentName, s.parentPhone, s.transportRoute ?? '', s.bloodGroup ?? '']),
    }),
  },
  {
    id: 'admissions',
    title: 'Admissions by month',
    group: 'Students',
    icon: 'how_to_reg',
    description: 'New admissions per month and the students admitted.',
    filters: [],
    run: (d) => {
      const map = new Map<string, Student[]>();
      for (const s of d.students) {
        const m = (s.admissionDate || s.createdAt || '').slice(0, 7);
        if (m) map.set(m, [...(map.get(m) ?? []), s]);
      }
      const months = [...map.keys()].sort();
      return {
        columns: ['Month', 'Admissions', 'Students'],
        rows: months.map((m) => [monthName(m), map.get(m)!.length, map.get(m)!.map((s) => `${s.name} (${s.className})`).join(', ')]),
        bars: months.map((m) => ({ label: monthName(m), value: map.get(m)!.length, display: String(map.get(m)!.length) })),
      };
    },
  },
  {
    id: 'birthdays',
    title: 'Birthdays this month',
    group: 'Students',
    icon: 'cake',
    description: 'Students with birthdays in the selected month — great for wishes at assembly.',
    filters: ['month'],
    run: (d, f) => {
      const mm = f.month.slice(5, 7);
      const list = d.students.filter((s) => s.status === 'Active' && s.dob && s.dob.slice(5, 7) === mm).sort((a, b) => (a.dob ?? '').slice(8).localeCompare((b.dob ?? '').slice(8)));
      return {
        columns: ['Date', 'Name', 'Class', 'Turns'],
        rows: list.map((s) => [`${Number(s.dob!.slice(8))} ${monthName(f.month).split(' ')[0]}`, s.name, `${s.className} ${s.section ?? ''}`, Number(f.month.slice(0, 4)) - Number(s.dob!.slice(0, 4))]),
      };
    },
  },

  // ---------------- Fees
  {
    id: 'fee-collection',
    title: 'Fee collection register',
    group: 'Fees',
    icon: 'receipt_long',
    description: 'Every receipt in a date range with mode-wise totals.',
    filters: ['from', 'to', 'className'],
    run: (d, f) => {
      const list = d.payments.filter((p) => p.date >= f.from && p.date <= f.to && (!f.className || p.className === f.className)).sort((a, b) => a.date.localeCompare(b.date) || a.receiptNo.localeCompare(b.receiptNo));
      const modes = new Map<string, number>();
      for (const p of list) modes.set(p.mode, (modes.get(p.mode) ?? 0) + p.amount);
      const total = list.reduce((t, p) => t + p.amount, 0);
      return {
        columns: ['Receipt', 'Date', 'Student', 'Adm. no', 'Class', 'For', 'Mode', 'Amount', 'Collected by'],
        rows: list.map((p) => [p.receiptNo, p.date, p.studentName, p.admissionNo, `${p.className} ${p.section}`, p.head, p.mode, p.amount, p.collectedBy]),
        summary: [{ label: 'Total collected', value: inr(total) }, { label: 'Receipts', value: list.length }, ...[...modes].map(([m, v]) => ({ label: m, value: inr(v) }))],
        bars: [...modes].map(([m, v]) => ({ label: m, value: v, display: inr(v) })),
      };
    },
  },
  {
    id: 'fee-dues',
    title: 'Fee dues (defaulters)',
    group: 'Fees',
    icon: 'pending_actions',
    description: 'Students with pending fees, highest first, with parent mobile numbers.',
    filters: ['className', 'section'],
    run: (d, f) => {
      const stats = computeStudentStats(d);
      const list = stats.defaulters.filter((x) => (!f.className || x.s.className === f.className) && (!f.section || x.s.section === f.section));
      const total = list.reduce((t, x) => t + x.balance, 0);
      return {
        columns: ['Name', 'Adm. no', 'Class', 'Parent', 'Mobile', 'Total fee', 'Paid', 'Balance'],
        rows: list.map((x) => [x.s.name, x.s.admissionNo, `${x.s.className} ${x.s.section ?? ''}`, x.s.parentName, x.s.parentPhone, x.total, x.paid, x.balance]),
        summary: [
          { label: 'Students with dues', value: list.length },
          { label: 'Total pending', value: inr(total) },
        ],
      };
    },
  },
  {
    id: 'fee-class',
    title: 'Class-wise fee summary',
    group: 'Fees',
    icon: 'account_balance',
    description: 'Expected fees, collection and balance for every class.',
    filters: [],
    run: (d) => {
      const stats = computeStudentStats(d);
      const rows: Cell[][] = [];
      const bars: Bar[] = [];
      for (const c of d.settings.classes) {
        const inC = stats.active.filter((s) => s.className === c);
        if (!inC.length) continue;
        const exp = inC.reduce((t, s) => t + feeTotalFor(d.settings, s), 0);
        const paid = d.payments.filter((p) => p.academicYear === d.settings.academicYear && inC.some((s) => s.id === p.studentId)).reduce((t, p) => t + p.amount, 0);
        const pct = exp ? Math.round((paid / exp) * 100) : 0;
        rows.push([c, inC.length, exp, paid, Math.max(0, exp - paid), `${pct}%`]);
        bars.push({ label: c, value: pct, display: `${pct}%` });
      }
      return {
        columns: ['Class', 'Students', 'Expected', 'Collected', 'Balance', '% collected'],
        rows,
        bars,
        summary: [
          { label: 'Expected', value: inr(stats.feeTotal) },
          { label: 'Collected', value: inr(stats.paidTotal) },
          { label: 'Balance', value: inr(stats.duesTotal) },
        ],
      };
    },
  },
  {
    id: 'fee-monthly',
    title: 'Monthly collection trend',
    group: 'Fees',
    icon: 'trending_up',
    description: 'Fees collected each month of the academic year.',
    filters: [],
    run: (d) => {
      const map = new Map<string, number>();
      for (const p of d.payments) if (p.academicYear === d.settings.academicYear) map.set(p.date.slice(0, 7), (map.get(p.date.slice(0, 7)) ?? 0) + p.amount);
      const months = [...map.keys()].sort();
      return {
        columns: ['Month', 'Collected'],
        rows: months.map((m) => [monthName(m), map.get(m)!]),
        bars: months.map((m) => ({ label: monthName(m), value: map.get(m)!, display: inr(map.get(m)!) })),
      };
    },
  },

  // ---------------- Attendance
  {
    id: 'att-daily',
    title: 'Daily attendance (class-wise)',
    group: 'Attendance',
    icon: 'today',
    description: 'Present, absent and leave counts for every class on a day.',
    filters: ['date'],
    run: (d, f) => {
      const rec = d.attendanceStudents[f.date] ?? {};
      const rows: Cell[][] = [];
      let tp = 0,
        tm = 0;
      for (const c of d.settings.classes) {
        const inC = d.students.filter((s) => s.status === 'Active' && s.className === c);
        if (!inC.length) continue;
        const cnt = { P: 0, A: 0, L: 0, H: 0 } as Record<string, number>;
        let marked = 0;
        for (const s of inC) {
          const v = rec[s.id];
          if (v) {
            cnt[v]++;
            marked++;
          }
        }
        const pres = cnt['P'] + cnt['H'] * 0.5;
        tp += pres;
        tm += marked;
        rows.push([c, inC.length, marked, cnt['P'], cnt['A'], cnt['L'], cnt['H'], marked ? `${Math.round((pres / marked) * 100)}%` : 'Not marked']);
      }
      return {
        columns: ['Class', 'Strength', 'Marked', 'Present', 'Absent', 'Leave', 'Half day', 'Attendance'],
        rows,
        summary: [{ label: 'School attendance', value: tm ? `${Math.round((tp / tm) * 100)}%` : 'Not marked' }],
      };
    },
  },
  {
    id: 'att-register',
    title: 'Monthly attendance register',
    group: 'Attendance',
    icon: 'calendar_month',
    description: 'Day-by-day register for a class (P / A / L / H) with monthly %.',
    filters: ['className', 'section', 'month'],
    run: (d, f) => {
      const n = daysIn(f.month);
      const days = Array.from({ length: n }, (_, i) => `${f.month}-${String(i + 1).padStart(2, '0')}`);
      const list = pick(d, f);
      return {
        columns: ['Name', ...days.map((x) => String(Number(x.slice(8)))), '%'],
        rows: list.map((s) => {
          const a = attendancePct(d.attendanceStudents, s.id, days[0], days[n - 1]);
          return [s.name, ...days.map((x) => d.attendanceStudents[x]?.[s.id] ?? ''), pctStr(a.pct)];
        }),
        note: f.className ? undefined : 'Tip: choose a class to keep the register readable.',
      };
    },
  },
  {
    id: 'att-low',
    title: 'Low attendance alert',
    group: 'Attendance',
    icon: 'notification_important',
    description: 'Students below the school attendance target in a date range.',
    filters: ['from', 'to', 'className'],
    run: (d, f) => {
      const rows = pick(d, f)
        .map((s) => ({ s, a: attendancePct(d.attendanceStudents, s.id, f.from, f.to) }))
        .filter((x) => x.a.pct !== null && x.a.pct < d.settings.attendanceAlertPercent)
        .sort((a, b) => (a.a.pct ?? 0) - (b.a.pct ?? 0));
      return {
        columns: ['Name', 'Class', 'Days marked', 'Present', 'Attendance', 'Parent', 'Mobile'],
        rows: rows.map((x) => [x.s.name, `${x.s.className} ${x.s.section ?? ''}`, x.a.days, x.a.present, pctStr(x.a.pct), x.s.parentName, x.s.parentPhone]),
        summary: [{ label: `Below ${d.settings.attendanceAlertPercent}%`, value: rows.length }],
      };
    },
  },
  {
    id: 'att-staff',
    title: 'Staff attendance (monthly)',
    group: 'Attendance',
    icon: 'badge',
    description: 'Teaching and non-teaching staff attendance for a month.',
    filters: ['month'],
    run: (d, f) => {
      const from = `${f.month}-01`;
      const to = `${f.month}-${daysIn(f.month)}`;
      return {
        columns: ['Name', 'Role', 'Designation', 'Present', 'Absent', 'Leave', 'Half day', 'Attendance'],
        rows: d.staff.map((st) => {
          const c = { P: 0, A: 0, L: 0, H: 0 } as Record<string, number>;
          for (const [dt, r] of Object.entries(d.attendanceStaff)) if (dt >= from && dt <= to && r[st.id]) c[r[st.id]]++;
          const a = attendancePct(d.attendanceStaff, st.id, from, to);
          return [st.name, ROLE_NAMES[st.role] ?? st.role, st.designation, c['P'], c['A'], c['L'], c['H'], pctStr(a.pct)];
        }),
      };
    },
  },

  // ---------------- Exams
  {
    id: 'exam-rank',
    title: 'Rank list',
    group: 'Exams',
    icon: 'military_tech',
    description: 'Class ranks with total, percentage, grade and result for an exam.',
    filters: ['examId', 'className', 'section'],
    run: (d, f) => {
      const ranked = pick(d, f)
        .map((s) => ({ s, r: examResult(d, f.examId, s) }))
        .filter((x) => x.r.entered)
        .sort((a, b) => (b.r.pct ?? 0) - (a.r.pct ?? 0));
      return {
        columns: ['Rank', 'Name', 'Class', ...d.settings.subjects, 'Total', '%', 'Grade', 'Result'],
        rows: ranked.map((x, i) => [i + 1, x.s.name, `${x.s.className} ${x.s.section ?? ''}`, ...x.r.marks, `${x.r.total}/${x.r.max}`, x.r.pct, gradeFor(x.r.pct), x.r.failed.length ? `Below pass: ${x.r.failed.join(', ')}` : 'Pass']),
        summary: [
          { label: 'Students', value: ranked.length },
          { label: 'Pass %', value: ranked.length ? `${Math.round((ranked.filter((x) => !x.r.failed.length).length / ranked.length) * 100)}%` : '—' },
          { label: 'Class average', value: ranked.length ? `${Math.round((ranked.reduce((t, x) => t + (x.r.pct ?? 0), 0) / ranked.length) * 10) / 10}%` : '—' },
        ],
      };
    },
  },
  {
    id: 'exam-subject',
    title: 'Subject analysis',
    group: 'Exams',
    icon: 'insights',
    description: 'Average, highest, lowest and pass % per subject.',
    filters: ['examId', 'className'],
    run: (d, f) => {
      const ex = d.settings.exams.find((e) => e.id === f.examId);
      const list = pick(d, f);
      const bars: Bar[] = [];
      const rows = d.settings.subjects.map((sub) => {
        const ms = list.map((s) => d.marks.marks?.[f.examId]?.[s.id]?.[sub]).filter((m): m is number => typeof m === 'number');
        const max = ex?.maxMarks ?? 100;
        const avg = ms.length ? ms.reduce((t, m) => t + m, 0) / ms.length : null;
        const pass = ms.filter((m) => (m / max) * 100 >= d.settings.passPercent).length;
        const top = list.filter((s) => d.marks.marks?.[f.examId]?.[s.id]?.[sub] === Math.max(...ms)).map((s) => s.name)[0] ?? '';
        if (avg !== null) bars.push({ label: sub, value: Math.round((avg / max) * 100), display: `${Math.round((avg / max) * 100)}%` });
        return [sub, ms.length, avg === null ? '—' : Math.round(avg * 10) / 10, ms.length ? Math.max(...ms) : '—', ms.length ? Math.min(...ms) : '—', ms.length ? `${Math.round((pass / ms.length) * 100)}%` : '—', top];
      });
      return { columns: ['Subject', 'Students', 'Average', 'Highest', 'Lowest', 'Pass %', 'Topper'], rows, bars };
    },
  },
  {
    id: 'exam-progress',
    title: 'Progress across exams',
    group: 'Exams',
    icon: 'show_chart',
    description: 'Each student’s percentage in every exam, to spot improvement or decline.',
    filters: ['className', 'section'],
    run: (d, f) => {
      const exams = d.settings.exams;
      return {
        columns: ['Name', 'Class', ...exams.map((e) => e.name), 'Change'],
        rows: pick(d, f).map((s) => {
          const ps = exams.map((e) => examResult(d, e.id, s).pct);
          const got = ps.filter((p): p is number => p !== null);
          const change = got.length > 1 ? Math.round((got[got.length - 1] - got[got.length - 2]) * 10) / 10 : null;
          return [s.name, `${s.className} ${s.section ?? ''}`, ...ps.map(pctStr), change === null ? '—' : `${change > 0 ? '▲' : change < 0 ? '▼' : ''} ${Math.abs(change)}`];
        }),
      };
    },
  },

  // ---------------- Admin
  {
    id: 'enquiries',
    title: 'Enquiry conversion',
    group: 'Admin',
    icon: 'filter_alt',
    description: 'Website enquiries by status and month — how many became admissions.',
    filters: [],
    run: (d) => {
      const statuses = ['New', 'Contacted', 'Visit Scheduled', 'Admitted', 'Closed'];
      const months = Array.from(new Set(d.enquiries.map((e) => e.createdAt.slice(0, 7)))).sort();
      const admitted = d.enquiries.filter((e) => e.status === 'Admitted').length;
      return {
        columns: ['Month', ...statuses, 'Total'],
        rows: months.map((m) => {
          const x = d.enquiries.filter((e) => e.createdAt.startsWith(m));
          return [monthName(m), ...statuses.map((s) => x.filter((e) => e.status === s).length), x.length];
        }),
        bars: statuses.map((s) => ({ label: s, value: d.enquiries.filter((e) => e.status === s).length, display: String(d.enquiries.filter((e) => e.status === s).length) })),
        summary: [
          { label: 'Total enquiries', value: d.enquiries.length },
          { label: 'Admitted', value: admitted },
          { label: 'Conversion', value: d.enquiries.length ? `${Math.round((admitted / d.enquiries.length) * 100)}%` : '—' },
        ],
      };
    },
  },
  {
    id: 'parent-app',
    title: 'Parent login usage',
    group: 'Admin',
    icon: 'phonelink',
    description: 'Which parents have started using the parent portal.',
    filters: ['className'],
    run: (d, f) => {
      const list = pick(d, f);
      const rows = list.map((s) => {
        const p = d.parents.find((x) => x.children.includes(s.id));
        return [s.name, `${s.className} ${s.section ?? ''}`, s.parentName, p?.username ?? '—', p ? (p.lastLoginAt ? p.lastLoginAt.slice(0, 10) : 'Never') : 'No login', p ? (p.mustChangePassword ? 'Not yet' : 'Yes') : '—'];
      });
      const used = rows.filter((r) => r[5] === 'Yes').length;
      return {
        columns: ['Student', 'Class', 'Parent', 'Login (mobile)', 'Last login', 'Set own password'],
        rows,
        summary: [{ label: 'Parents active on portal', value: `${used} of ${rows.length}` }],
      };
    },
  },
  {
    id: 'staff-list',
    title: 'Staff list',
    group: 'Admin',
    icon: 'badge',
    description: 'Teaching and non-teaching staff with roles.',
    filters: [],
    run: (d) => ({
      columns: ['Name', 'Role', 'Designation', 'Status'],
      rows: d.staff.map((s) => [s.name, ROLE_NAMES[s.role] ?? s.role, s.designation, s.active === false ? 'Inactive' : 'Active']),
    }),
  },
];
