import { call } from "./mahal";

/** Running a hall (API: MahalOpsController): expenses, profit, billing, invoices, reminders, staff logins. */
const R = "MahalOps/";

export type Expense = {
  id: number;
  mahalId: number;
  mahalName?: string;
  bookingId?: number | null;
  expenseDate: string;
  category: string;
  description?: string | null;
  amount: number;
  payMethod?: string | null;
};
export type ExpenseList = { items: Expense[]; total: number; byCategory: { category: string; amount: number }[]; categories: string[] };
export type MonthFigures = { month: string; income: number; expenses: number; profit: number };
export type Profit = MonthFigures & {
  events: number;
  perHall: { mahalId: number; mahalName: string; events: number; income: number; expenses: number; profit: number }[];
  trend: MonthFigures[];
};
export type Billing = {
  mahalId: number;
  gstEnabled: boolean;
  gstin: string;
  gstRate: number;
  payOnline: boolean;
  razorpayKeyId: string;
  /** Empty keeps the saved secret. */
  razorpayKeySecret: string;
};
export type Invoice = {
  invoiceNo: number;
  invoiceNumber: string;
  invoiceDate: string;
  hall: {
    mahalName: string;
    addressLine1?: string | null;
    addressLine2?: string | null;
    landmark?: string | null;
    pincode?: number | null;
    districtName?: string | null;
    stateName?: string | null;
    contactNumber?: string | null;
    gstEnabled?: boolean;
    gstin?: string | null;
    gstRate: number;
  };
  booking: {
    id: number;
    bookingRef?: string | null;
    customerName: string;
    primary_phone: string;
    email?: string | null;
    eventType?: string | null;
    guestCount?: number | null;
    fromDate: string;
    toDate: string;
  };
  /** Hall rent, package and add-on lines (Phase 2); older servers send none. */
  lines?: { label: string; qty: number; amount: number }[];
  amounts: { rent: number; discount: number; total: number; taxable: number; cgst: number; sgst: number; paid: number; balance: number };
  payments: { id: number; amount: number; payMethod?: string | null; date: string; online: boolean }[];
};
export type ReminderKind = "tomorrow" | "balance" | "thanks" | "moitech";
export type Reminder = {
  kind: ReminderKind;
  bookingId: number;
  bookingRef?: string | null;
  customerName: string;
  phone: string;
  eventType?: string | null;
  fromDate: string;
  toDate: string;
  mahalName: string;
  hallPhone?: string | null;
  balance: number;
};
export type Staff = { id: number; name: string; phone: string; isActive: boolean };

export const listExpenses = (params: { mahalId?: number; from: string; to: string }) => call<ExpenseList>("get", `${R}Expenses`, undefined, params);
export const saveExpense = (e: Partial<Expense>) => call<{ id: number }>("post", `${R}SaveExpense`, e);
export const deleteExpense = (id: number) => call<null>("post", `${R}DeleteExpense`, undefined, { id });
/** month: "2026-11". Owner only. */
export const getProfit = (month: string, mahalId?: number) => call<Profit>("get", `${R}Profit`, undefined, { month, mahalId: mahalId || undefined });

export const saveBilling = (b: Billing) => call<Partial<Billing> & { hasRazorpaySecret: boolean }>("post", `${R}SaveBilling`, b);
/** Numbers the invoice the first time it is made. */
export const getInvoice = (bookingId: number) => call<Invoice>("get", `${R}Invoice`, undefined, { bookingId });
export const listReminders = () => call<Reminder[]>("get", `${R}Reminders`);
export const markReminder = (bookingId: number, kind: ReminderKind) => call<null>("post", `${R}Reminders/Mark`, { bookingId, kind });

export const listStaff = () => call<Staff[]>("get", `${R}Staff`);
export const saveStaff = (s: { id: number; name: string; phone: string; password: string; isActive: boolean }) => call<Staff>("post", `${R}SaveStaff`, s);

export const EXPENSE_CATEGORIES = ["Electricity", "Cleaning", "Staff wages", "Repairs", "Generator diesel", "Water", "Maintenance", "Decoration", "Tax", "Other"];
