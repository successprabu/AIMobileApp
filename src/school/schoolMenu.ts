/**
 * The School staff menu, grouped like the website's admin sidebar (Overview, Daily work, Campus,
 * Insights, Administration). Used by the side menu and the home screen.
 * `web` items open the website (large editors that need a bigger screen).
 */
import type { SchoolSession } from "../api/school";

export type SchoolScreen =
  | "SchoolHome"
  | "SchoolDashboard"
  | "SchoolAi"
  | "SchoolStudents"
  | "SchoolFees"
  | "SchoolCollectFee"
  | "SchoolAttendance"
  | "SchoolMarks"
  | "SchoolPost"
  | "SchoolAdmissions"
  | "SchoolTransport"
  | "SchoolBusAlert"
  | "SchoolLibrary"
  | "SchoolIdCards"
  | "SchoolReports"
  | "SchoolUsers"
  | "SchoolOnlinePayments"
  | "SchoolSettings";

export type MenuItem = {
  key: string;
  label: string;
  emoji: string;
  tint: string;
  perms: string[];
  superOnly?: boolean;
  screen?: SchoolScreen;
  web?: string;
};

export const SCHOOL_MENU: { section: string; items: MenuItem[] }[] = [
  {
    section: "Overview",
    items: [
      { key: "dash", label: "Dashboard", emoji: "📊", tint: "#e0e7ff", perms: ["dashboard"], screen: "SchoolDashboard" },
      { key: "ai", label: "AI assistant", emoji: "✨", tint: "#f3e8ff", perms: ["ai"], screen: "SchoolAi" },
    ],
  },
  {
    section: "Daily work",
    items: [
      { key: "students", label: "Students", emoji: "🧑‍🎓", tint: "#dbeafe", perms: ["students.view"], screen: "SchoolStudents" },
      { key: "fees", label: "Fees", emoji: "💰", tint: "#d1fae5", perms: ["fees.view", "fees.collect"], screen: "SchoolFees" },
      { key: "att", label: "Attendance", emoji: "✅", tint: "#dcfce7", perms: ["attendance.students", "attendance.staff"], screen: "SchoolAttendance" },
      { key: "marks", label: "Marks", emoji: "📝", tint: "#e0e7ff", perms: ["marks.view", "marks.manage"], screen: "SchoolMarks" },
      { key: "post", label: "Circulars & homework", emoji: "📚", tint: "#fef3c7", perms: ["circulars", "marks.manage", "students.manage"], screen: "SchoolPost" },
      { key: "adm", label: "Enquiries & applications", emoji: "📥", tint: "#fce7f3", perms: ["enquiries"], screen: "SchoolAdmissions" },
    ],
  },
  {
    section: "Campus",
    items: [
      { key: "transport", label: "Transport", emoji: "🚌", tint: "#ffedd5", perms: ["transport"], screen: "SchoolTransport" },
      { key: "library", label: "Library", emoji: "📖", tint: "#fef9c3", perms: ["library"], screen: "SchoolLibrary" },
      { key: "idcards", label: "ID cards & hall tickets", emoji: "🪪", tint: "#e0f2fe", perms: ["students.view"], screen: "SchoolIdCards" },
    ],
  },
  {
    section: "Insights",
    items: [{ key: "reports", label: "Reports", emoji: "📈", tint: "#ede9fe", perms: ["reports"], screen: "SchoolReports" }],
  },
  {
    section: "Administration",
    items: [
      { key: "users", label: "Staff & logins", emoji: "👥", tint: "#f1f5f9", perms: ["users.manage"], screen: "SchoolUsers" },
      { key: "pay", label: "Online payments", emoji: "💳", tint: "#ecfdf5", perms: ["settings.manage"], screen: "SchoolOnlinePayments" },
      { key: "settings", label: "School settings", emoji: "⚙️", tint: "#f1f5f9", perms: ["settings.manage"], screen: "SchoolSettings" },
      { key: "website", label: "Website", emoji: "🌐", tint: "#f1f5f9", perms: ["website.manage", "settings.manage"], web: "website" },
      { key: "schools", label: "Schools & plans", emoji: "🏬", tint: "#f1f5f9", perms: [], superOnly: true, web: "schools" },
      { key: "roles", label: "Roles & access", emoji: "🛡️", tint: "#f1f5f9", perms: [], superOnly: true, web: "roles" },
    ],
  },
];

export function canUse(school: SchoolSession, item: Pick<MenuItem, "perms" | "superOnly">): boolean {
  const sup = school.user.role === "superadmin";
  if (item.superOnly) return sup;
  return sup || item.perms.some((p) => school.permissions.includes(p));
}

export function menuFor(school: SchoolSession) {
  return SCHOOL_MENU.map((g) => ({ section: g.section, items: g.items.filter((i) => canUse(school, i)) })).filter((g) => g.items.length);
}

/** The School stack's navigation, set by the navigator, so the side menu and bottom bar can open screens. */
type StackNav = {
  reset: (state: { index: number; routes: { name: string; params?: object }[] }) => void;
  navigate: (name: string, params?: object) => void;
};
let stack: StackNav | null = null;
export function setSchoolStack(n: StackNav | null) {
  stack = n;
}
/** Opens a menu screen with Home underneath, so Back goes Home and screens never pile up. */
export function openSchoolScreen(name: string, params?: object) {
  if (!stack) return;
  if (name === "SchoolHome") stack.reset({ index: 0, routes: [{ name, params }] });
  else stack.reset({ index: 1, routes: [{ name: "SchoolHome" }, { name, params }] });
}

/** Opens a detail screen on top of the current one (Back returns here). */
export function pushSchoolScreen(name: string, params?: object) {
  stack?.navigate(name, params);
}
