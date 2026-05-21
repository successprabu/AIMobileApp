export type TransactionType = "R" | "E" | "O";

export type TransactionFormData = {
  id: number;
  customerId: number;
  villageName: string;
  initial: string;
  name: string;
  oldAmount: number;
  newAmount: number;
  amount: number;
  remarks: string;
  phoneNo: string;
  createdBy: string;
  createdDt: string;
  updatedBy: string;
  updatedDt: string;
  isActive: boolean;
  type: TransactionType;
  returnStatus: string;
  returnRemark: string;
  functionId: number;
};

export type LastRecordResponse = {
  result?: boolean;
  data?: {
    transaction?: {
      villageName?: string;
      name?: string;
      amount?: number;
    };
    totalTrans?: number;
    totalAmount?: number;
  };
};

export type TransactionSaveResponse = {
  result: boolean;
  message?: string;
  data?: LastRecordResponse["data"];
};

export type ImportRecord = {
  id: number;
  name: string;
  villageName: string;
  amount: number;
  oldAmount: number;
  newAmount: number;
  initial: string;
  phoneNo: string;
  remarks: string;
  isSelected: boolean;
  customerId?: number;
  functionId?: number;
  createdBy?: string;
  createdDt?: string;
  updatedBy?: string;
  updatedDt?: string;
  originalText?: string;
};

export type SuggestionField = "villageName" | "name" | "initial" | "remarks";
