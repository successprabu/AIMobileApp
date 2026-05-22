import type { RegionalReportApiResponse, RegionalSummaryRow } from "../types/report";

function normalizeRegionalRow(raw: Record<string, unknown>): RegionalSummaryRow {
  return {
    villageName: String(
      raw.villageName ?? raw.placeName ?? raw.village ?? raw.name ?? ""
    ),
    total: Number(raw.total ?? raw.amount ?? 0),
  };
}

/** Web returns `data` as an array of { villageName, total } (not `transactions`). */
export function parseRegionalReportResponse(json: RegionalReportApiResponse): {
  rows: RegionalSummaryRow[];
  totalPages: number;
  message?: string;
} {
  if (!json.result) {
    return { rows: [], totalPages: 1, message: json.message };
  }

  const d = json.data;
  let rows: RegionalSummaryRow[] = [];
  let totalPages = json.totalPages ?? 1;

  if (Array.isArray(d)) {
    rows = d.map((item) => normalizeRegionalRow(item as Record<string, unknown>));
  } else if (d && typeof d === "object") {
    const block = d as { transactions?: unknown[]; totalPages?: number };
    if (Array.isArray(block.transactions)) {
      rows = block.transactions.map((item) =>
        normalizeRegionalRow(item as Record<string, unknown>)
      );
    }
    if (block.totalPages != null) totalPages = Math.max(1, block.totalPages);
  }

  return { rows, totalPages: Math.max(1, totalPages) };
}

export function paginateRegionalRows(
  rows: RegionalSummaryRow[],
  page: number,
  pageSize: number
): { pageRows: RegionalSummaryRow[]; totalPages: number } {
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize) || 1);
  const start = (page - 1) * pageSize;
  return {
    pageRows: rows.slice(start, start + pageSize),
    totalPages,
  };
}

export function regionalRowsWithSerial(
  rows: RegionalSummaryRow[],
  page: number,
  pageSize: number
): { sNo: number; villageName: string; total: number }[] {
  return rows.map((row, index) => ({
    sNo: (page - 1) * pageSize + index + 1,
    villageName: row.villageName,
    total: row.total,
  }));
}
