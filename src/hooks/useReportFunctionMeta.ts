import { useCallback, useEffect, useState } from "react";
import { authGet } from "../api/client";
import { PATHS } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import type { AuthUser } from "../types/auth";
import type { FunctionListResponse } from "../types/function";
import type { ReportFunctionMeta } from "../types/report";
import { formatDisplayDate } from "../utils/date";

/** Function details for report downloads — Master/GetFunction (session customer + function id). */
export function useReportFunctionMeta() {
  const { user } = useAuth();
  const u = user as AuthUser;
  const [meta, setMeta] = useState<ReportFunctionMeta | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const functionId = u.functionId ?? 0;
      const customerId = u.customerID ?? 0;
      if (!functionId || !customerId) {
        setMeta(null);
        return;
      }

      const json = await authGet<FunctionListResponse>(PATHS.MASTER_LIST_FUNCTION, {
        customer_id: customerId,
        id: functionId,
        current_page: 1,
        page_size: 10,
      });

      if (json.result && json.data?.functions?.length) {
        const fn =
          json.data.functions.find((f) => f.id === functionId) ??
          json.data.functions[0];
        setMeta({
          functionName: fn.functionName ?? "—",
          functionDate: formatDisplayDate(fn.functionDate ?? ""),
          mahalName: fn.mahalName ?? "—",
          funPersionNames: fn.funPersionNames ?? "—",
        });
      } else {
        setMeta(null);
      }
    } catch {
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }, [u.customerID, u.functionId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { meta, loading, reload: load };
}
