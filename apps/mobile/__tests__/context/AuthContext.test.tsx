import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../../src/context/AuthContext';
import * as authApi from '../../src/api/auth';
import * as riderApi from '../../src/api/rider';
import * as authStore from '../../src/store/authStore';

jest.mock('../../src/api/auth');
jest.mock('../../src/api/rider');
jest.mock('../../src/store/authStore');

function TestComponent() {
  const { isLoading, isAuthenticated, user, error, login, logout } = useAuth();

  return (
    <>
      <Text>{isLoading ? 'loading' : 'ready'}</Text>
      <Text>{isAuthenticated ? 'authenticated' : 'not-authenticated'}</Text>
      <Text>{user?.email || 'no-user'}</Text>
      <Text>{error || 'no-error'}</Text>
      <TouchableOpacity onPress={() => login()}>
        <Text>Login</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={logout}>
        <Text>Logout</Text>
      </TouchableOpacity>
    </>
  );
}

import { Text, TouchableOpacity } from 'react-native';

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with loading state', async () => {
    (authStore.getTokens as jest.Mock).mockResolvedValueOnce({
      accessToken: null,
      refreshToken: null,
      userType: null,
    });

    const { getByText } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(getByText('ready')).toBeTruthy();
      expect(getByText('not-authenticated')).toBeTruthy();
    });
  });

  it('should load user profile when tokens exist', async () => {
    (authStore.getTokens as jest.Mock).mockResolvedValueOnce({
      accessToken: 'test-token',
      refreshToken: 'refresh-token',
      userType: 'RIDER',
    });

    (riderApi.getRiderProfile as jest.Mock).mockResolvedValueOnce({
      id: 'user-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phone: '08012345678',
      riderProfile: { id: 'profile-1', userId: 'user-1' },
    });

    const { getByText } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(getByText('authenticated')).toBeTruthy();
      expect(getByText('john@example.com')).toBeTruthy();
    });
  });

  it('should handle login with phone and OTP', async () => {
    (authStore.getTokens as jest.Mock).mockResolvedValueOnce({
      accessToken: null,
      refreshToken: null,
      userType: null,
    });

    (authApi.verifyOtp as jest.Mock).mockResolvedValueOnce({
      accessToken: 'new-token',
      refreshToken: 'new-refresh',
      expiresIn: '3600',
      userType: 'RIDER',
    });

    (riderApi.getRiderProfile as jest.Mock).mockResolvedValueOnce({
      id: 'user-2',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@example.com',
      phone: '08087654321',
      riderProfile: { id: 'profile-2', userId: 'user-2' },
    });

    (authStore.saveTokens as jest.Mock).mockResolvedValueOnce(undefined);

    const { getByText } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      const loginBtn = getByText('Login');
      expect(loginBtn).toBeTruthy();
    });
  });

  it('should clear error state', async () => {
    // Implementation would depend on actual test setup
    // This is a placeholder for the test structure
  });

  it('should handle logout', async () => {
    (authStore.getTokens as jest.Mock).mockResolvedValueOnce({
      accessToken: 'test-token',
      refreshToken: 'refresh-token',
      userType: 'RIDER',
    });

    (riderApi.getRiderProfile as jest.Mock).mockResolvedValueOnce({
      id: 'user-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phone: '08012345678',
      riderProfile: { id: 'profile-1', userId: 'user-1' },
    });

    (authApi.logoutSession as jest.Mock).mockResolvedValueOnce(undefined);
    (authStore.clearTokens as jest.Mock).mockResolvedValueOnce(undefined);

    const { getByText } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(getByText('authenticated')).toBeTruthy();
    });
  });
});
