import { PaymentsService } from '../src/payments/payments.service';
import { AdminService } from '../src/admin/admin.service';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';

describe('PaymentsService ownership & isolation', () => {
  let paymentsService: PaymentsService;

  const mockPrisma: any = {
    $transaction: jest.fn((callback) => callback(mockPrisma)),
    trip: {
      findUnique: jest.fn(),
    },
    payment: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
      aggregate: jest.fn(),
      groupBy: jest.fn(),
    },
    payout: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      aggregate: jest.fn(),
    },
    driverProfile: {
      findUnique: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    ledgerAccount: {
      upsert: jest.fn(),
      update: jest.fn(),
    },
    financialTransaction: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    ledgerEntry: {
      create: jest.fn(),
    },
    wallet: {
      upsert: jest.fn(),
      update: jest.fn(),
    },
    walletTransaction: {
      create: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.$transaction.mockImplementation((callback: any) => callback(mockPrisma));
    mockPrisma.financialTransaction.findUnique.mockResolvedValue(null);
    mockPrisma.financialTransaction.create.mockImplementation(({ data }: any) => Promise.resolve({ id: `ft-${data.reference}`, ...data }));
    mockPrisma.payment.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.payout.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.ledgerAccount.upsert.mockResolvedValue({ id: 'acct-1', balance: { toString: () => '0.00' } });
    mockPrisma.ledgerAccount.update.mockResolvedValue({ id: 'acct-1', balance: { toString: () => '500.00' } });
    mockPrisma.ledgerEntry.create.mockResolvedValue({});
    mockPrisma.wallet.upsert.mockResolvedValue({ id: 'wallet-1', balance: { toString: () => '0.00' } });
    mockPrisma.wallet.update.mockResolvedValue({ id: 'wallet-1', balance: { toString: () => '400.00' } });
    mockPrisma.walletTransaction.create.mockResolvedValue({});
    paymentsService = new PaymentsService(mockPrisma as any);
  });

  describe('initiateMockPayment', () => {
    it('rejects when rider does not own the trip', async () => {
      mockPrisma.trip.findUnique.mockResolvedValue({
        id: 'trip-1',
        riderProfile: { userId: 'other-rider' },
        fareQuote: { totalFare: 500 },
        payment: null,
      });

      await expect(paymentsService.initiateMockPayment('rider-1', 'trip-1')).rejects.toThrow(ForbiddenException);
    });

    it('creates payment when rider owns the trip', async () => {
      mockPrisma.trip.findUnique.mockResolvedValue({
        id: 'trip-1',
        riderProfile: { userId: 'rider-1' },
        fareQuote: { totalFare: 500 },
        payment: null,
      });
      mockPrisma.payment.create.mockResolvedValue({
        id: 'pay-1',
        tripId: 'trip-1',
        amount: 500,
        currency: 'NGN',
        status: 'PENDING',
        reference: 'RYD-PAY-TEST',
        provider: 'mock-paystack',
        createdAt: new Date(),
      });

      const result = await paymentsService.initiateMockPayment('rider-1', 'trip-1');
      expect(result.status).toBe('PENDING');
      expect(mockPrisma.payment.create).toHaveBeenCalled();
      expect(mockPrisma.financialTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ eventType: 'RIDER_PAYMENT_PENDING' }),
        })
      );
    });

    it('returns the existing payment for duplicate initiation on the same trip', async () => {
      mockPrisma.trip.findUnique.mockResolvedValue({
        id: 'trip-1',
        riderProfile: { userId: 'rider-1' },
        fareQuote: { totalFare: 500 },
        payment: {
          id: 'pay-existing',
          tripId: 'trip-1',
          amount: 500,
          currency: 'NGN',
          status: 'PENDING',
          reference: 'RYD-PAY-EXISTING',
          provider: 'mock-paystack',
          createdAt: new Date(),
        },
      });

      const result = await paymentsService.initiateMockPayment('rider-1', 'trip-1');

      expect(result.id).toBe('pay-existing');
      expect(mockPrisma.payment.create).not.toHaveBeenCalled();
      expect(mockPrisma.financialTransaction.create).not.toHaveBeenCalled();
    });
  });

  describe('capturePaymentForTrip', () => {
    it('captures payment, records commission, driver earning, pending payout, and audit in one transaction', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue({
        id: 'pay-1',
        tripId: 'trip-1',
        amount: { toString: () => '500.00' },
        currency: 'NGN',
        status: 'AUTHORIZED',
        provider: 'mock-paystack',
      });
      mockPrisma.payment.update.mockResolvedValue({ id: 'pay-1', status: 'CAPTURED' });
      mockPrisma.driverProfile.findUnique.mockResolvedValue({ userId: 'driver-user-1' });
      mockPrisma.payout.create.mockResolvedValue({
        id: 'payout-1',
        amount: { toString: () => '400.00' },
        currency: 'NGN',
      });

      await paymentsService.capturePaymentForTrip('trip-1', 'driver-prof-1');

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.payment.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'pay-1', status: { in: ['PENDING', 'AUTHORIZED'] } },
          data: expect.objectContaining({ status: 'CAPTURED' }),
        })
      );
      expect(mockPrisma.payout.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ amount: '400.00', status: 'PENDING' }),
        })
      );
      expect(mockPrisma.financialTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ eventType: 'PLATFORM_COMMISSION_RECORDED', amount: '100.00' }),
        })
      );
      expect(mockPrisma.financialTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ eventType: 'DRIVER_EARNING_RECORDED', amount: '400.00' }),
        })
      );
      expect(mockPrisma.financialTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ eventType: 'DRIVER_PAYOUT_PENDING', amount: '400.00' }),
        })
      );
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });

    it('does not execute capture ledger writes when conditional status update loses the race', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue({
        id: 'pay-1',
        tripId: 'trip-1',
        amount: { toString: () => '500.00' },
        currency: 'NGN',
        status: 'AUTHORIZED',
        provider: 'mock-paystack',
      });
      mockPrisma.payment.updateMany.mockResolvedValue({ count: 0 });

      await paymentsService.capturePaymentForTrip('trip-1', 'driver-prof-1');

      expect(mockPrisma.payout.create).not.toHaveBeenCalled();
      expect(mockPrisma.financialTransaction.create).not.toHaveBeenCalled();
      expect(mockPrisma.auditLog.create).not.toHaveBeenCalled();
    });
  });

  describe('getPaymentForTrip', () => {
    it('rejects when rider does not own the trip', async () => {
      mockPrisma.trip.findUnique.mockResolvedValue({
        id: 'trip-1',
        riderProfile: { userId: 'other-rider' },
        payment: null,
      });

      await expect(paymentsService.getPaymentForTrip('trip-1', 'rider-1')).rejects.toThrow(ForbiddenException);
    });

    it('returns payment when rider owns the trip', async () => {
      mockPrisma.trip.findUnique.mockResolvedValue({
        id: 'trip-1',
        riderProfile: { userId: 'rider-1' },
        payment: {
          id: 'pay-1',
          amount: 500,
          currency: 'NGN',
          status: 'CAPTURED',
          provider: 'mock-paystack',
          reference: 'ref-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      const result = await paymentsService.getPaymentForTrip('trip-1', 'rider-1');
      expect(result.payment).not.toBeNull();
      expect(result.payment.status).toBe('CAPTURED');
    });
  });

  describe('getDriverPayouts', () => {
    it('returns only payouts for the authenticated driver', async () => {
      mockPrisma.driverProfile.findUnique.mockResolvedValue({ id: 'driver-prof-1' });
      mockPrisma.payout.findMany.mockResolvedValue([
        { id: 'payout-1', amount: 400, status: 'PAID' },
      ]);
      mockPrisma.payout.count.mockResolvedValue(1);

      const result = await paymentsService.getDriverPayouts('driver-1', 20, 0);
      expect(mockPrisma.payout.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { driverProfileId: 'driver-prof-1' },
        })
      );
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('throws NotFoundException when driver profile does not exist', async () => {
      mockPrisma.driverProfile.findUnique.mockResolvedValue(null);

      await expect(paymentsService.getDriverPayouts('not-a-driver', 20, 0)).rejects.toThrow(NotFoundException);
    });
  });
});

describe('AdminService.approvePayout state validation', () => {
  let adminService: AdminService;
  const mockPaystackService = {
    initiatePayoutTransfer: jest.fn(),
  };

  const mockPrisma: any = {
    $transaction: jest.fn((callback) => callback(mockPrisma)),
    payout: {
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    ledgerAccount: {
      upsert: jest.fn(),
      update: jest.fn(),
    },
    financialTransaction: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    ledgerEntry: {
      create: jest.fn(),
    },
    wallet: {
      upsert: jest.fn(),
      update: jest.fn(),
    },
    walletTransaction: {
      create: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.$transaction.mockImplementation((callback: any) => callback(mockPrisma));
    mockPrisma.financialTransaction.findUnique.mockResolvedValue(null);
    mockPrisma.financialTransaction.create.mockImplementation(({ data }: any) => Promise.resolve({ id: `ft-${data.reference}`, ...data }));
    mockPrisma.payout.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.ledgerAccount.upsert.mockResolvedValue({ id: 'acct-1', balance: { toString: () => '0.00' } });
    mockPrisma.ledgerAccount.update.mockResolvedValue({ id: 'acct-1', balance: { toString: () => '400.00' } });
    mockPrisma.ledgerEntry.create.mockResolvedValue({});
    mockPrisma.wallet.upsert.mockResolvedValue({ id: 'wallet-1', balance: { toString: () => '400.00' } });
    mockPrisma.wallet.update.mockResolvedValue({ id: 'wallet-1', balance: { toString: () => '0.00' } });
    mockPrisma.walletTransaction.create.mockResolvedValue({});
    mockPaystackService.initiatePayoutTransfer.mockResolvedValue({ success: true, status: 'PAID' });
    adminService = new AdminService(mockPrisma as any, mockPaystackService as any);
  });

  it('throws NotFoundException when payout does not exist', async () => {
    mockPrisma.payout.findUnique.mockResolvedValue(null);

    await expect(adminService.approvePayout('admin-1', 'nonexistent-id')).rejects.toThrow(NotFoundException);
    expect(mockPaystackService.initiatePayoutTransfer).not.toHaveBeenCalled();
  });

  it('throws BadRequestException when payout is already PAID', async () => {
    mockPrisma.payout.findUnique.mockResolvedValue({ id: 'payout-1', status: 'PAID' });

    await expect(adminService.approvePayout('admin-1', 'payout-1')).rejects.toThrow(BadRequestException);
    expect(mockPaystackService.initiatePayoutTransfer).not.toHaveBeenCalled();
  });

  it('throws BadRequestException when payout status is FAILED', async () => {
    mockPrisma.payout.findUnique.mockResolvedValue({ id: 'payout-1', status: 'FAILED' });

    await expect(adminService.approvePayout('admin-1', 'payout-1')).rejects.toThrow(BadRequestException);
    expect(mockPaystackService.initiatePayoutTransfer).not.toHaveBeenCalled();
  });

  it('approves a PENDING payout and logs the action', async () => {
    mockPrisma.payout.findUnique.mockResolvedValue({
      id: 'payout-1',
      status: 'PENDING',
      amount: { toString: () => '400.00' },
      currency: 'NGN',
      driverProfile: { userId: 'driver-user-1' },
    });
    mockPrisma.payout.update.mockResolvedValue({ id: 'payout-1', status: 'PAID' });
    mockPrisma.auditLog.create.mockResolvedValue({});

    const result = await adminService.approvePayout('admin-1', 'payout-1', 'Looks good');
    expect(result.success).toBe(true);
    expect(mockPaystackService.initiatePayoutTransfer).toHaveBeenCalledWith('payout-1', 'admin-1', 'Looks good');
  });

  it('approves a PROCESSING payout', async () => {
    mockPrisma.payout.findUnique.mockResolvedValue({
      id: 'payout-1',
      status: 'PROCESSING',
      amount: { toString: () => '400.00' },
      currency: 'NGN',
      driverProfile: { userId: 'driver-user-1' },
    });
    mockPrisma.payout.update.mockResolvedValue({ id: 'payout-1', status: 'PAID' });
    mockPrisma.auditLog.create.mockResolvedValue({});

    const result = await adminService.approvePayout('admin-1', 'payout-1');
    expect(result.success).toBe(true);
    expect(mockPaystackService.initiatePayoutTransfer).toHaveBeenCalledWith('payout-1', 'admin-1', undefined);
  });
});
