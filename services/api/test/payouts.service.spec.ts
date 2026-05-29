import { PayoutsService, AddPayoutAccountDto, RequestPayoutDto, RejectPayoutDto, MarkPayoutFailedDto } from '../src/payments/payouts.service';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { minorUnitsToDecimal, decimalToMinorUnits } from '../src/payments/payments.service';

describe('PayoutsService - Section 17 Driver Payouts', () => {
  let service: PayoutsService;

  const mockPrisma: any = {
    driverProfile: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    driverBankAccount: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
    },
    kycCheck: {
      findFirst: jest.fn(),
    },
    ledgerAccount: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    payout: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    financialTransaction: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    ledgerEntry: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn((fn) => fn(mockPrisma)),
  };

  const mockPaymentsService: any = {
    recordAccountEvent: jest.fn().mockResolvedValue({}),
  };

  const mockLedgerService: any = {
    validateLedgerBalance: jest.fn().mockResolvedValue(true),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PayoutsService(mockPrisma, mockPaymentsService, mockLedgerService);
  });

  describe('addPayoutAccount', () => {
    it('creates new payout account with cooldown', async () => {
      const driverId = 'driver-1';
      const driverProfile = { id: 'dp-1' };
      const accountDto: AddPayoutAccountDto = {
        bankCode: 'GT',
        bankName: 'Guaranty Trust Bank',
        accountName: 'John Doe',
        accountNumber: '0123456789',
      };

      mockPrisma.driverProfile.findUnique.mockResolvedValue(driverProfile);
      mockPrisma.driverBankAccount.upsert.mockResolvedValue({
        id: 'ba-1',
        ...accountDto,
        accountNumberLast4: '6789',
        verifiedAt: new Date(),
      });
      mockPrisma.$transaction.mockImplementation((fn) => fn(mockPrisma));

      const result = await service.addPayoutAccount(driverId, accountDto);

      expect(result.accountNumberLast4).toBe('6789');
      expect(mockPrisma.driverProfile.findUnique).toHaveBeenCalledWith({
        where: { userId: driverId },
      });
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });

    it('rejects when driver profile not found', async () => {
      mockPrisma.driverProfile.findUnique.mockResolvedValue(null);

      const accountDto: AddPayoutAccountDto = {
        bankCode: 'GT',
        accountName: 'John Doe',
        accountNumber: '0123456789',
      };

      await expect(service.addPayoutAccount('driver-1', accountDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('requestPayout', () => {
    it('successfully requests payout with sufficient balance', async () => {
      const driverId = 'driver-1';
      const amount = '5000.00';
      const driverProfile = {
        id: 'dp-1',
        userId: driverId,
        payoutAccountCooldownUntil: null,
        bankAccount: { id: 'ba-1', verifiedAt: new Date() },
      };
      const kyc = { status: 'APPROVED' };

      mockPrisma.driverProfile.findUnique.mockResolvedValue(driverProfile);
      mockPrisma.kycCheck.findFirst.mockResolvedValue(kyc);
      mockPrisma.ledgerAccount.findUnique.mockResolvedValue({
        code: 'platform:driver_payable:NGN',
        balance: { toString: () => '50000.00' },
      });
      mockPrisma.payout.create.mockResolvedValue({
        id: 'po-1',
        status: 'REQUESTED',
        amount,
      });
      mockPrisma.$transaction.mockImplementation((fn) => fn(mockPrisma));

      const result = await service.requestPayout(driverId, amount);

      expect(result.status).toBe('REQUESTED');
      expect(mockPrisma.payout.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            driverProfileId: 'dp-1',
            status: 'REQUESTED',
            amount,
          }),
        }),
      );
    });

    it('rejects payout request without KYC approval', async () => {
      const driverId = 'driver-1';
      const driverProfile = { id: 'dp-1', bankAccount: { verifiedAt: new Date() } };

      mockPrisma.driverProfile.findUnique.mockResolvedValue(driverProfile);
      mockPrisma.kycCheck.findFirst.mockResolvedValue(null);

      await expect(service.requestPayout(driverId, '5000.00')).rejects.toThrow(
        'Driver must have approved KYC',
      );
    });

    it('rejects payout request without payout account', async () => {
      const driverId = 'driver-1';
      const driverProfile = { id: 'dp-1', bankAccount: null };

      mockPrisma.driverProfile.findUnique.mockResolvedValue(driverProfile);
      mockPrisma.kycCheck.findFirst.mockResolvedValue({ status: 'APPROVED' });

      await expect(service.requestPayout(driverId, '5000.00')).rejects.toThrow(
        'Payout account must be added and verified',
      );
    });

    it('rejects payout request during cooldown', async () => {
      const driverId = 'driver-1';
      const futureDate = new Date(Date.now() + 1000 * 60 * 60); // 1 hour from now
      const driverProfile = {
        id: 'dp-1',
        payoutAccountCooldownUntil: futureDate,
        bankAccount: { verifiedAt: new Date() },
      };

      mockPrisma.driverProfile.findUnique.mockResolvedValue(driverProfile);
      mockPrisma.kycCheck.findFirst.mockResolvedValue({ status: 'APPROVED' });

      await expect(service.requestPayout(driverId, '5000.00')).rejects.toThrow(
        'Payout account change cooldown',
      );
    });

    it('rejects payout request below minimum threshold', async () => {
      const driverId = 'driver-1';
      const driverProfile = {
        id: 'dp-1',
        payoutAccountCooldownUntil: null,
        bankAccount: { verifiedAt: new Date() },
      };

      mockPrisma.driverProfile.findUnique.mockResolvedValue(driverProfile);
      mockPrisma.kycCheck.findFirst.mockResolvedValue({ status: 'APPROVED' });

      await expect(service.requestPayout(driverId, '100.00')).rejects.toThrow(
        'Minimum payout amount',
      );
    });

    it('rejects payout request with insufficient balance', async () => {
      const driverId = 'driver-1';
      const driverProfile = {
        id: 'dp-1',
        payoutAccountCooldownUntil: null,
        bankAccount: { verifiedAt: new Date() },
      };

      mockPrisma.driverProfile.findUnique.mockResolvedValue(driverProfile);
      mockPrisma.kycCheck.findFirst.mockResolvedValue({ status: 'APPROVED' });
      mockPrisma.ledgerAccount.findUnique.mockResolvedValue({
        balance: { toString: () => '1000.00' },
      });

      await expect(service.requestPayout(driverId, '5000.00')).rejects.toThrow(
        'Insufficient balance',
      );
    });
  });

  describe('approvePayout', () => {
    it('approves payout and creates double-entry ledger transaction', async () => {
      const adminId = 'admin-1';
      const payoutId = 'po-1';
      const payout = {
        id: payoutId,
        status: 'REQUESTED',
        amount: { toString: () => '5000.00' },
        driverProfileId: 'dp-1',
        driverProfile: { id: 'dp-1' },
      };

      const mockTx = {
        payout: { findUnique: jest.fn().mockResolvedValue(payout), update: jest.fn() },
        ledgerAccount: { findUnique: jest.fn() },
        auditLog: { create: jest.fn() },
        financialTransaction: { findUnique: jest.fn(), findFirst: jest.fn() },
      };

      mockTx.payout.findUnique.mockResolvedValue(payout);
      mockTx.financialTransaction.findUnique.mockResolvedValue(null);
      mockTx.financialTransaction.findFirst.mockResolvedValue({ id: 'ft-1', reference: `payout:${payoutId}:approved:driver-payable` });
      mockTx.ledgerAccount.findUnique.mockImplementation((args) => {
        if (args.where.code === 'platform:driver_payable:NGN') {
          return Promise.resolve({ id: 'la-1', code: 'platform:driver_payable:NGN' });
        } else if (args.where.code === 'platform:payout_clearing:NGN') {
          return Promise.resolve({ id: 'la-2', code: 'platform:payout_clearing:NGN' });
        }
        return null;
      });

      mockPaymentsService.recordAccountEvent.mockResolvedValue({});
      mockTx.payout.update.mockResolvedValue({ ...payout, status: 'APPROVED', approvedByAdminId: adminId });
      mockLedgerService.validateLedgerBalance.mockResolvedValue(undefined);

      const result = await service.approvePayout(mockTx, adminId, payoutId);

      expect(result.status).toBe('APPROVED');
      expect(result.approvedByAdminId).toBe(adminId);
      expect(mockPaymentsService.recordAccountEvent).toHaveBeenCalledTimes(2);
      expect(mockTx.auditLog.create).toHaveBeenCalled();
    });

    it('rejects approval of non-REQUESTED payout', async () => {
      const mockTx = {
        payout: {
          findUnique: jest.fn().mockResolvedValue({ status: 'APPROVED' }),
        },
        financialTransaction: {
          findUnique: jest.fn().mockResolvedValue(null),
        },
      };

      await expect(service.approvePayout(mockTx, 'admin-1', 'po-1')).rejects.toThrow(
        'Cannot approve payout',
      );
    });

    it('is idempotent - duplicate approval returns existing payout', async () => {
      const adminId = 'admin-1';
      const payoutId = 'po-1';
      const payout = {
        id: payoutId,
        driverProfile: { id: 'dp-1' },
        status: 'APPROVED',
        amount: { toString: () => '5000.00' },
        currency: 'NGN',
      };
      const existingTxn = { id: 'ft-1', reference: `payout:${payoutId}:approved` };

      const mockTx = {
        payout: { findUnique: jest.fn().mockResolvedValue(payout) },
        financialTransaction: { findUnique: jest.fn().mockResolvedValue(existingTxn) },
      };

      const result = await service.approvePayout(mockTx, adminId, payoutId);

      expect(result.id).toBe(payoutId);
      expect(result.status).toBe('APPROVED');
    });
  });

  describe('rejectPayout', () => {
    it('rejects payout with reason', async () => {
      const adminId = 'admin-1';
      const payoutId = 'po-1';
      const reason = 'Invalid bank account';
      const payout = { id: payoutId, status: 'REQUESTED', amount: '5000.00' };

      const mockTx = {
        payout: {
          findUnique: jest.fn().mockResolvedValue(payout),
          update: jest.fn().mockResolvedValue({ ...payout, status: 'REJECTED', rejectionReason: reason }),
        },
        auditLog: { create: jest.fn() },
        $transaction: jest.fn((fn) => fn(mockTx)),
      };

      const result = await service.rejectPayout(mockTx, adminId, payoutId, reason);

      expect(result.status).toBe('REJECTED');
      expect(result.rejectionReason).toBe(reason);
      expect(mockTx.auditLog.create).toHaveBeenCalled();
    });

    it('rejects rejection without reason', async () => {
      const mockTx = {
        payout: { findUnique: jest.fn().mockResolvedValue({ status: 'REQUESTED' }) },
      };

      await expect(service.rejectPayout(mockTx, 'admin-1', 'po-1', '')).rejects.toThrow(
        'Rejection reason is required',
      );
    });

    it('rejects rejection of non-REQUESTED payout', async () => {
      const mockTx = {
        payout: { findUnique: jest.fn().mockResolvedValue({ status: 'APPROVED' }) },
      };

      await expect(service.rejectPayout(mockTx, 'admin-1', 'po-1', 'reason')).rejects.toThrow(
        'Cannot reject payout',
      );
    });
  });

  describe('markPayoutProcessing', () => {
    it('marks APPROVED payout as PROCESSING', async () => {
      const payout = { id: 'po-1', status: 'APPROVED' };
      const mockTx = {
        payout: {
          findUnique: jest.fn().mockResolvedValue(payout),
          update: jest.fn().mockResolvedValue({ ...payout, status: 'PROCESSING' }),
        },
        auditLog: { create: jest.fn() },
        $transaction: jest.fn((fn) => fn(mockTx)),
      };

      const result = await service.markPayoutProcessing(mockTx, 'admin-1', 'po-1');

      expect(result.status).toBe('PROCESSING');
      expect(mockTx.auditLog.create).toHaveBeenCalled();
    });
  });

  describe('markPayoutPaid', () => {
    it('marks PROCESSING payout as PAID', async () => {
      const payout = { id: 'po-1', status: 'PROCESSING' };
      const mockTx = {
        payout: {
          findUnique: jest.fn().mockResolvedValue(payout),
          update: jest.fn().mockResolvedValue({ ...payout, status: 'PAID' }),
        },
        auditLog: { create: jest.fn() },
        $transaction: jest.fn((fn) => fn(mockTx)),
      };

      const result = await service.markPayoutPaid(mockTx, 'admin-1', 'po-1', 'PST-123');

      expect(result.status).toBe('PAID');
      expect(mockTx.auditLog.create).toHaveBeenCalled();
    });
  });

  describe('markPayoutFailed', () => {
    it('marks PROCESSING payout as FAILED and creates reversal', async () => {
      const payout = {
        id: 'po-1',
        status: 'PROCESSING',
        amount: { toString: () => '5000.00' },
        driverProfileId: 'dp-1',
      };
      const reason = 'Bank account closed';

      const mockTx = {
        payout: {
          findUnique: jest.fn().mockResolvedValue(payout),
          update: jest.fn().mockResolvedValue({ ...payout, status: 'FAILED', transferFailureReason: reason }),
        },
        ledgerAccount: { findUnique: jest.fn() },
        auditLog: { create: jest.fn() },
        $transaction: jest.fn((fn) => fn(mockTx)),
      };

      mockTx.ledgerAccount.findUnique.mockImplementation((args) => {
        if (args.where.code === 'platform:driver_payable:NGN') {
          return Promise.resolve({ id: 'la-1', code: 'platform:driver_payable:NGN' });
        } else if (args.where.code === 'platform:payout_clearing:NGN') {
          return Promise.resolve({ id: 'la-2', code: 'platform:payout_clearing:NGN' });
        }
        return null;
      });

      mockPaymentsService.recordAccountEvent.mockResolvedValue({});

      const result = await service.markPayoutFailed(mockTx, 'admin-1', 'po-1', reason);

      expect(result.status).toBe('FAILED');
      expect(result.transferFailureReason).toBe(reason);
      expect(mockPaymentsService.recordAccountEvent).toHaveBeenCalledTimes(2);
      expect(mockTx.auditLog.create).toHaveBeenCalled();
    });
  });

  describe('getPayoutHistory', () => {
    it('returns paginated payout history for driver', async () => {
      const driverId = 'driver-1';
      const driverProfile = { id: 'dp-1' };
      const payouts = [{ id: 'po-1', status: 'APPROVED', amount: '5000.00' }];

      mockPrisma.driverProfile.findUnique.mockResolvedValue(driverProfile);
      mockPrisma.payout.findMany.mockResolvedValue(payouts);
      mockPrisma.payout.count.mockResolvedValue(1);

      const result = await service.getPayoutHistory(driverId, 20, 0);

      expect(result.payouts).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockPrisma.payout.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { driverProfileId: 'dp-1' },
        }),
      );
    });
  });

  describe('getPayoutRequests', () => {
    it('returns all payout requests with optional status filter', async () => {
      const payouts = [
        {
          id: 'po-1',
          status: 'REQUESTED',
          amount: '5000.00',
          driverProfile: { userId: 'driver-1', user: { firstName: 'John', lastName: 'Doe' } },
        },
      ];

      mockPrisma.payout.findMany.mockResolvedValue(payouts);
      mockPrisma.payout.count.mockResolvedValue(1);

      const result = await service.getPayoutRequests('REQUESTED', 20, 0);

      expect(result.payouts).toHaveLength(1);
      expect(result.payouts[0].driverName).toBe('John Doe');
    });
  });

  describe('getPayoutBalance', () => {
    it('returns driver payout balance from ledger account', async () => {
      const driverId = 'driver-1';
      const driverProfile = { id: 'dp-1' };

      mockPrisma.driverProfile.findUnique.mockResolvedValue(driverProfile);
      mockPrisma.ledgerAccount.findUnique.mockResolvedValue({
        balance: { toString: () => '50000.00' },
      });

      const result = await service.getPayoutBalance(driverId);

      expect(result).toBe('50000.00');
    });

    it('returns 0.00 when ledger account not found', async () => {
      const driverId = 'driver-1';
      const driverProfile = { id: 'dp-1' };

      mockPrisma.driverProfile.findUnique.mockResolvedValue(driverProfile);
      mockPrisma.ledgerAccount.findUnique.mockResolvedValue(null);

      const result = await service.getPayoutBalance(driverId);

      expect(result).toBe('0.00');
    });
  });
});
