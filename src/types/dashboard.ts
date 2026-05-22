export type DashboardSummary = {
  totalRcdAmount?: number;
  totalRcdTransaction?: number;
  totalPlaces?: number;
  totalExpenses?: number;
  totalOthers?: number;
  [key: string]: number | string | undefined;
};

export type DashboardDetailRow = {
  name: string;
  transactionCount?: number;
  expenseCount?: number;
  transactions?: number;
  expenses?: number;
};

export type DashboardApiResponse<T> = {
  result?: boolean;
  message?: string;
  data?: T;
};
