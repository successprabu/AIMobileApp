import type { TransactionFormData } from "../types/transaction";

/** Stable key for auto-save deduplication (user-editable fields only). */
export function transactionFormFingerprint(data: TransactionFormData): string {
  return JSON.stringify({
    type: data.type,
    villageName: data.villageName?.trim(),
    name: data.name?.trim(),
    initial: data.initial?.trim(),
    oldAmount: Number(data.oldAmount) || 0,
    newAmount: Number(data.newAmount) || 0,
    amount: Number(data.amount) || 0,
    remarks: data.remarks?.trim(),
    phoneNo: data.phoneNo?.trim(),
    others: Number(data.others) || 0,
    othersType: data.othersType?.trim(),
    othersRemark: data.othersRemark?.trim(),
  });
}
