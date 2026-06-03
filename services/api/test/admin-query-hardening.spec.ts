import { BadRequestException } from '@nestjs/common';
import { AdminController } from '../src/admin/admin.controller';
import { SupportAdminController } from '../src/support/support-admin.controller';

describe('Admin Dashboard Query Hardening', () => {
  let adminController: AdminController;
  let supportAdminController: SupportAdminController;

  // Mock dependencies
  const mockAdminService: any = {
    getAuditLogs: jest.fn().mockResolvedValue({ items: [], total: 0 }),
  };
  const mockPaymentsService: any = {
    listPayments: jest.fn().mockResolvedValue({ items: [], total: 0 }),
  };
  const mockIdempotencyService: any = {};
  const mockPaystackService: any = {};
  const mockFinanceSchedulerService: any = {};
  const mockShipmentsService: any = {};
  const mockPayoutsService: any = {
    getPayoutRequests: jest.fn().mockResolvedValue({ payouts: [], total: 0 }),
  };
  const mockPrismaService: any = {
    user: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    trip: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    payout: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
  };

  const mockSupportService: any = {
    listTickets: jest.fn().mockResolvedValue({ items: [], total: 0 }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    adminController = new AdminController(
      mockAdminService,
      mockPaymentsService,
      mockIdempotencyService,
      mockPaystackService,
      mockFinanceSchedulerService,
      mockShipmentsService,
      mockPayoutsService,
      mockPrismaService,
    );
    supportAdminController = new SupportAdminController(mockSupportService);
  });

  describe('AdminController - listUsers', () => {
    it('should successfully call listUsers with valid role and status', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([]);
      mockPrismaService.user.count.mockResolvedValue(0);

      const result = await adminController.listUsers('RIDER', 'ACTIVE', '20', '0');
      expect(result.items).toEqual([]);
      expect(mockPrismaService.user.findMany).toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid user type', async () => {
      await expect(
        adminController.listUsers('INVALID_TYPE', 'ACTIVE', '20', '0'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid status', async () => {
      await expect(
        adminController.listUsers('RIDER', 'INVALID_STATUS', '20', '0'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('AdminController - listTrips', () => {
    it('should successfully call listTrips with valid status', async () => {
      mockPrismaService.trip.findMany.mockResolvedValue([]);
      mockPrismaService.trip.count.mockResolvedValue(0);

      const result = await adminController.listTrips('IN_PROGRESS', '20', '0');
      expect(result.items).toEqual([]);
    });

    it('should throw BadRequestException for invalid status', async () => {
      await expect(
        adminController.listTrips('INVALID_STATUS', '20', '0'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('AdminController - listPayments', () => {
    it('should successfully call listPayments with valid status and provider', async () => {
      const result = adminController.listPayments('CAPTURED', 'paystack', '20', '0');
      expect(result).toBeDefined();
      expect(mockPaymentsService.listPayments).toHaveBeenCalledWith(20, 0, 'CAPTURED', 'paystack');
    });

    it('should throw BadRequestException for invalid payment status', () => {
      expect(() =>
        adminController.listPayments('INVALID_STATUS', 'paystack', '20', '0'),
      ).toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid provider', () => {
      expect(() =>
        adminController.listPayments('CAPTURED', 'stripe', '20', '0'),
      ).toThrow(BadRequestException);
    });
  });

  describe('AdminController - listPayouts', () => {
    it('should successfully call listPayouts with valid status', async () => {
      mockPrismaService.payout.findMany.mockResolvedValue([]);
      mockPrismaService.payout.count.mockResolvedValue(0);

      const result = await adminController.listPayouts('PROCESSING', '20', '0');
      expect(result.items).toEqual([]);
    });

    it('should throw BadRequestException for invalid payout status', async () => {
      await expect(
        adminController.listPayouts('INVALID_STATUS', '20', '0'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('AdminController - getPayoutRequests', () => {
    it('should successfully call getPayoutRequests with valid status', async () => {
      const result = adminController.getPayoutRequests('REQUESTED', '20', '0');
      expect(result).toBeDefined();
      expect(mockPayoutsService.getPayoutRequests).toHaveBeenCalledWith('REQUESTED', 20, 0);
    });

    it('should throw BadRequestException for invalid status', () => {
      expect(() =>
        adminController.getPayoutRequests('INVALID_STATUS', '20', '0'),
      ).toThrow(BadRequestException);
    });
  });

  describe('AdminController - getAuditLogs', () => {
    it('should successfully call getAuditLogs with valid entity and action', async () => {
      const result = adminController.getAuditLogs(undefined, 'USER', 'CREATED', '20', '0');
      expect(result).toBeDefined();
      expect(mockAdminService.getAuditLogs).toHaveBeenCalledWith({
        actor: undefined,
        entity: 'USER',
        action: 'CREATED',
        limit: 20,
        offset: 0,
      });
    });

    it('should throw BadRequestException for invalid entity', () => {
      expect(() =>
        adminController.getAuditLogs(undefined, 'INVALID_ENTITY', 'CREATED', '20', '0'),
      ).toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid action format', () => {
      expect(() =>
        adminController.getAuditLogs(undefined, 'USER', 'INVAL!D-ACT10N', '20', '0'),
      ).toThrow(BadRequestException);
    });
  });

  describe('SupportAdminController - listAllTickets', () => {
    const mockReq = { user: { userId: 'admin-user-id' } };

    it('should successfully call listAllTickets with valid status, type, and priority', async () => {
      const result = await supportAdminController.listAllTickets(
        mockReq,
        'OPEN',
        'PAYMENT_ISSUE',
        'HIGH',
        undefined,
        undefined,
        '0',
        '20',
      );
      expect(result).toBeDefined();
      expect(mockSupportService.listTickets).toHaveBeenCalledWith(
        'admin-user-id',
        { status: 'OPEN', type: 'PAYMENT_ISSUE', priority: 'HIGH' },
        0,
        20,
      );
    });

    it('should throw BadRequestException for invalid ticket status', async () => {
      await expect(
        supportAdminController.listAllTickets(
          mockReq,
          'INVALID_STATUS',
          'PAYMENT_ISSUE',
          'HIGH',
          undefined,
          undefined,
          '0',
          '20',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid ticket type', async () => {
      await expect(
        supportAdminController.listAllTickets(
          mockReq,
          'OPEN',
          'INVALID_TYPE',
          'HIGH',
          undefined,
          undefined,
          '0',
          '20',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid ticket priority', async () => {
      await expect(
        supportAdminController.listAllTickets(
          mockReq,
          'OPEN',
          'PAYMENT_ISSUE',
          'INVALID_PRIORITY',
          undefined,
          undefined,
          '0',
          '20',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
