import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  ACCESS_TOKEN: 'auth.accessToken',
  REFRESH_TOKEN: 'auth.refreshToken',
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
    AsyncStorage.getItem(KEYS.ACCESS_TOKEN),
    AsyncStorage.getItem(KEYS.REFRESH_TOKEN),
    AsyncStorage.getItem(KEYS.USER_TYPE),
  ]);
  return {
    accessToken: accessToken ?? undefined,
    refreshToken: refreshToken ?? undefined,
    userType: (userType as UserType) ?? undefined,
  };
}

export async function saveTokens(tokens: StoredTokens): Promise<void> {
  await Promise.all([
    AsyncStorage.setItem(KEYS.ACCESS_TOKEN, tokens.accessToken),
    AsyncStorage.setItem(KEYS.REFRESH_TOKEN, tokens.refreshToken),
    AsyncStorage.setItem(KEYS.USER_TYPE, tokens.userType),
  ]);
}

export async function clearTokens(): Promise<void> {
  await Promise.all([
    AsyncStorage.removeItem(KEYS.ACCESS_TOKEN),
    AsyncStorage.removeItem(KEYS.REFRESH_TOKEN),
    AsyncStorage.removeItem(KEYS.USER_TYPE),
  ]);
}

export async function getOrCreateFingerprint(): Promise<string> {
  let fp = await AsyncStorage.getItem(KEYS.FINGERPRINT);
  if (!fp) {
    fp = generateUUID();
    await AsyncStorage.setItem(KEYS.FINGERPRINT, fp);
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
