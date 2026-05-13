export type AuthUser = {
  token: string;
  userType: string;
  name?: string;
  userName?: string;
  userTypeDescription?: string;
  customerID?: number;
  functionId?: number;
  id?: number;
  [key: string]: unknown;
};
