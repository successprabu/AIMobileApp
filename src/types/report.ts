export type ReportFunctionMeta = {
  functionName: string;
  functionDate: string;
  mahalName: string;
  funPersionNames: string;
  reportDate?: string;
  generatedBy?: string;
  poweredBy?: string;
  supportPhone?: string;
};

export type RegionalSummaryRow = {
  villageName: string;
  total: number;
};

export type ReportGeneralDataResponse = {
  result?: boolean;
  message?: string;
  data?: {
    functions?: {
      functionName?: string;
      functionDate?: string;
      mahalName?: string;
      funPersionNames?: string;
    };
    header?: {
      reportDate?: string;
      generatedBy?: string;
    };
    footer?: {
      poweredBy?: string;
      supportPhone?: string;
    };
  };
};

export type RegionalReportApiResponse = {
  result?: boolean;
  message?: string;
  totalPages?: number;
  data?:
    | RegionalSummaryRow[]
    | {
        transactions?: RegionalSummaryRow[];
        totalPages?: number;
      };
};
