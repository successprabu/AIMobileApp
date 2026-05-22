import { authGet } from "../api/client";
import { PATHS } from "../api/endpoints";
import type { FunctionListResponse, FunctionRecord } from "../types/function";
import type { ReportFunctionMeta } from "../types/report";
import { formatDisplayDate } from "./date";

export function functionRecordToMeta(fn: FunctionRecord): ReportFunctionMeta {
  return {
    functionName: String(fn.functionName ?? "").trim() || "—",
    functionDate: formatDisplayDate(fn.functionDate ?? "") || "—",
    mahalName: String(fn.mahalName ?? "").trim() || "—",
    funPersionNames: String(fn.funPersionNames ?? "").trim() || "—",
  };
}

/** Load function cover data: GET Master/GetFunction?customer_id=&id= */
export async function fetchReportFunctionMeta(
  customerId: number,
  functionId: number
): Promise<ReportFunctionMeta | null> {
  if (!customerId || !functionId) return null;

  const json = await authGet<FunctionListResponse>(PATHS.MASTER_LIST_FUNCTION, {
    customer_id: customerId,
    id: functionId,
    current_page: 1,
    page_size: 10,
  });

  if (!json.result || !json.data?.functions?.length) {
    return null;
  }

  const targetId = Number(functionId);
  const fn =
    json.data.functions.find((f) => Number(f.id) === targetId) ??
    json.data.functions[0];

  return functionRecordToMeta(fn);
}
