import type { TransactionFormData } from "../types/transaction";

export type TransactionErrors = Partial<Record<keyof TransactionFormData, string>>;

export function validateTransaction(
  data: TransactionFormData,
  t: (key: string) => string
): TransactionErrors {
  const err: TransactionErrors = {};

  if (!data.villageName.trim()) {
    err.villageName = t("validation_villageName");
  }
  if (!data.name.trim()) {
    err.name = t("validation_name");
  }

  const old = Number(data.oldAmount) || 0;
  const newAmt = Number(data.newAmount) || 0;
  if (old <= 0 && newAmt <= 0) {
    err.oldAmount = t("validation_amount");
    err.newAmount = t("validation_amount");
  }

  if (data.phoneNo && !/^\d*$/.test(data.phoneNo)) {
    err.phoneNo = t("validation_phone");
  }

  return err;
}

export function hasValidationErrors(errors: TransactionErrors): boolean {
  return Object.keys(errors).length > 0;
}
