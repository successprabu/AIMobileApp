import { call } from "./admin";

/**
 * "Moi we gave" (API: MoiGiven/*), same as the website: moi the admin gave at other people's functions, and
 * the give & take comparison with what they gave at our functions. Admin / super admin only.
 */
export type GivenEntry = {
  id: number;
  name: string;
  initial?: string | null;
  place?: string | null;
  phone?: string | null;
  amount: number;
  eventName?: string | null;
  eventDate?: string | null;
  remarks?: string | null;
};
export type GiveStatus = "theyMore" | "weMore" | "even" | "onlyWe" | "onlyThey";
export type GivePerson = {
  key: string;
  name: string;
  initial?: string | null;
  place?: string | null;
  phone?: string | null;
  weGave: number;
  theyGave: number;
  difference: number;
  status: GiveStatus;
  gave: { id: number; amount: number; eventName?: string | null; eventDate?: string | null }[];
  got: { id: number; amount: number; functionName?: string | null }[];
};
export type GiveCompare = {
  items: GivePerson[];
  counts: Record<"all" | GiveStatus, number>;
  totals: { weGave: number; theyGave: number };
  functions: { id: number; functionName: string; functionDate?: string }[];
};

export const listGiven = () => call<{ items: GivenEntry[]; total: number; all: number; totalAmount: number }>("get", "MoiGiven/List", undefined, { page_size: 500 });
export const saveGiven = (entry: Omit<GivenEntry, "amount"> & { amount: number }) => call<GivenEntry>("post", "MoiGiven/Save", entry);
export const deleteGiven = (id: number) => call<unknown>("post", "MoiGiven/Delete", undefined, { id });
export const linkGiven = (givenId: number, transactionId: number) => call<unknown>("post", "MoiGiven/Link", { givenId, transactionId });
export const compareGiven = (functionId?: number) => call<GiveCompare>("get", "MoiGiven/Compare", undefined, { function_id: functionId || undefined });

export const STATUS_LABEL: Record<GiveStatus, { label: string; color: string }> = {
  theyMore: { label: "They gave more", color: "#16a34a" },
  weMore: { label: "We gave more", color: "#d97706" },
  even: { label: "Even", color: "#0ea5e9" },
  onlyWe: { label: "Only we gave", color: "#8b5cf6" },
  onlyThey: { label: "Only they gave", color: "#6366f1" },
};

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
export { inr };

/** What to tell the admin about one person (same wording as the website). */
export const advice = (p: GivePerson): string => {
  switch (p.status) {
    case "theyMore":
      return `They gave ${inr(p.difference)} more than we did. Return at least ${inr(p.theyGave)} at their next function.`;
    case "onlyThey":
      return `We have not given them yet. Return at least ${inr(p.theyGave)} at their next function.`;
    case "weMore":
      return `We gave ${inr(-p.difference)} more than they gave us.`;
    case "onlyWe":
      return "They have not given at our functions yet.";
    default:
      return "Even: we gave the same as they gave us.";
  }
};
