import { authGet } from "../api/client";
import { PATHS } from "../api/endpoints";
import type {
  FunctionFormData,
  FunctionListResponse,
  FunctionRecord,
  FunctionSaveResponse,
} from "../types/function";
import { isValidIsoDate, normalizeDateInput } from "./date";

function toDateKey(dateStr: string): string {
  if (!dateStr) return "";
  if (dateStr.includes("T")) return dateStr.split("T")[0];
  const normalized = normalizeDateInput(dateStr);
  return isValidIsoDate(normalized) ? normalized : dateStr;
}

export async function fetchCustomerFunctions(
  customerId: number,
  pageSize = 50
): Promise<FunctionRecord[]> {
  const json = await authGet<FunctionListResponse>(PATHS.MASTER_LIST_FUNCTION, {
    id: "",
    customer_id: customerId,
    function_name: "",
    current_page: 1,
    page_size: pageSize,
  });
  if (json.result && json.data?.functions) {
    return json.data.functions;
  }
  return [];
}

/** Resolve new/updated function id from API response and/or list. */
export function resolveFunctionIdFromSave(
  response: FunctionSaveResponse,
  payload: FunctionFormData,
  functions: FunctionRecord[]
): number | null {
  if (payload.id > 0) return payload.id;

  const data = response.data;
  if (typeof data === "number" && data > 0) return data;
  if (data && typeof data === "object") {
    const row = data as { id?: number; functionId?: number };
    const fromData = Number(row.id ?? row.functionId);
    if (fromData > 0) return fromData;
  }

  const dateKey = toDateKey(payload.functionDate);
  const match = functions.find(
    (f) =>
      f.functionName === payload.functionName &&
      toDateKey(f.functionDate ?? "") === dateKey
  );
  if (match?.id) return match.id;

  if (functions.length > 0) {
    return Math.max(...functions.map((f) => Number(f.id) || 0));
  }

  return null;
}

export async function resolveFunctionIdAfterSave(
  customerId: number,
  response: FunctionSaveResponse,
  payload: FunctionFormData
): Promise<number | null> {
  const fromResponse = resolveFunctionIdFromSave(response, payload, []);
  if (fromResponse) return fromResponse;

  const functions = await fetchCustomerFunctions(customerId);
  return resolveFunctionIdFromSave(response, payload, functions);
}
