import { AuthService } from '../src/auth/auth.service';

import * as bcrypt from 'bcrypt';

const mockPrisma: any = {
  authSession: {
    findUnique: jest.fn(),
    update: jest.fn()
  },
  device: {
    findUnique: jest.fn(),
    update: jest.fn(),
    create: jest.fn()
  },
  auditLog: {
    create: jest.fn()
  }
};

const jwtService: any = {
  verifyAsync: jest.fn(),
  signAsync: jest.fn()
};

const configService: any = {
  get: jest.fn((key: string) => {
    if (key === 'JWT_ACCESS_SECRET') return 'access-secret';
    if (key === 'JWT_REFRESH_SECRET') return 'refresh-secret';
    return null;
  }),
  getOrThrow: jest.fn((key: string) => {
    if (key === 'JWT_ACCESS_SECRET') return 'access-secret';
    if (key === 'JWT_REFRESH_SECRET') return 'refresh-secret';
    throw new Error(`Missing config: ${key}`);
  }),
};

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    authService = new AuthService(mockPrisma as any, jwtService as any, configService as any);
  });

  it('should rotate refresh token and revoke old session', async () => {
    const refreshToken = 'refresh-token';
    const tokenHash = await bcrypt.hash(refreshToken, 10);

    jwtService.verifyAsync.mockResolvedValue({ sub: 'user-id', sid: 'session-id', type: 'refresh' });
    mockPrisma.authSession.findUnique.mockResolvedValue({
      id: 'session-id',
      userId: 'user-id',
      refreshTokenHash: tokenHash,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 10000),
      user: { userType: 'RIDER' }
    });
    mockPrisma.device.findUnique.mockResolvedValue(null);
    mockPrisma.device.create.mockResolvedValue({ id: 'device-123' });

    const createSessionSpy = jest.spyOn(authService as any, 'createSessionTokens').mockResolvedValue({
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
      expiresIn: '15m'
    });
    const revokeSpy = jest.spyOn(authService as any, 'revokeSession');
    jest.spyOn(authService as any, 'logAuthEvent').mockResolvedValue(undefined);

    const result = await authService.refreshToken({ token: refreshToken, fingerprint: 'fprint123' });

    expect(result).toEqual({ accessToken: 'new-access', refreshToken: 'new-refresh', expiresIn: '15m' });
    expect(revokeSpy).toHaveBeenCalledWith('session-id', 'ROTATED');
    expect(createSessionSpy).toHaveBeenCalledWith('user-id', expect.any(String), 'RIDER');
  });

  it('should revoke current session on logout', async () => {
    const revokeSpy = jest.spyOn(authService as any, 'revokeSession').mockResolvedValue(undefined);
    jest.spyOn(authService as any, 'logAuthEvent').mockResolvedValue(undefined);

    const result = await authService.logoutCurrent('user-id', 'session-id');

    expect(result).toEqual({ success: true });
    expect(revokeSpy).toHaveBeenCalledWith('session-id', 'LOGOUT');
  });
});
