import { UsersService } from '../src/users/users.service';
import * as bcrypt from 'bcrypt';

const mockPrisma: any = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn()
  },
  riderProfile: {
    upsert: jest.fn()
  },
  trustedContact: {
    findMany: jest.fn()
  },
  otpRequest: {
    findFirst: jest.fn(),
    update: jest.fn(),
    create: jest.fn()
  },
  auditLog: {
    create: jest.fn()
  },
  accountDeletionRequest: {
    create: jest.fn()
  }
};

describe('UsersService', () => {
  let usersService: UsersService;

  beforeEach(() => {
    jest.clearAllMocks();
    usersService = new UsersService(mockPrisma as any);
  });

  it('should prevent phone change confirmation with invalid code', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', phone: '+2348000000000' });
    mockPrisma.otpRequest.findFirst.mockResolvedValue({ id: 'otp-1', phone: '+2348000000000', codeHash: await bcrypt.hash('123456', 10), expiresAt: new Date(Date.now() + 100000), usedAt: null, attempts: 0 });

    await expect(usersService.confirmPhoneChange('user-1', { newPhone: '+2348000000001', code: '000000' })).rejects.toThrow('Invalid verification code.');
    expect(mockPrisma.otpRequest.update).toHaveBeenCalledWith({ where: { id: 'otp-1' }, data: { attempts: { increment: 1 } } });
  });

  it('should create rider profile and riderProfile record', async () => {
    const input = {
      firstName: 'Ada',
      lastName: 'Lovelace',
      phone: '+2348000000000',
      email: 'ada@example.com'
    };

    mockPrisma.user.update.mockResolvedValue({ id: 'user-1', ...input, userType: 'RIDER', isPhoneVerified: false });
    mockPrisma.riderProfile.upsert.mockResolvedValue({ id: 'profile-1', userId: 'user-1' });
    mockPrisma.auditLog.create.mockResolvedValue({});

    const result = await usersService.createRiderProfile('user-1', input as any);

    expect(result.riderProfile).toEqual({ id: 'profile-1', userId: 'user-1' });
    expect(result.user.isPhoneVerified).toBe(false);
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: expect.objectContaining({
        userType: 'RIDER',
        isPhoneVerified: false
      })
    });
    expect(mockPrisma.auditLog.create).toHaveBeenCalled();
  });

  it('should request phone verification for current phone', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-2', phone: '+2348000000000' });
    mockPrisma.otpRequest.findFirst.mockResolvedValue(null);
    mockPrisma.otpRequest.create.mockResolvedValue({ id: 'otp-2' });
    mockPrisma.auditLog.create.mockResolvedValue({});

    const result = await usersService.requestPhoneVerification('user-2');

    expect(result).toEqual({ success: true, message: 'Verification code sent to phone.' });
    expect(mockPrisma.otpRequest.create).toHaveBeenCalled();
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: 'PHONE_VERIFICATION_REQUESTED' })
    }));
  });

  it('should confirm phone verification and mark user verified', async () => {
    const hashedCode = await bcrypt.hash('654321', 10);
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-3', phone: '+2348000000001' });
    mockPrisma.otpRequest.findFirst.mockResolvedValue({ id: 'otp-3', phone: '+2348000000001', codeHash: hashedCode, expiresAt: new Date(Date.now() + 100000), usedAt: null });
    mockPrisma.otpRequest.update.mockResolvedValue({});
    mockPrisma.user.update.mockResolvedValue({ id: 'user-3', phone: '+2348000000001', isPhoneVerified: true });
    mockPrisma.auditLog.create.mockResolvedValue({});

    const result = await usersService.confirmPhoneVerification('user-3', { code: '654321' } as any);

    expect(result).toEqual({ success: true, user: { id: 'user-3', phone: '+2348000000001', isPhoneVerified: true } });
    expect(mockPrisma.otpRequest.update).toHaveBeenCalledWith({ where: { id: 'otp-3' }, data: { usedAt: expect.any(Date) } });
    expect(mockPrisma.user.update).toHaveBeenCalledWith({ where: { id: 'user-3' }, data: { isPhoneVerified: true } });
  });

  it('should create account deletion request', async () => {
    mockPrisma.accountDeletionRequest.create.mockResolvedValue({ id: 'del-1' });
    mockPrisma.auditLog.create.mockResolvedValue({});

    const result = await usersService.requestAccountDeletion('user-4', { reason: 'No longer needed' });

    expect(result).toEqual({ success: true, requestId: 'del-1' });
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: 'ACCOUNT_DELETION_REQUESTED' })
    }));
  });
});
