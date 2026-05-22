/** System-only fields — never shown in PDF/Excel for end users. */
const SYSTEM_KEYS = new Set(
  [
    "id",
    "customerid",
    "customer_id",
    "functionid",
    "function_id",
    "createdby",
    "createddt",
    "created_dt",
    "updatedby",
    "updateddt",
    "updated_dt",
    "isactive",
    "type",
    "returnstatus",
    "return_status",
    "returnremark",
    "return_remark",
    "userid",
    "user_id",
  ].map((k) => k.toLowerCase())
);

export type ReportExportProfile =
  | "income"
  | "expense"
  | "others"
  | "regional"
  | "summaryOverall"
  | "summaryOthers";

type ColumnDef = { key: string; label: string; aliases?: string[] };

const PROFILES: Record<ReportExportProfile, ColumnDef[]> = {
  income: [
    { key: "sNo", label: "S.No" },
    { key: "villageName", label: "Place", aliases: ["placeName", "village"] },
    { key: "initial", label: "Initial" },
    { key: "name", label: "Name" },
    { key: "oldAmount", label: "Old Amount" },
    { key: "newAmount", label: "New Amount" },
    { key: "amount", label: "Total", aliases: ["total"] },
    { key: "phoneNo", label: "Mobile", aliases: ["mobile", "phone"] },
    { key: "remarks", label: "Remarks" },
  ],
  expense: [
    { key: "sNo", label: "S.No" },
    { key: "villageName", label: "Category", aliases: ["placeName", "expensesCategory"] },
    { key: "name", label: "Person / Description" },
    { key: "amount", label: "Amount" },
    { key: "phoneNo", label: "Mobile", aliases: ["mobile"] },
    { key: "remarks", label: "Remarks" },
  ],
  others: [
    { key: "sNo", label: "S.No" },
    { key: "villageName", label: "Place", aliases: ["placeName"] },
    { key: "name", label: "Name" },
    { key: "initial", label: "Initial" },
    { key: "others", label: "Others" },
    { key: "othersType", label: "Others Type" },
    { key: "amount", label: "Amount" },
    { key: "phoneNo", label: "Mobile", aliases: ["mobile"] },
    { key: "othersRemark", label: "Detail", aliases: ["remarks"] },
  ],
  regional: [
    { key: "sNo", label: "S.No" },
    { key: "villageName", label: "Place", aliases: ["placeName"] },
    { key: "total", label: "Total" },
  ],
  summaryOverall: [
    { key: "sNo", label: "S.No" },
    { key: "receivedBy", label: "Received By", aliases: ["username"] },
    { key: "receipt", label: "Receipt" },
    { key: "expenses", label: "Expenses", aliases: ["expense"] },
    { key: "others", label: "Others" },
    { key: "total", label: "Total" },
  ],
  summaryOthers: [
    { key: "sNo", label: "S.No" },
    { key: "othersType", label: "Others Type" },
    { key: "itemTotal", label: "Total", aliases: ["totalOthers"] },
  ],
};

function pickValue(row: Record<string, unknown>, def: ColumnDef): unknown {
  if (row[def.key] !== undefined && row[def.key] !== null && row[def.key] !== "") {
    return row[def.key];
  }
  for (const alias of def.aliases ?? []) {
    if (row[alias] !== undefined && row[alias] !== null && row[alias] !== "") {
      return row[alias];
    }
  }
  return "";
}

/** Rows for export: S.No 1..n, user-facing columns only. */
export function prepareExportRows(
  rows: Record<string, unknown>[],
  profile: ReportExportProfile
): Record<string, unknown>[] {
  const cols = PROFILES[profile];
  return rows.map((row, index) => {
    const out: Record<string, unknown> = {};
    for (const col of cols) {
      if (col.key === "sNo") {
        out[col.label] = row.sNo ?? index + 1;
      } else {
        out[col.label] = pickValue(row, col);
      }
    }
    return out;
  });
}

/** On-screen table keys (no system fields). */
export function displayKeysFromRow(
  row: Record<string, unknown>,
  profile: ReportExportProfile
): string[] {
  const prepared = prepareExportRows([row], profile)[0];
  return Object.keys(prepared);
}

export function displayRowForScreen(
  row: Record<string, unknown>,
  profile: ReportExportProfile
): Record<string, unknown> {
  return prepareExportRows([row], profile)[0] ?? {};
}

export function isSystemField(key: string): boolean {
  return SYSTEM_KEYS.has(key.toLowerCase());
}
