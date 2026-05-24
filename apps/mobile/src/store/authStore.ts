import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  ACCESS_TOKEN: 'auth.accessToken',
  REFRESH_TOKEN: 'auth.refreshToken',
  FINGERPRINT: 'auth.fingerprint',
} as const;

export type StoredTokens = {
  accessToken: string;
  refreshToken: string;
};

export async function getTokens(): Promise<Partial<StoredTokens>> {
  const [accessToken, refreshToken] = await Promise.all([
    AsyncStorage.getItem(KEYS.ACCESS_TOKEN),
    AsyncStorage.getItem(KEYS.REFRESH_TOKEN),
  ]);
  return {
    accessToken: accessToken ?? undefined,
    refreshToken: refreshToken ?? undefined,
  };
}

export async function saveTokens(tokens: StoredTokens): Promise<void> {
  await Promise.all([
    AsyncStorage.setItem(KEYS.ACCESS_TOKEN, tokens.accessToken),
    AsyncStorage.setItem(KEYS.REFRESH_TOKEN, tokens.refreshToken),
  ]);
}

export async function clearTokens(): Promise<void> {
  await Promise.all([
    AsyncStorage.removeItem(KEYS.ACCESS_TOKEN),
    AsyncStorage.removeItem(KEYS.REFRESH_TOKEN),
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
