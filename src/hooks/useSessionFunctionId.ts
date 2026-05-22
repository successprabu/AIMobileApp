import { useEffect, type Dispatch, type SetStateAction } from "react";
import { useAuth } from "../context/AuthContext";
import type { AuthUser } from "../types/auth";
import type { TransactionFormData } from "../types/transaction";

/** Active function id from logged-in session. */
export function useSessionFunctionId(): number {
  const { user } = useAuth();
  const u = user as AuthUser | null;
  return (u?.functionId as number) ?? 0;
}

/** Keep transaction form `functionId` in sync when session is updated (e.g. after creating a function). */
export function useSyncFormFunctionId(
  setFormData: Dispatch<SetStateAction<TransactionFormData>>
) {
  const functionId = useSessionFunctionId();

  useEffect(() => {
    if (functionId <= 0) return;
    setFormData((prev) =>
      prev.functionId === functionId ? prev : { ...prev, functionId }
    );
  }, [functionId, setFormData]);
}
