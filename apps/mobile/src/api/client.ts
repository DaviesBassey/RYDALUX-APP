import axios from 'axios';
import { getTokens, saveTokens, clearTokens, getOrCreateFingerprint } from '../store/authStore';

// EXPO_PUBLIC_API_URL is set in .env (see .env for platform-specific notes)
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Attach Bearer token to every request
api.interceptors.request.use(async (config) => {
  const { accessToken } = await getTokens();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// On 401: attempt silent refresh once, then clear session on failure
let isRefreshing = false;
let pendingQueue: Array<(token: string) => void> = [];

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config as typeof error.config & { _retry?: boolean };

    if (error.response?.status !== 401 || original._retry) {
      throw error;
    }

    if (isRefreshing) {
      return new Promise<unknown>((resolve) => {
        pendingQueue.push((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          resolve(api(original));
        });
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const stored = await getTokens();
      const fingerprint = await getOrCreateFingerprint();
      const { data } = await axios.post<{ accessToken: string; refreshToken: string }>(
        `${BASE_URL}/auth/refresh`,
        { token: stored.refreshToken, fingerprint }
      );
      await saveTokens({ ...data, userType: stored.userType ?? 'RIDER' });
      pendingQueue.forEach((cb) => cb(data.accessToken));
      pendingQueue = [];
      original.headers.Authorization = `Bearer ${data.accessToken}`;
      return api(original);
    } catch {
      pendingQueue = [];
      await clearTokens();
      throw error;
    } finally {
      isRefreshing = false;
    }
  }
);
