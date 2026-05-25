'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

// ── Module-level in-memory token storage (XSS-resistant; no localStorage) ──
let _accessToken: string | null = null;
let _refreshToken: string | null = null;
let _fingerprint: string | null = null;

export function setAdminTokens(accessToken: string, refreshToken: string) {
  _accessToken = accessToken;
  _refreshToken = refreshToken;
}

export function getAdminAccessToken(): string | null {
  return _accessToken;
}

export function getAdminRefreshToken(): string | null {
  return _refreshToken;
}

export function getAdminFingerprint(): string | null {
  return _fingerprint;
}

export function clearAdminTokens() {
  _accessToken = null;
  _refreshToken = null;
  _fingerprint = null;
}

// ── React context (for UI reactivity) ──
interface AuthContextType {
  token: string | null;
  isAuthenticated: boolean;
  login: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  token: null,
  isAuthenticated: false,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);

  const login = (accessToken: string, refreshToken: string) => {
    _fingerprint = 'admin-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    setAdminTokens(accessToken, refreshToken);
    setToken(accessToken);
  };

  const logout = () => {
    clearAdminTokens();
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ token, isAuthenticated: !!token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;
  return <>{children}</>;
}
