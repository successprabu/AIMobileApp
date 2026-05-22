export type OverallSummaryRow = {
  createdBy: string;
  createdById: string;
  type: "R" | "E" | "O" | string;
  total: number;
};

export type OthersSummaryRow = {
  othersType: string;
  totalOthers: number;
};

export type HandoverListRow = {
  sNo: number;
  userId: string;
  username: string;
  receipt: number;
  expense: number;
  others: number;
  total: number;
};

export type HandoverForm = {
  id: number;
  customerId: number;
  functionId: number;
  handoverBy: string;
  receivedBy: string;
  receivedByMoible: string;
  totalRcdAmount: number;
  handoverAmount: number;
  differnceAmount: number;
  remarks: string;
  createdBy: string;
  createdDt: string;
  updatedBy: string;
  updatedDt: string;
  isActive: boolean;
  status: number;
};

export type HandoverSavePayload = Omit<HandoverForm, "handoverBy"> & {
  handoverBy: number;
};

export type HandoverSaveResponse = {
  result?: boolean;
  message?: string;
  data?: HandoverForm & { id: number; handoverBy: number };
};

export type ReportListResponse<T> = {
  result?: boolean;
  message?: string;
  data?: T[];
};
