import { FinanceSchedulerService } from '../src/scheduler/finance-scheduler.service';

describe('FinanceSchedulerService', () => {
  let service: FinanceSchedulerService;

  const prisma: any = {
    financialOperation: {
      create: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    providerEvent: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
    },
    payment: { aggregate: jest.fn() },
    refund: { aggregate: jest.fn(), count: jest.fn() },
    payout: { aggregate: jest.fn(), count: jest.fn() },
    financialTransaction: { aggregate: jest.fn() },
    dailyCloseReport: {
      upsert: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };
  const paystackService = {
    retryProviderEvent: jest.fn(),
    runManualReconciliation: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.financialOperation.create.mockResolvedValue({ id: 'operation-1' });
    prisma.financialOperation.update.mockResolvedValue({});
    service = new FinanceSchedulerService(prisma as any, paystackService as any);
  });

  it('retries due failed provider events and writes an operation result', async () => {
    prisma.providerEvent.findMany.mockResolvedValue([{ id: 'event-1' }, { id: 'event-2' }]);
    paystackService.retryProviderEvent.mockResolvedValue({ success: true, status: 'PROCESSED' });

    const result = await service.runDueProviderEventRetries('manual');

    expect(result.retried).toBe(2);
    expect(paystackService.retryProviderEvent).toHaveBeenCalledWith('event-1', null);
    expect(prisma.financialOperation.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'operation-1' },
      data: expect.objectContaining({ status: 'SUCCEEDED' }),
    }));
  });

  it('runs scheduled reconciliation through the shared reconciliation method', async () => {
    paystackService.runManualReconciliation.mockResolvedValue({ success: true, mismatches: { total: 0 } });

    const result = await service.runScheduledReconciliation();

    expect(result.scheduledOperationId).toBe('operation-1');
    expect(paystackService.runManualReconciliation).toHaveBeenCalledWith(null);
    expect(prisma.financialOperation.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'SUCCEEDED' }),
    }));
  });

  it('generates daily close report with upserted totals', async () => {
    const zero = { toString: () => '0.00' };
    prisma.payment.aggregate.mockResolvedValue({ _sum: { amount: { toString: () => '1000.00' } } });
    prisma.refund.aggregate.mockResolvedValue({ _sum: { amount: { toString: () => '100.00' } } });
    prisma.payout.aggregate.mockResolvedValue({ _sum: { amount: { toString: () => '500.00' } } });
    prisma.financialTransaction.aggregate
      .mockResolvedValueOnce({ _sum: { amount: { toString: () => '200.00' } } })
      .mockResolvedValueOnce({ _sum: { amount: { toString: () => '800.00' } } });
    prisma.providerEvent.count.mockResolvedValue(0);
    prisma.payout.count.mockResolvedValue(0);
    prisma.refund.count.mockResolvedValue(0);
    prisma.dailyCloseReport.upsert.mockResolvedValue({
      id: 'close-1',
      status: 'GENERATED',
      grossCapturedAmount: zero,
    });

    const result = await service.generateDailyClose(new Date('2026-05-25T12:00:00.000Z'));

    expect(result.success).toBe(true);
    expect(prisma.dailyCloseReport.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { closeDate_currency: { closeDate: new Date('2026-05-25T00:00:00.000Z'), currency: 'NGN' } },
      update: expect.objectContaining({
        grossCapturedAmount: '1000.00',
        refundAmount: '100.00',
      }),
    }));
  });

  it('returns scheduler status counts and latest close report', async () => {
    prisma.financialOperation.findFirst.mockResolvedValue({ id: 'operation-1', status: 'SUCCEEDED' });
    prisma.providerEvent.findFirst.mockResolvedValue({ nextRetryAt: new Date('2026-05-25T01:00:00.000Z') });
    prisma.providerEvent.count.mockResolvedValue(2);
    prisma.payout.count.mockResolvedValue(1);
    prisma.refund.count.mockResolvedValue(3);
    prisma.dailyCloseReport.findFirst.mockResolvedValue({ id: 'close-1' });

    const result = await service.getSchedulerStatus();

    expect(result.failedProviderEvents).toBe(2);
    expect(result.staleProcessingPayouts).toBe(1);
    expect(result.unreversedRefunds).toBe(3);
    expect(result.latestDailyClose.id).toBe('close-1');
  });
});
