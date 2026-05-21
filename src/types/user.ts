export type UserFormData = {
  id: number;
  customerId: number;
  functionId: number;
  name: string;
  primary_phone: string;
  secondary_phone: string;
  email: string;
  country: string;
  state: string;
  district: string;
  address_line1: string;
  address_line2: string;
  is_primary_phone_whatsup: boolean;
  is_secondary_phone_whatsup: boolean;
  pincode: number;
  password: string;
  conpassword: string;
  userType: string;
  createdBy: string;
  createdDt: string;
  updatedBy: string;
  updateddBy: string;
  updatedDt: string;
  isActive: boolean;
};

export type CustomerRecord = {
  id: number;
  customerId?: number;
  functionId?: number;
  name: string;
  primary_phone: string;
  secondary_phone?: string;
  email?: string;
  country?: string;
  state?: string;
  district?: string;
  address_line1?: string;
  address_line2?: string;
  is_primary_phone_whatsup?: boolean;
  is_secondary_phone_whatsup?: boolean;
  pincode?: number;
  password?: string;
  userType?: string;
  createdBy?: string;
  createdDt?: string;
  updateddBy?: string;
  updatedDt?: string;
  isActive?: boolean;
  [key: string]: unknown;
};

export type CustomerListResponse = {
  result?: boolean;
  message?: string;
  data?: { customers?: CustomerRecord[] };
};

export type CustomerSaveResponse = {
  result?: boolean;
  message?: string;
  data?: CustomerRecord;
};
