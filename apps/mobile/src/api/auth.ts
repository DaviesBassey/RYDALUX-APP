import { api } from './client';
import { getOrCreateFingerprint } from '../store/authStore';

export type OtpRequestResponse = {
  success: boolean;
  message: string;
  devCode?: string; // only present when NODE_ENV=development on the backend
};

export type TokenResponse = {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
};

export async function requestOtp(phone: string): Promise<OtpRequestResponse> {
  const fingerprint = await getOrCreateFingerprint();
  const { data } = await api.post<OtpRequestResponse>('/auth/otp/request', {
    phone,
    fingerprint,
    deviceName: 'Rydalux Mobile',
  });
  return data;
}

export async function verifyOtp(phone: string, code: string): Promise<TokenResponse> {
  const fingerprint = await getOrCreateFingerprint();
  const { data } = await api.post<TokenResponse>('/auth/otp/verify', {
    phone,
    code,
    fingerprint,
    deviceName: 'Rydalux Mobile',
  });
  return data;
}

export async function logoutSession(): Promise<void> {
  await api.post('/auth/logout');
}
