import axios from "axios";
import { BASE_URL } from "../api/endpoints";


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

type OtpResult = { ok: boolean; message: string };

/** Asks our API to send a registration OTP by SMS. The server makes the code; no SMS key is in the app. */
export async function sendOtp(mobile: string, userType = "AU"): Promise<OtpResult> {
  return otpCall("Auth/SendOtp", { phone: mobile, userType, appName: "MOI" });
}

/** Asks our API to check the OTP. Once it is right, this number may register. */
export async function verifyOtp(mobile: string, otp: string): Promise<OtpResult> {
  return otpCall("Auth/VerifyOtp", { phone: mobile, otp });
}

async function otpCall(path: string, body: Record<string, string>): Promise<OtpResult> {
  try {
    const { data } = await axios.post(`${BASE_URL}${path}`, body, { timeout: 20000 });
    return { ok: data?.result !== false, message: data?.message ?? "" };
  } catch (err) {
    const e = err as { response?: { status?: number; data?: { message?: string } } };
    const message =
      e.response?.data?.message ??
      (e.response?.status === 429
        ? "Too many tries. Please wait a few minutes and try again."
        : !e.response
          ? "Could not reach the server. Check your connection and try again."
          : "Something went wrong. Please try again.");
    return { ok: false, message };
  }
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
