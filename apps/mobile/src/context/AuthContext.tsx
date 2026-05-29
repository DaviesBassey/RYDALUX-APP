import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { verifyOtp, logoutSession } from '../api/auth';
import { getRiderProfile } from '../api/rider';
import { getTokens, saveTokens, clearTokens } from '../store/authStore';

export interface RiderUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string;
  userType: 'RIDER';
  createdAt?: string;
}

export interface AuthContextValue {
  // State
  isLoading: boolean;
  isAuthenticated: boolean;
  user: RiderUser | null;
  error: string | null;

  // Methods
  login: (phone?: string, otp?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  clearError: () => void;
}

const defaultValue: AuthContextValue = {
  isLoading: true,
  isAuthenticated: false,
  user: null,
  error: null,
  login: async () => {},
  logout: async () => {},
  refreshSession: async () => {},
  clearError: () => {},
};

export const AuthContext = createContext<AuthContextValue>(defaultValue);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<RiderUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = !!user;

  // Initialize auth state from storage on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setIsLoading(true);
        const tokens = await getTokens();
        if (tokens.accessToken && tokens.refreshToken) {
          // Tokens exist, load user profile
          const profile = await getRiderProfile();
          setUser({
            id: profile.id,
            firstName: profile.firstName,
            lastName: profile.lastName,
            email: profile.email,
            phone: profile.phone,
            userType: 'RIDER',
          });
          setError(null);
        }
      } catch (err) {
        // No valid tokens or profile load failed, stay logged out
        await clearTokens();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (phone?: string, otp?: string) => {
    try {
      setError(null);
      setIsLoading(true);

      // If phone and otp provided, verify OTP first
      if (phone && otp) {
        const tokenResponse = await verifyOtp(phone, otp, 'RIDER');
        await saveTokens({
          accessToken: tokenResponse.accessToken,
          refreshToken: tokenResponse.refreshToken,
          userType: 'RIDER',
        });
      }

      // Load user profile (tokens should already be saved)
      const profile = await getRiderProfile();
      setUser({
        id: profile.id,
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
        phone: profile.phone,
        userType: 'RIDER',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Notify backend of logout
      try {
        await logoutSession();
      } catch {
        // Ignore logout API errors, still clear local state
      }

      // Clear tokens and user state
      await clearTokens();
      setUser(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Logout failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const refreshSession = async () => {
    try {
      setError(null);
      const profile = await getRiderProfile();
      setUser({
        id: profile.id,
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
        phone: profile.phone,
        userType: 'RIDER',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Session refresh failed';
      setError(message);
      throw err;
    }
  };

  const clearError = () => {
    setError(null);
  };

  const value: AuthContextValue = {
    isLoading,
    isAuthenticated,
    user,
    error,
    login,
    logout,
    refreshSession,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
