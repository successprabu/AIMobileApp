import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import type { AuthUser } from "../types/auth";
import type { ReportFunctionMeta } from "../types/report";
import { fetchReportFunctionMeta } from "../utils/reportFunctionMeta";

/** Function details for report downloads — Master/GetFunction (session customer_id + id). */
export function useReportFunctionMeta() {
  const { user } = useAuth();
  const u = user as AuthUser;
  const [meta, setMeta] = useState<ReportFunctionMeta | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const customerId = Number(u.customerID) || 0;
      const functionId = Number(u.functionId) || 0;
      const loaded = await fetchReportFunctionMeta(customerId, functionId);
      setMeta(loaded);
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
