import { useCallback, useEffect, useState } from "react";
import { authGet } from "../api/client";
import { PATHS } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import type { AuthUser } from "../types/auth";
import type { ReportFunctionMeta, ReportGeneralDataResponse } from "../types/report";

function formatDisplayDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

export function useReportFunctionMeta() {
  const { user } = useAuth();
  const u = user as AuthUser;
  const [meta, setMeta] = useState<ReportFunctionMeta | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const json = await authGet<ReportGeneralDataResponse>(PATHS.REPORT_GENERAL_DATA, {
        customer_id: u.customerID ?? 0,
        function_id: u.functionId ?? 0,
        user_type: String(u.userType ?? ""),
        userId: u.id ?? 0,
      });
      if (json.result && json.data?.functions) {
        const f = json.data.functions;
        setMeta({
          functionName: f.functionName ?? "—",
          functionDate: formatDisplayDate(f.functionDate),
          mahalName: f.mahalName ?? "—",
          funPersionNames: f.funPersionNames ?? "—",
          reportDate: json.data.header?.reportDate,
          generatedBy: json.data.header?.generatedBy,
          poweredBy: json.data.footer?.poweredBy,
          supportPhone: json.data.footer?.supportPhone,
        });
      } else {
        setMeta(null);
      }
    } catch {
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }, [u.customerID, u.functionId, u.id, u.userType]);

  useEffect(() => {
    void load();
  }, [load]);

  return { meta, loading, reload: load };
}
