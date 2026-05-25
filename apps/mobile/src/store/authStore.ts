import AsyncStorage from '@react-native-async-storage/async-storage';
import { secureGetItem, secureSetItem, secureDeleteItem } from './secureStore';

const SECURE_KEYS = {
  ACCESS_TOKEN: 'auth.accessToken',
  REFRESH_TOKEN: 'auth.refreshToken',
} as const;

const ASYNC_KEYS = {
  FINGERPRINT: 'auth.fingerprint',
  USER_TYPE: 'auth.userType',
} as const;

export type UserType = 'RIDER' | 'DRIVER';

export type StoredTokens = {
  accessToken: string;
  refreshToken: string;
  userType: UserType;
};

export async function getTokens(): Promise<Partial<StoredTokens>> {
  const [accessToken, refreshToken, userType] = await Promise.all([
    secureGetItem(SECURE_KEYS.ACCESS_TOKEN),
    secureGetItem(SECURE_KEYS.REFRESH_TOKEN),
    AsyncStorage.getItem(ASYNC_KEYS.USER_TYPE),
  ]);
  return {
    accessToken: accessToken ?? undefined,
    refreshToken: refreshToken ?? undefined,
    userType: (userType as UserType) ?? undefined,
  };
}

export async function saveTokens(tokens: StoredTokens): Promise<void> {
  await Promise.all([
    secureSetItem(SECURE_KEYS.ACCESS_TOKEN, tokens.accessToken),
    secureSetItem(SECURE_KEYS.REFRESH_TOKEN, tokens.refreshToken),
    AsyncStorage.setItem(ASYNC_KEYS.USER_TYPE, tokens.userType),
  ]);
}

export async function clearTokens(): Promise<void> {
  await Promise.all([
    secureDeleteItem(SECURE_KEYS.ACCESS_TOKEN),
    secureDeleteItem(SECURE_KEYS.REFRESH_TOKEN),
    AsyncStorage.removeItem(ASYNC_KEYS.USER_TYPE),
  ]);
}

export async function getOrCreateFingerprint(): Promise<string> {
  let fp = await AsyncStorage.getItem(ASYNC_KEYS.FINGERPRINT);
  if (!fp) {
    fp = generateUUID();
    await AsyncStorage.setItem(ASYNC_KEYS.FINGERPRINT, fp);
  }
  return fp;
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
