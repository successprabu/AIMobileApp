import type { HandoverListRow, OverallSummaryRow, OthersSummaryRow } from "../types/handover";

export function calculateTotals(data: OverallSummaryRow[]) {
  return data.reduce(
    (acc, item) => {
      if (item.type === "R") acc.receipt += item.total;
      else if (item.type === "E") acc.expense += item.total;
      else if (item.type === "O") acc.others += item.total;
      return acc;
    },
    { receipt: 0, expense: 0, others: 0 }
  );
}

export function calculateOthersTotals(data: OthersSummaryRow[]) {
  return data.reduce((acc, item) => acc + item.totalOthers, 0);
}

/** Per-user rollup for handover table (matches web `Handover.jsx`). */
export function calculateOverallTotals(data: OverallSummaryRow[]): HandoverListRow[] {
  const userTotals = data.reduce<
    Record<string, { receipt: number; expense: number; others: number; createdById: string }>
  >((acc, item) => {
    const key = item.createdBy;
    if (!acc[key]) {
      acc[key] = { receipt: 0, expense: 0, others: 0, createdById: item.createdById };
    }
    if (item.type === "R") acc[key].receipt += item.total;
    else if (item.type === "E") acc[key].expense += item.total;
    else if (item.type === "O") acc[key].others += item.total;
    acc[key].createdById = item.createdById;
    return acc;
  }, {});

  return Object.entries(userTotals).map(([username, totals], index) => ({
    sNo: index + 1,
    userId: totals.createdById,
    username,
    receipt: totals.receipt,
    expense: totals.expense,
    others: totals.others,
    total: totals.receipt + totals.others - totals.expense,
  }));
}
