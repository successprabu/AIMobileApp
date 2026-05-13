export type AuthUser = {
  token: string;
  userType: string;
  userName?: string;
  [key: string]: unknown;
};
