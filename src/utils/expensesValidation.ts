import type { TransactionFormData } from "../types/transaction";

export type ExpensesErrors = Partial<
  Record<keyof TransactionFormData | "category", string>
>;

export function validateExpenses(
  data: TransactionFormData,
  t: (key: string) => string
): ExpensesErrors {
  const err: ExpensesErrors = {};

  if (!data.villageName.trim()) {
    err.villageName = t("enter_expensesCategory");
  }

  if (!data.name.trim()) {
    err.name = t("validation_name");
  }

  const amount = Number(data.amount);
  if (!amount || amount <= 0) {
    err.amount = t("validation_amount");
  }

  if (data.phoneNo && !/^\d*$/.test(data.phoneNo)) {
    err.phoneNo = t("validation_phone");
  }

  return err;
}

export function hasExpensesErrors(errors: ExpensesErrors): boolean {
  return Object.keys(errors).length > 0;
}

export function isExpensesValid(
  data: TransactionFormData,
  t: (key: string) => string
): boolean {
  return !hasExpensesErrors(validateExpenses(data, t));
}
