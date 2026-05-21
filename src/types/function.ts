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

export type FunctionListResponse = {
  result?: boolean;
  message?: string;
  data?: { functions?: FunctionRecord[] };
};

export type FunctionSaveResponse = {
  result?: boolean;
  message?: string;
};
