import { LedgerService } from '../src/payments/ledger.service';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

describe('LedgerService - Section 16 Double-Entry Accounting', () => {
  let service: LedgerService;

  const mockPrisma: any = {
    ledgerEntry: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    financialTransaction: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
    ledgerAccount: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new LedgerService(mockPrisma as any);
  });

  describe('validateLedgerBalance', () => {
    it('validates balanced double-entry transactions (equal debits and credits)', async () => {
      mockPrisma.ledgerEntry.findMany.mockResolvedValue([
        { id: '1', transactionType: 'DEBIT', amount: { toString: () => '500.00' } },
        { id: '2', transactionType: 'CREDIT', amount: { toString: () => '500.00' } },
      ]);
      mockPrisma.financialTransaction.update.mockResolvedValue({});

      await service.validateLedgerBalance(mockPrisma, 'txn-1');

      expect(mockPrisma.financialTransaction.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'txn-1' },
          data: expect.objectContaining({
            totalDebit: '500.00',
            totalCredit: '500.00',
          }),
        })
      );
    });

    it('rejects unbalanced transactions (debits ≠ credits)', async () => {
      mockPrisma.ledgerEntry.findMany.mockResolvedValue([
        { id: '1', transactionType: 'DEBIT', amount: { toString: () => '500.00' } },
        { id: '2', transactionType: 'CREDIT', amount: { toString: () => '300.00' } },
      ]);

      await expect(service.validateLedgerBalance(mockPrisma, 'txn-1')).rejects.toThrow(BadRequestException);
      expect(mockPrisma.financialTransaction.update).not.toHaveBeenCalled();
    });

    it('rejects transactions with no entries', async () => {
      mockPrisma.ledgerEntry.findMany.mockResolvedValue([]);

      await expect(service.validateLedgerBalance(mockPrisma, 'txn-1')).rejects.toThrow('must have entries');
    });

    it('validates multi-account transactions', async () => {
      mockPrisma.ledgerEntry.findMany.mockResolvedValue([
        { id: '1', transactionType: 'DEBIT', amount: { toString: () => '1000.00' } },
        { id: '2', transactionType: 'CREDIT', amount: { toString: () => '500.00' } },
        { id: '3', transactionType: 'CREDIT', amount: { toString: () => '500.00' } },
      ]);
      mockPrisma.financialTransaction.update.mockResolvedValue({});

      await service.validateLedgerBalance(mockPrisma, 'txn-1');

      expect(mockPrisma.financialTransaction.update).toHaveBeenCalled();
    });
  });

  describe('createReversal', () => {
    it('creates reversal transaction with inverted entries', async () => {
      const originalTxn = {
        id: 'txn-1',
        reference: 'PAYMENT-123',
        eventType: 'PAYMENT_CAPTURED',
        referenceType: 'PAYMENT',
        referenceId: 'pay-1',
        status: 'POSTED',
        postedAt: new Date(),
        currency: 'NGN',
        amount: '1000.00',
        metadata: null,
        ledgerEntries: [
          { id: 'e1', transactionType: 'DEBIT', amount: '1000.00' },
          { id: 'e2', transactionType: 'CREDIT', amount: '1000.00' },
        ],
      };

      mockPrisma.financialTransaction.findUnique.mockResolvedValue(originalTxn);
      mockPrisma.financialTransaction.create.mockResolvedValue({
        id: 'txn-rev-1',
        reference: 'PAYMENT-123:reversal:XXXXX',
      });
      mockPrisma.ledgerEntry.create.mockResolvedValue({});
      mockPrisma.financialTransaction.update.mockResolvedValue({});

      const reversalId = await service.createReversal(mockPrisma, 'txn-1', 'admin-1', 'Payment reversal');

      expect(reversalId).toBe('txn-rev-1');
      expect(mockPrisma.financialTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            reversalReferenceId: 'txn-1',
            reversedByAdminId: 'admin-1',
          }),
        })
      );
      expect(mockPrisma.ledgerEntry.create).toHaveBeenCalledTimes(2);
      expect(mockPrisma.financialTransaction.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'REVERSED',
            reversedByAdminId: 'admin-1',
          }),
        })
      );
    });

    it('rejects reversal of non-POSTED transaction', async () => {
      mockPrisma.financialTransaction.findUnique.mockResolvedValue({
        id: 'txn-1',
        status: 'REVERSED',
        ledgerEntries: [],
      });

      await expect(service.createReversal(mockPrisma, 'txn-1', 'admin-1', 'reason')).rejects.toThrow(BadRequestException);
    });

    it('inverts transaction types in reversal entries', async () => {
      const originalTxn = {
        id: 'txn-1',
        reference: 'PAYMENT-123',
        eventType: 'PAYMENT_CAPTURED',
        referenceType: 'PAYMENT',
        referenceId: 'pay-1',
        status: 'POSTED',
        postedAt: new Date(),
        currency: 'NGN',
        amount: '1000.00',
        metadata: null,
        ledgerEntries: [
          { id: 'e1', transactionType: 'DEBIT', amount: '1000.00', description: 'Cash clearing debit' },
          { id: 'e2', transactionType: 'CREDIT', amount: '1000.00', description: 'Commission credit' },
        ],
      };

      mockPrisma.financialTransaction.findUnique.mockResolvedValue(originalTxn);
      mockPrisma.financialTransaction.create.mockResolvedValue({ id: 'txn-rev-1' });
      mockPrisma.ledgerEntry.create.mockResolvedValue({});
      mockPrisma.financialTransaction.update.mockResolvedValue({});

      await service.createReversal(mockPrisma, 'txn-1', 'admin-1', 'reason');

      const callArgs = mockPrisma.ledgerEntry.create.mock.calls;
      expect(callArgs[0][0].data.transactionType).toBe('CREDIT');
      expect(callArgs[1][0].data.transactionType).toBe('DEBIT');
    });
  });

  describe('recordManualAdjustment', () => {
    it('creates balanced adjustment with two entries (debit and credit)', async () => {
      mockPrisma.ledgerAccount.findUnique.mockResolvedValue({
        id: 'acct-1',
        currency: 'NGN',
      });
      mockPrisma.financialTransaction.create.mockResolvedValue({ id: 'txn-adj-1' });
      mockPrisma.ledgerAccount.update.mockResolvedValue({ balance: '100.00' });
      mockPrisma.ledgerEntry.create.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});

      const adjustmentId = await service.recordManualAdjustment(
        mockPrisma,
        'admin-1',
        'acct-1',
        50000n,
        'DEBIT',
        'Correction for duplicate charge'
      );

      expect(adjustmentId).toBe('txn-adj-1');
      expect(mockPrisma.ledgerEntry.create).toHaveBeenCalledTimes(2);
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });

    it('rejects adjustment without admin ID', async () => {
      await expect(service.recordManualAdjustment(mockPrisma, '', 'acct-1', 50000n, 'DEBIT', 'reason')).rejects.toThrow(
        ForbiddenException
      );
    });

    it('rejects adjustment without reason', async () => {
      await expect(service.recordManualAdjustment(mockPrisma, 'admin-1', 'acct-1', 50000n, 'DEBIT', '')).rejects.toThrow(
        BadRequestException
      );
    });

    it('creates audit log for manual adjustment', async () => {
      mockPrisma.ledgerAccount.findUnique.mockResolvedValue({ id: 'acct-1', currency: 'NGN' });
      mockPrisma.financialTransaction.create.mockResolvedValue({ id: 'txn-adj-1' });
      mockPrisma.ledgerAccount.update.mockResolvedValue({ balance: '100.00' });
      mockPrisma.ledgerEntry.create.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});

      await service.recordManualAdjustment(mockPrisma, 'admin-1', 'acct-1', 50000n, 'CREDIT', 'Test adjustment');

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actorId: 'admin-1',
            action: 'LEDGER_MANUAL_ADJUSTMENT',
            entity: 'FINANCIAL_TRANSACTION',
            payload: expect.objectContaining({
              reason: 'Test adjustment',
              transactionType: 'CREDIT',
            }),
          }),
        })
      );
    });
  });

  describe('preventEntryModification', () => {
    it('allows modification of unposted entries', async () => {
      mockPrisma.ledgerEntry.findUnique.mockResolvedValue({
        id: 'e1',
        financialTransactionId: 'txn-1',
      });
      mockPrisma.financialTransaction.findUnique.mockResolvedValue({
        id: 'txn-1',
        postedAt: new Date(Date.now() + 10000),
      });

      await expect(service.preventEntryModification(mockPrisma, 'e1')).resolves.not.toThrow();
    });

    it('prevents modification of posted entries', async () => {
      mockPrisma.ledgerEntry.findUnique.mockResolvedValue({
        id: 'e1',
        financialTransactionId: 'txn-1',
      });
      mockPrisma.financialTransaction.findUnique.mockResolvedValue({
        id: 'txn-1',
        postedAt: new Date(Date.now() - 10000),
      });

      await expect(service.preventEntryModification(mockPrisma, 'e1')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('checkIdempotency', () => {
    it('returns null when transaction does not exist', async () => {
      mockPrisma.financialTransaction.findUnique.mockResolvedValue(null);

      const result = await service.checkIdempotency(mockPrisma, 'unique-ref-123');

      expect(result).toBeNull();
    });

    it('returns transaction ID when duplicate exists', async () => {
      mockPrisma.financialTransaction.findUnique.mockResolvedValue({ id: 'txn-existing' });

      const result = await service.checkIdempotency(mockPrisma, 'unique-ref-123');

      expect(result).toBe('txn-existing');
    });
  });

  describe('getTransactionBalance', () => {
    it('returns balance information', async () => {
      mockPrisma.financialTransaction.findUnique.mockResolvedValue({
        id: 'txn-1',
        totalDebit: { toString: () => '1000.00', equals: jest.fn().mockReturnValue(true) },
        totalCredit: { toString: () => '1000.00' },
      });

      const result = await service.getTransactionBalance(mockPrisma, 'txn-1');

      expect(result).toEqual({
        debits: '1000.00',
        credits: '1000.00',
        balanced: true,
      });
    });

    it('detects imbalanced transactions', async () => {
      mockPrisma.financialTransaction.findUnique.mockResolvedValue({
        id: 'txn-1',
        totalDebit: { toString: () => '1000.00', equals: jest.fn().mockReturnValue(false) },
        totalCredit: { toString: () => '500.00' },
      });

      const result = await service.getTransactionBalance(mockPrisma, 'txn-1');

      expect(result.balanced).toBe(false);
    });
  });
});
