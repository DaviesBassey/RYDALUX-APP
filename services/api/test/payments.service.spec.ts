import { PaymentsService } from '../src/payments/payments.service';
import { AdminService } from '../src/admin/admin.service';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';

describe('PaymentsService ownership & isolation', () => {
  let paymentsService: PaymentsService;

  const mockPrisma: any = {
    trip: {
      findUnique: jest.fn(),
    },
    payment: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
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
      aggregate: jest.fn(),
    },
    driverProfile: {
      findUnique: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
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

  const mockPrisma: any = {
    payout: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    adminService = new AdminService(mockPrisma as any);
  });

  it('throws NotFoundException when payout does not exist', async () => {
    mockPrisma.payout.findUnique.mockResolvedValue(null);

    await expect(adminService.approvePayout('admin-1', 'nonexistent-id')).rejects.toThrow(NotFoundException);
    expect(mockPrisma.payout.update).not.toHaveBeenCalled();
  });

  it('throws BadRequestException when payout is already PAID', async () => {
    mockPrisma.payout.findUnique.mockResolvedValue({ id: 'payout-1', status: 'PAID' });

    await expect(adminService.approvePayout('admin-1', 'payout-1')).rejects.toThrow(BadRequestException);
    expect(mockPrisma.payout.update).not.toHaveBeenCalled();
  });

  it('throws BadRequestException when payout status is FAILED', async () => {
    mockPrisma.payout.findUnique.mockResolvedValue({ id: 'payout-1', status: 'FAILED' });

    await expect(adminService.approvePayout('admin-1', 'payout-1')).rejects.toThrow(BadRequestException);
    expect(mockPrisma.payout.update).not.toHaveBeenCalled();
  });

  it('approves a PENDING payout and logs the action', async () => {
    mockPrisma.payout.findUnique.mockResolvedValue({ id: 'payout-1', status: 'PENDING' });
    mockPrisma.payout.update.mockResolvedValue({ id: 'payout-1', status: 'PAID' });
    mockPrisma.auditLog.create.mockResolvedValue({});

    const result = await adminService.approvePayout('admin-1', 'payout-1', 'Looks good');
    expect(result.success).toBe(true);
    expect(mockPrisma.payout.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'payout-1' },
        data: expect.objectContaining({ status: 'PAID' }),
      })
    );
    expect(mockPrisma.auditLog.create).toHaveBeenCalled();
  });

  it('approves a PROCESSING payout', async () => {
    mockPrisma.payout.findUnique.mockResolvedValue({ id: 'payout-1', status: 'PROCESSING' });
    mockPrisma.payout.update.mockResolvedValue({ id: 'payout-1', status: 'PAID' });
    mockPrisma.auditLog.create.mockResolvedValue({});

    const result = await adminService.approvePayout('admin-1', 'payout-1');
    expect(result.success).toBe(true);
    expect(mockPrisma.payout.update).toHaveBeenCalled();
  });
});
