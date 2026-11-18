import { call } from "./admin";

/** Moitech history (API: Transaction/History), read only. Admin / super admin only. */
export type HistoryItem = {
  id: number;
  entity: "Receipt" | "Expense" | "Others" | "Handover" | "Given";
  recordId: number;
  action: "Added" | "Edited" | "Deleted" | "Restored" | "Handover";
  name?: string | null;
  place?: string | null;
  amountBefore?: number | null;
  amountAfter?: number | null;
  changes?: { field: string; from?: string | null; to?: string | null }[] | null;
  snapshot?: Record<string, string | null> | null;
  changedById?: number | null;
  changedByName?: string | null;
  claimedBy?: string | null;
  changedAt: string;
};
export type HistoryPerson = { changedById?: number | null; name?: string | null; added: number; edited: number; deleted: number; restored: number; handovers: number; reduced: number; last: string };
export type HistoryPage = {
  items: HistoryItem[];
  total: number;
  counts: Record<"all" | "added" | "edited" | "deleted" | "restored" | "handover", number>;
  people: HistoryPerson[];
};

export const listHistory = (params: Record<string, unknown>) => call<HistoryPage>("get", "Transaction/History", undefined, params);
