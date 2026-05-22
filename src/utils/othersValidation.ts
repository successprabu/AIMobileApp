import type { TransactionFormData } from "../types/transaction";

export type OthersErrors = Partial<Record<keyof TransactionFormData, string>>;

export function validateOthers(
  data: TransactionFormData,
  t: (key: string) => string
): OthersErrors {
  const err: OthersErrors = {};

  if (!data.villageName.trim()) {
    err.villageName = t("validation_villageName");
  }
  if (!data.name.trim()) {
    err.name = t("validation_name");
  }

  const others = Number(data.others ?? 0);
  if (Number.isNaN(others) || others < 0) {
    err.others = t("validation_amount");
  }

  if (!data.othersType?.trim()) {
    err.othersType = t("pleaseSelectOthersType");
  }

  const amount = Number(data.amount);
  if (data.amount !== 0 && (Number.isNaN(amount) || amount < 0)) {
    err.amount = t("validation_amount");
  }

  if (data.phoneNo && !/^\d*$/.test(data.phoneNo)) {
    err.phoneNo = t("validation_phone");
  }

  return err;
}

export function hasOthersErrors(errors: OthersErrors): boolean {
  return Object.keys(errors).length > 0;
}

export function isOthersValid(
  data: TransactionFormData,
  t: (key: string) => string
): boolean {
  return !hasOthersErrors(validateOthers(data, t));
}
