import axios from "axios";
import { BASE_URL } from "../api/endpoints";

const OTP_SMS_URL = "https://www.fast2sms.com/dev/bulkV2";
const OTP_KEY =
  process.env.EXPO_PUBLIC_FAST2SMS_KEY ??
  "xjOLRnX3rkQIbDWCNdKzUZrvDkh4oNE2c5piae82FQuFC0wj0hShCZvrJ1uH";

export type RegistrationForm = {
  id: number;
  name: string;
  primary_phone: string;
  secondary_phone: string;
  country: string;
  state: string;
  district: string;
  address_line1: string;
  address_line2: string;
  is_primary_phone_whatsup: boolean;
  is_secondary_phone_whatsup: boolean;
  pincode: number | string;
  password: string;
  otp: string;
  createdBy: string;
  createdDt: string;
  updateddBy: string;
  updatedDt: string;
  isActive: boolean;
};

export function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function checkMobileAvailable(mobile: string): Promise<{
  result?: boolean;
  message?: string;
}> {
  const { data } = await axios.get(`${BASE_URL}Auth/MobileExistingCheck`, {
    params: {
      userName: mobile,
      appName: "MOI",
      userType: "AU",
    },
  });
  return data;
}

export async function sendOtpSms(mobile: string, otp: string): Promise<void> {
  await axios.get(OTP_SMS_URL, {
    params: {
      authorization: OTP_KEY,
      route: "otp",
      variables_values: otp,
      flash: 0,
      numbers: mobile,
    },
  });
}

export async function registrationInitiate(mobile: string): Promise<unknown> {
  const { data } = await axios.post(`${BASE_URL}Auth/AddRegistrationInitiate`, {
    id: 0,
    primary_phone: mobile,
    userType: "AU",
    customerId: 0,
    country_code: "+91",
    appName: "MOI",
    createdBy: "SYSTEM",
    createdDt: new Date().toISOString(),
  });
  return data;
}

export async function registerCustomer(
  payload: RegistrationForm
): Promise<{ result?: boolean; message?: string }> {
  const body = {
    ...payload,
    pincode: Number(payload.pincode) || 0,
    createdDt: new Date().toISOString(),
    updatedDt: new Date().toISOString(),
  };
  const { data } = await axios.post(`${BASE_URL}Auth/AddCustomer`, body);
  return data;
}
