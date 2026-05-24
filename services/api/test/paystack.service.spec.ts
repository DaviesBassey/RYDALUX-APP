import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PaystackService } from '../src/payments/paystack.service';

describe('PaystackService Phase 7.6 reliability flows', () => {
  let service: PaystackService;

  const prisma: any = {
    providerEvent: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    payout: {
      findUnique: jest.fn(),
    },
    financialTransaction: {
      findUnique: jest.fn(),
    },
    financialOperation: {
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    refund: {
      findMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PaystackService(
      { post: jest.fn(), get: jest.fn() } as any,
      { get: jest.fn(() => '') } as any,
      {} as any,
      { hashProviderPayload: jest.fn(() => 'hash') } as any,
      prisma as any,
    );
  });

  it('dead-letters an unprocessed provider event', async () => {
    prisma.providerEvent.findUnique.mockResolvedValue({
      id: 'event-1',
      status: 'FAILED',
      processedAt: null,
      eventType: 'transfer.success',
      reference: 'TRF_1',
      lastError: 'Bad payload',
    });
    prisma.providerEvent.update.mockResolvedValue({ id: 'event-1', status: 'DEAD_LETTER' });
    prisma.auditLog.create.mockResolvedValue({});

    const result = await service.deadLetterProviderEvent('event-1', 'admin-1', 'Reviewed');

    expect(result.success).toBe(true);
    expect(prisma.providerEvent.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'event-1' },
      data: expect.objectContaining({ status: 'DEAD_LETTER', deadLetteredAt: expect.any(Date) }),
    }));
  });

  it('rejects dead-lettering a processed provider event', async () => {
    prisma.providerEvent.findUnique.mockResolvedValue({
      id: 'event-1',
      status: 'PROCESSED',
      processedAt: new Date(),
    });

    await expect(service.deadLetterProviderEvent('event-1', 'admin-1')).rejects.toThrow(BadRequestException);
  });

  it('rejects payout retry unless payout is failed', async () => {
    prisma.payout.findUnique.mockResolvedValue({ id: 'payout-1', status: 'PAID' });

    await expect(service.retryPayoutTransfer('payout-1', 'admin-1')).rejects.toThrow(BadRequestException);
    expect(prisma.financialTransaction.findUnique).not.toHaveBeenCalled();
  });

  it('rejects payout retry when paid ledger already exists', async () => {
    prisma.payout.findUnique.mockResolvedValue({ id: 'payout-1', status: 'FAILED' });
    prisma.financialTransaction.findUnique.mockResolvedValue({ id: 'ft-1' });

    await expect(service.retryPayoutTransfer('payout-1', 'admin-1')).rejects.toThrow(BadRequestException);
  });

  it('runs manual reconciliation and dispatches unreversed refunds', async () => {
    prisma.financialOperation.create.mockResolvedValue({ id: 'operation-1' });
    prisma.refund.findMany.mockResolvedValue([{ id: 'refund-1' }]);
    prisma.financialOperation.update.mockResolvedValue({});
    prisma.auditLog.create.mockResolvedValue({});
    prisma.payout.findMany = jest.fn().mockResolvedValue([]);
    prisma.providerEvent.findMany = jest.fn().mockResolvedValue([]);
    prisma.financialOperation.findMany = jest.fn().mockResolvedValue([]);
    (service as any).findPaidPayoutsMissingLedger = jest.fn().mockResolvedValue([]);
    (service as any).reverseFullRefundLedger = jest.fn().mockResolvedValue({ reversed: true });

    const result = await service.runManualReconciliation('admin-1');

    expect(result.success).toBe(true);
    expect((service as any).reverseFullRefundLedger).toHaveBeenCalledWith('refund-1', 'manual-reconciliation');
  });

  it('updates dispute admin state', async () => {
    prisma.dispute = {
      findUnique: jest.fn().mockResolvedValue({ id: 'dispute-1' }),
      update: jest.fn().mockResolvedValue({ id: 'dispute-1', adminStatus: 'UNDER_REVIEW' }),
    };
    prisma.auditLog.create.mockResolvedValue({});

    const result = await service.updateDisputeAdminState('dispute-1', 'admin-1', 'UNDER_REVIEW', 'Checking provider status');

    expect(result.success).toBe(true);
    expect(prisma.dispute.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { adminStatus: 'UNDER_REVIEW', adminNotes: 'Checking provider status' },
    }));
  });

  it('throws when dispute is missing', async () => {
    prisma.dispute = {
      findUnique: jest.fn().mockResolvedValue(null),
    };

    await expect(service.updateDisputeAdminState('missing', 'admin-1')).rejects.toThrow(NotFoundException);
  });
});
