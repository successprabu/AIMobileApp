export type AuthUser = {
  token: string;
  /** 30-day sign-in for this phone; swapped for a new 30-minute token by Auth/Refresh. */
  refreshToken?: string;
  refreshExpires?: string;
  userType: string;
  name?: string;
  userName?: string;
  userTypeDescription?: string;
  customerID?: number;
  functionId?: number;
  id?: number;
  [key: string]: unknown;
};
