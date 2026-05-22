export type FunctionFormData = {
  id: number;
  customerId: number;
  functionName: string;
  functionDate: string;
  mahalName: string;
  funPersionNames: string;
  remarks: string;
  funMessage: string;
  createdBy: string;
  createdDt: string;
  updatedBy: string;
  updatedDt: string;
  isActive: boolean;
};

export type FunctionRecord = {
  id: number;
  customerId: number;
  functionName: string;
  functionDate: string;
  mahalName: string;
  funPersionNames: string;
  remarks?: string;
  funMessage?: string;
  createdBy?: string;
  createdDt?: string;
  updatedBy?: string;
  updatedDt?: string;
  isActive?: boolean;
};

export type FunctionListData = {
  totalRecords?: number;
  totalPages?: number;
  currentPage?: number;
  pageSize?: number;
  functions?: FunctionRecord[];
};

export type FunctionListResponse = {
  result?: boolean;
  message?: string;
  data?: FunctionListData;
};

export type FunctionSaveResponse = {
  result?: boolean;
  message?: string;
  data?: number | FunctionRecord | { id?: number; functionId?: number };
};
