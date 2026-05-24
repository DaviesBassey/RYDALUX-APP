import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaystackService } from '../payments/paystack.service';
import { decimalToMinorUnits, minorUnitsToDecimal } from '../payments/payments.service';

@Injectable()
export class FinanceSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FinanceSchedulerService.name);
  private readonly timers: NodeJS.Timeout[] = [];

  constructor(
    private readonly prisma: PrismaService,
    private readonly paystackService: PaystackService,
  ) {}

  onModuleInit() {
    if (process.env.NODE_ENV === 'test' || process.env.FINANCE_SCHEDULER_DISABLED === 'true') {
      return;
    }

    this.timers.push(setInterval(() => void this.runDueProviderEventRetries('scheduled'), 5 * 60 * 1000));
    this.timers.push(setInterval(() => void this.runScheduledReconciliation(), 15 * 60 * 1000));
    this.timers.push(setInterval(() => void this.generateDailyClose(), 60 * 60 * 1000));
  }

  onModuleDestroy() {
    for (const timer of this.timers) clearInterval(timer);
  }

  async runDueProviderEventRetries(source: 'manual' | 'scheduled' = 'manual') {
    const operation = await this.prisma.financialOperation.create({
      data: {
        operationType: 'PROVIDER_EVENT_RETRY',
        status: 'PROCESSING',
        provider: 'paystack',
        entityType: 'PROVIDER_EVENT',
        entityId: `${source}:${Date.now()}`,
        attemptCount: 1,
        lastAttemptAt: new Date(),
      },
    });

    try {
      const events = await this.prisma.providerEvent.findMany({
        where: {
          status: 'FAILED',
          OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: new Date() } }],
        },
        orderBy: { createdAt: 'asc' },
        take: 10,
      });

      const results = [];
      for (const event of events) {
        results.push({ eventId: event.id, result: await this.paystackService.retryProviderEvent(event.id, null) });
      }

      await this.prisma.financialOperation.update({
        where: { id: operation.id },
        data: {
          status: 'SUCCEEDED',
          responsePayload: { source, retried: results.length, results } as any,
          completedAt: new Date(),
        },
      });

      return { success: true, operationId: operation.id, retried: results.length, results };
    } catch (error) {
      await this.prisma.financialOperation.update({
        where: { id: operation.id },
        data: {
          status: 'FAILED',
          errorMessage: (error as Error).message,
          nextRetryAt: new Date(Date.now() + 5 * 60 * 1000),
        },
      });
      this.logger.error(`Provider event retry job failed: ${(error as Error).message}`);
      throw error;
    }
  }

  async runScheduledReconciliation() {
    const operation = await this.prisma.financialOperation.create({
      data: {
        operationType: 'SCHEDULED_RECONCILIATION',
        status: 'PROCESSING',
        provider: 'internal',
        entityType: 'RECONCILIATION',
        entityId: `scheduled:${Date.now()}`,
        attemptCount: 1,
        lastAttemptAt: new Date(),
      },
    });

    try {
      const result = await this.paystackService.runManualReconciliation(null);
      await this.prisma.financialOperation.update({
        where: { id: operation.id },
        data: {
          status: result.mismatches?.total > 0 ? 'NEEDS_RECONCILIATION' : 'SUCCEEDED',
          responsePayload: result as any,
          completedAt: new Date(),
        },
      });

      return { ...result, scheduledOperationId: operation.id };
    } catch (error) {
      await this.prisma.financialOperation.update({
        where: { id: operation.id },
        data: {
          status: 'FAILED',
          errorMessage: (error as Error).message,
          nextRetryAt: new Date(Date.now() + 15 * 60 * 1000),
        },
      });
      this.logger.error(`Scheduled reconciliation failed: ${(error as Error).message}`);
      throw error;
    }
  }

  async generateDailyClose(date = new Date(), currency = 'NGN') {
    const { start, end } = this.closeWindow(date);
    const operation = await this.prisma.financialOperation.create({
      data: {
        operationType: 'DAILY_CLOSE',
        status: 'PROCESSING',
        provider: 'internal',
        entityType: 'DAILY_CLOSE',
        entityId: `${start.toISOString()}:${currency}`,
        requestPayload: { closeDate: start.toISOString(), currency } as any,
        attemptCount: 1,
        lastAttemptAt: new Date(),
      },
    });

    try {
      const [captured, refunds, paidPayouts, commissions, driverEarnings, failedProviderEvents, staleProcessingPayouts, unreversedRefunds] =
        await Promise.all([
          this.prisma.payment.aggregate({
            where: { status: 'CAPTURED', currency, updatedAt: { gte: start, lt: end } },
            _sum: { amount: true },
          }),
          this.prisma.refund.aggregate({
            where: { status: 'PROCESSED', currency, processedAt: { gte: start, lt: end } },
            _sum: { amount: true },
          }),
          this.prisma.payout.aggregate({
            where: { status: 'PAID', currency, processedAt: { gte: start, lt: end } },
            _sum: { amount: true },
          }),
          this.prisma.financialTransaction.aggregate({
            where: { eventType: 'PLATFORM_COMMISSION_RECORDED', currency, createdAt: { gte: start, lt: end } },
            _sum: { amount: true },
          }),
          this.prisma.financialTransaction.aggregate({
            where: { eventType: 'DRIVER_EARNING_RECORDED', currency, reference: { endsWith: ':driver-earning' }, createdAt: { gte: start, lt: end } },
            _sum: { amount: true },
          }),
          this.prisma.providerEvent.count({ where: { status: 'FAILED', updatedAt: { gte: start, lt: end } } }),
          this.prisma.payout.count({ where: { status: 'PROCESSING', transferInitiatedAt: { lt: new Date(Date.now() - 30 * 60 * 1000) } } }),
          this.prisma.refund.count({ where: { status: 'PROCESSED', ledgerReversedAt: null } }),
        ]);

      const report = await this.prisma.dailyCloseReport.upsert({
        where: { closeDate_currency: { closeDate: start, currency } },
        update: {
          grossCapturedAmount: this.decimalValue(captured._sum.amount),
          refundAmount: this.decimalValue(refunds._sum.amount),
          paidPayoutAmount: this.decimalValue(paidPayouts._sum.amount),
          platformCommissionAmount: this.decimalValue(commissions._sum.amount),
          driverEarningAmount: this.decimalValue(driverEarnings._sum.amount),
          failedProviderEvents,
          staleProcessingPayouts,
          unreversedRefunds,
          status: failedProviderEvents || staleProcessingPayouts || unreversedRefunds ? 'REVIEW_REQUIRED' : 'GENERATED',
          metadata: { windowStart: start.toISOString(), windowEnd: end.toISOString() } as any,
          generatedAt: new Date(),
        },
        create: {
          closeDate: start,
          currency,
          grossCapturedAmount: this.decimalValue(captured._sum.amount),
          refundAmount: this.decimalValue(refunds._sum.amount),
          paidPayoutAmount: this.decimalValue(paidPayouts._sum.amount),
          platformCommissionAmount: this.decimalValue(commissions._sum.amount),
          driverEarningAmount: this.decimalValue(driverEarnings._sum.amount),
          failedProviderEvents,
          staleProcessingPayouts,
          unreversedRefunds,
          status: failedProviderEvents || staleProcessingPayouts || unreversedRefunds ? 'REVIEW_REQUIRED' : 'GENERATED',
          metadata: { windowStart: start.toISOString(), windowEnd: end.toISOString() } as any,
        },
      });

      await this.prisma.financialOperation.update({
        where: { id: operation.id },
        data: {
          status: report.status === 'REVIEW_REQUIRED' ? 'NEEDS_RECONCILIATION' : 'SUCCEEDED',
          responsePayload: { reportId: report.id, status: report.status } as any,
          completedAt: new Date(),
        },
      });

      return { success: true, report, operationId: operation.id };
    } catch (error) {
      await this.prisma.financialOperation.update({
        where: { id: operation.id },
        data: {
          status: 'FAILED',
          errorMessage: (error as Error).message,
          nextRetryAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });
      throw error;
    }
  }

  async getSchedulerStatus() {
    const staleCutoff = new Date(Date.now() - 30 * 60 * 1000);
    const [lastReconciliationRun, nextRetryEvent, failedProviderEvents, staleProcessingPayouts, unreversedRefunds, latestDailyClose] =
      await Promise.all([
        this.prisma.financialOperation.findFirst({
          where: { operationType: { in: ['MANUAL_RECONCILIATION', 'SCHEDULED_RECONCILIATION'] } },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.providerEvent.findFirst({
          where: { status: 'FAILED', nextRetryAt: { not: null } },
          orderBy: { nextRetryAt: 'asc' },
        }),
        this.prisma.providerEvent.count({ where: { status: 'FAILED' } }),
        this.prisma.payout.count({ where: { status: 'PROCESSING', transferInitiatedAt: { lt: staleCutoff } } }),
        this.prisma.refund.count({ where: { status: 'PROCESSED', ledgerReversedAt: null } }),
        this.prisma.dailyCloseReport.findFirst({ orderBy: { closeDate: 'desc' } }),
      ]);

    return {
      lastReconciliationRun,
      nextRetryAt: nextRetryEvent?.nextRetryAt ?? null,
      failedProviderEvents,
      staleProcessingPayouts,
      unreversedRefunds,
      latestDailyClose,
    };
  }

  async listReconciliationJobs(limit = 20, offset = 0) {
    const where = {
      operationType: { in: ['MANUAL_RECONCILIATION', 'SCHEDULED_RECONCILIATION', 'PROVIDER_EVENT_RETRY', 'DAILY_CLOSE'] as any[] },
    };
    const [items, total] = await Promise.all([
      this.prisma.financialOperation.findMany({ where, orderBy: { createdAt: 'desc' }, take: limit, skip: offset }),
      this.prisma.financialOperation.count({ where }),
    ]);
    return { items, total, limit, offset };
  }

  async listDailyCloseReports(limit = 20, offset = 0) {
    const [items, total] = await Promise.all([
      this.prisma.dailyCloseReport.findMany({ orderBy: { closeDate: 'desc' }, take: limit, skip: offset }),
      this.prisma.dailyCloseReport.count(),
    ]);
    return { items, total, limit, offset };
  }

  async getLatestDailyCloseReport() {
    return { report: await this.prisma.dailyCloseReport.findFirst({ orderBy: { closeDate: 'desc' } }) };
  }

  private closeWindow(date: Date) {
    const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    return { start, end };
  }

  private decimalValue(value: { toString(): string } | null | undefined) {
    return minorUnitsToDecimal(decimalToMinorUnits(value ?? { toString: () => '0.00' }));
  }
}
