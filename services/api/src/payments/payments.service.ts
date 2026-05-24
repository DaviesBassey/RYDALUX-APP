import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const DRIVER_EARNINGS_BPS = 8000; // driver receives 80%, platform retains 20%
const PLATFORM_COMMISSION_BPS = 2000;
const BPS_DENOMINATOR = 10000;

const LEDGER_ACCOUNTS = {
  CASH_CLEARING: {
    code: 'platform:cash_clearing:NGN',
    name: 'Platform cash clearing',
    accountType: 'ASSET',
  },
  COMMISSION_REVENUE: {
    code: 'platform:commission_revenue:NGN',
    name: 'Platform commission revenue',
    accountType: 'REVENUE',
  },
  DRIVER_PAYABLE: {
    code: 'platform:driver_payable:NGN',
    name: 'Driver payable',
    accountType: 'LIABILITY',
  },
  PAYOUT_CLEARING: {
    code: 'platform:payout_clearing:NGN',
    name: 'Payout clearing',
    accountType: 'LIABILITY',
  },
} as const;

type FinancialTx = Prisma.TransactionClient;
type LedgerEventType =
  | 'RIDER_PAYMENT_PENDING'
  | 'RIDER_PAYMENT_AUTHORIZED'
  | 'RIDER_PAYMENT_CAPTURED'
  | 'PLATFORM_COMMISSION_RECORDED'
  | 'DRIVER_EARNING_RECORDED'
  | 'DRIVER_PAYOUT_PENDING'
  | 'DRIVER_PAYOUT_PAID'
  | 'REFUND_PENDING'
  | 'ADJUSTMENT';

function decimalToMinorUnits(value: { toString(): string }): bigint {
  const [wholePart, fractionPart = ''] = value.toString().split('.');
  const normalizedFraction = `${fractionPart}00`.slice(0, 2);
  return BigInt(wholePart) * 100n + BigInt(normalizedFraction);
}

function minorUnitsToDecimal(units: bigint): string {
  const sign = units < 0n ? '-' : '';
  const absolute = units < 0n ? -units : units;
  const whole = absolute / 100n;
  const fraction = (absolute % 100n).toString().padStart(2, '0');
  return `${sign}${whole}.${fraction}`;
}

function minorUnitsToNumber(units: bigint): number {
  return Number(minorUnitsToDecimal(units));
}

function calculateShare(amountMinor: bigint, basisPoints: number): bigint {
  return (amountMinor * BigInt(basisPoints)) / BigInt(BPS_DENOMINATOR);
}

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async initiateMockPayment(userId: string, tripId: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        riderProfile: { select: { userId: true } },
        fareQuote: { select: { totalFare: true } },
        payment: true,
      },
    }) as any;

    if (!trip) throw new NotFoundException('Trip not found.');
    if (!trip.riderProfile || trip.riderProfile.userId !== userId) throw new ForbiddenException('Access denied.');
    if (!trip.fareQuote) throw new BadRequestException('No fare quote for this trip.');
    if (trip.payment) {
      return this.formatPaymentResponse(trip.payment);
    }

    const reference = `RYD-PAY-${Date.now().toString(36).toUpperCase()}`;

    const payment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.payment.create({
        data: {
          userId,
          tripId,
          amount: trip.fareQuote.totalFare,
          currency: 'NGN',
          provider: 'mock-paystack',
          status: 'PENDING',
          reference,
        },
      });

      await this.recordAccountEvent(tx, {
        eventType: 'RIDER_PAYMENT_PENDING',
        reference: `payment:${created.id}:pending`,
        referenceType: 'PAYMENT',
        referenceId: created.id,
        paymentId: created.id,
        tripId,
        currency: created.currency,
        amountMinor: decimalToMinorUnits(created.amount),
        account: LEDGER_ACCOUNTS.CASH_CLEARING,
        transactionType: 'CREDIT',
        description: 'Rider payment pending',
      });

      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: 'RIDER_PAYMENT_PENDING',
          entity: 'PAYMENT',
          entityId: created.id,
          payload: { tripId, reference: created.reference } as any,
        },
      });

      return created;
    });

    return this.formatPaymentResponse(payment);
  }

  async getPaymentForTrip(tripId: string, userId: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        riderProfile: { select: { userId: true } },
        payment: true,
      },
    }) as any;

    if (!trip) throw new NotFoundException('Trip not found.');
    if (!trip.riderProfile || trip.riderProfile.userId !== userId) throw new ForbiddenException('Access denied.');

    const p = trip.payment;
    if (!p) {
      return { payment: null };
    }

    return {
      payment: {
        id: p.id,
        tripId,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        provider: p.provider,
        reference: p.reference,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      },
    };
  }

  // Called when driver accepts trip — mock auto-authorize
  async authorizePaymentForTrip(tripId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({ where: { tripId } });
      if (!payment) return;
      if (payment.status !== 'PENDING') return;

      const authorized = await tx.payment.updateMany({
        where: { id: payment.id, status: 'PENDING' },
        data: { status: 'AUTHORIZED', updatedAt: new Date() },
      });
      if (authorized.count !== 1) return;

      await this.recordAccountEvent(tx, {
        eventType: 'RIDER_PAYMENT_AUTHORIZED',
        reference: `payment:${payment.id}:authorized`,
        referenceType: 'PAYMENT',
        referenceId: payment.id,
        paymentId: payment.id,
        tripId,
        currency: payment.currency,
        amountMinor: decimalToMinorUnits(payment.amount),
        account: LEDGER_ACCOUNTS.CASH_CLEARING,
        transactionType: 'CREDIT',
        description: 'Rider payment authorized',
      });

      await tx.auditLog.create({
        data: {
          actorId: null,
          action: 'RIDER_PAYMENT_AUTHORIZED',
          entity: 'PAYMENT',
          entityId: payment.id,
          payload: { tripId, status: 'AUTHORIZED' } as any,
        },
      });
    });
  }

  // Called when trip transitions to COMPLETED.
  // Idempotent — safe to call multiple times.
  async capturePaymentForTrip(tripId: string, driverProfileId: string | null): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({ where: { tripId } });
      if (!payment) return;
      if (payment.status === 'CAPTURED') return;
      if (payment.status !== 'PENDING' && payment.status !== 'AUTHORIZED') return;

      const captured = await tx.payment.updateMany({
        where: { id: payment.id, status: { in: ['PENDING', 'AUTHORIZED'] } },
        data: { status: 'CAPTURED', updatedAt: new Date() },
      });
      if (captured.count !== 1) return;

      const grossMinor = decimalToMinorUnits(payment.amount);
      const driverMinor = calculateShare(grossMinor, DRIVER_EARNINGS_BPS);
      const commissionMinor = grossMinor - driverMinor;

      await this.recordAccountEvent(tx, {
        eventType: 'RIDER_PAYMENT_CAPTURED',
        reference: `payment:${payment.id}:captured`,
        referenceType: 'PAYMENT',
        referenceId: payment.id,
        paymentId: payment.id,
        tripId,
        currency: payment.currency,
        amountMinor: grossMinor,
        account: LEDGER_ACCOUNTS.CASH_CLEARING,
        transactionType: 'CREDIT',
        description: 'Rider payment captured',
      });

      await this.recordAccountEvent(tx, {
        eventType: 'PLATFORM_COMMISSION_RECORDED',
        reference: `payment:${payment.id}:commission`,
        referenceType: 'PAYMENT',
        referenceId: payment.id,
        paymentId: payment.id,
        tripId,
        currency: payment.currency,
        amountMinor: commissionMinor,
        account: LEDGER_ACCOUNTS.COMMISSION_REVENUE,
        transactionType: 'CREDIT',
        description: 'Platform commission recorded',
        metadata: { commissionBps: PLATFORM_COMMISSION_BPS },
      });

      if (driverProfileId) {
        const driverProfile = await tx.driverProfile.findUnique({
          where: { id: driverProfileId },
          select: { userId: true },
        });

        if (driverProfile) {
          await this.recordWalletEvent(tx, {
            eventType: 'DRIVER_EARNING_RECORDED',
            reference: `payment:${payment.id}:driver-earning`,
            referenceType: 'PAYMENT',
            referenceId: payment.id,
            paymentId: payment.id,
            tripId,
            userId: driverProfile.userId,
            currency: payment.currency,
            amountMinor: driverMinor,
            transactionType: 'CREDIT',
            description: 'Driver earning recorded',
            metadata: { driverProfileId, driverEarningsBps: DRIVER_EARNINGS_BPS },
          });

          await this.recordAccountEvent(tx, {
            eventType: 'DRIVER_EARNING_RECORDED',
            reference: `payment:${payment.id}:driver-payable`,
            referenceType: 'PAYMENT',
            referenceId: payment.id,
            paymentId: payment.id,
            tripId,
            currency: payment.currency,
            amountMinor: driverMinor,
            account: LEDGER_ACCOUNTS.DRIVER_PAYABLE,
            transactionType: 'CREDIT',
            description: 'Driver payable recorded',
            metadata: { driverProfileId },
          });
        }

        const payout = await tx.payout.create({
          data: {
            driverProfileId,
            amount: minorUnitsToDecimal(driverMinor),
            currency: payment.currency,
            provider: payment.provider,
            status: 'PENDING',
          },
        });

        await this.recordAccountEvent(tx, {
          eventType: 'DRIVER_PAYOUT_PENDING',
          reference: `payout:${payout.id}:pending`,
          referenceType: 'PAYOUT',
          referenceId: payout.id,
          paymentId: payment.id,
          payoutId: payout.id,
          tripId,
          currency: payout.currency,
          amountMinor: driverMinor,
          account: LEDGER_ACCOUNTS.PAYOUT_CLEARING,
          transactionType: 'CREDIT',
          description: 'Driver payout pending',
          metadata: { driverProfileId },
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: null,
          action: 'PAYMENT_CAPTURED',
          entity: 'PAYMENT',
          entityId: payment.id,
          payload: {
            tripId,
            driverProfileId,
            grossAmount: minorUnitsToDecimal(grossMinor),
            driverEarning: minorUnitsToDecimal(driverMinor),
            platformCommission: minorUnitsToDecimal(commissionMinor),
          } as any,
        },
      });
    });
  }

  async getDriverPayouts(userId: string, limit = 20, offset = 0) {
    const driverProfile = await this.prisma.driverProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!driverProfile) throw new NotFoundException('Driver profile not found.');

    const [items, total] = await Promise.all([
      this.prisma.payout.findMany({
        where: { driverProfileId: driverProfile.id },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.payout.count({ where: { driverProfileId: driverProfile.id } }),
    ]);

    return { items, total, limit, offset };
  }

  async listPayments(limit = 20, offset = 0) {
    const [items, total] = await Promise.all([
      this.prisma.payment.findMany({
        include: {
          user: { select: { id: true, displayName: true, phone: true, email: true } },
          trip: { select: { id: true, reference: true, status: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.payment.count(),
    ]);

    return {
      items: items.map((p) => ({
        id: p.id,
        tripId: p.tripId,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        reference: p.reference,
        provider: p.provider,
        createdAt: p.createdAt,
        user: p.user,
        trip: p.trip,
      })),
      total,
      limit,
      offset,
    };
  }

  async listPendingPayouts(limit = 20, offset = 0) {
    const [items, total] = await Promise.all([
      this.prisma.payout.findMany({
        where: { status: { in: ['PENDING', 'PROCESSING'] } },
        include: {
          driverProfile: {
            include: {
              user: { select: { id: true, displayName: true, phone: true, email: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.payout.count({ where: { status: { in: ['PENDING', 'PROCESSING'] } } }),
    ]);

    return {
      items: items.map((p) => ({
        id: p.id,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        provider: p.provider,
        createdAt: p.createdAt,
        driver: {
          id: p.driverProfile.user.id,
          name: p.driverProfile.user.displayName,
          phone: p.driverProfile.user.phone,
          email: p.driverProfile.user.email,
        },
      })),
      total,
      limit,
      offset,
    };
  }

  async getRevenueStats() {
    const [capturedAgg, byStatus, pendingPayoutsAgg, paidPayoutsAgg] = await Promise.all([
      this.prisma.payment.aggregate({
        where: { status: 'CAPTURED' },
        _sum: { amount: true },
        _count: { id: true },
      }),
      this.prisma.payment.groupBy({
        by: ['status'],
        _count: { id: true },
        _sum: { amount: true },
      }),
      this.prisma.payout.aggregate({
        where: { status: { in: ['PENDING', 'PROCESSING'] } },
        _sum: { amount: true },
        _count: { id: true },
      }),
      this.prisma.payout.aggregate({
        where: { status: 'PAID' },
        _sum: { amount: true },
        _count: { id: true },
      }),
    ]);

    const totalCapturedMinor = decimalToMinorUnits(capturedAgg._sum.amount ?? { toString: () => '0' });
    const totalPendingPayoutsMinor = decimalToMinorUnits(pendingPayoutsAgg._sum.amount ?? { toString: () => '0' });
    const totalPaidPayoutsMinor = decimalToMinorUnits(paidPayoutsAgg._sum.amount ?? { toString: () => '0' });
    const platformRevenueMinor = totalCapturedMinor - totalPaidPayoutsMinor - totalPendingPayoutsMinor;

    return {
      totalCaptured: minorUnitsToNumber(totalCapturedMinor),
      capturedCount: capturedAgg._count.id,
      byStatus: byStatus.map((row) => ({
        status: row.status,
        count: row._count.id,
        total: minorUnitsToNumber(decimalToMinorUnits(row._sum.amount ?? { toString: () => '0' })),
      })),
      pendingPayouts: {
        total: minorUnitsToNumber(totalPendingPayoutsMinor),
        count: pendingPayoutsAgg._count.id,
      },
      paidPayouts: {
        total: minorUnitsToNumber(totalPaidPayoutsMinor),
        count: paidPayoutsAgg._count.id,
      },
      platformRevenue: minorUnitsToNumber(platformRevenueMinor),
    };
  }

  async getFinanceSummary() {
    const [revenue, commissionAgg, driverEarningsAgg, failedPayments, refundAgg, idempotencyByStatus] = await Promise.all([
      this.getRevenueStats(),
      this.prisma.financialTransaction.aggregate({
        where: { eventType: 'PLATFORM_COMMISSION_RECORDED' },
        _sum: { amount: true },
        _count: { id: true },
      }),
      this.prisma.financialTransaction.aggregate({
        where: { eventType: 'DRIVER_EARNING_RECORDED', reference: { endsWith: ':driver-earning' } },
        _sum: { amount: true },
        _count: { id: true },
      }),
      this.prisma.payment.aggregate({
        where: { status: 'FAILED' },
        _sum: { amount: true },
        _count: { id: true },
      }),
      this.prisma.financialTransaction.aggregate({
        where: { eventType: 'REFUND_PENDING' },
        _sum: { amount: true },
        _count: { id: true },
      }),
      this.prisma.idempotencyKey.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
    ]);

    return {
      grossCapturedRevenue: revenue.totalCaptured,
      capturedCount: revenue.capturedCount,
      platformCommission: {
        total: this.decimalLikeToNumber(commissionAgg._sum.amount),
        count: commissionAgg._count.id,
      },
      driverEarnings: {
        total: this.decimalLikeToNumber(driverEarningsAgg._sum.amount),
        count: driverEarningsAgg._count.id,
      },
      pendingPayouts: revenue.pendingPayouts,
      paidPayouts: revenue.paidPayouts,
      failedPayments: {
        total: this.decimalLikeToNumber(failedPayments._sum.amount),
        count: failedPayments._count.id,
      },
      refunds: {
        total: this.decimalLikeToNumber(refundAgg._sum.amount),
        count: refundAgg._count.id,
      },
      paymentStatusSummary: revenue.byStatus,
      idempotency: idempotencyByStatus.map((row) => ({ status: row.status, count: row._count.id })),
    };
  }

  async listFinancePayments(limit = 20, offset = 0) {
    return this.listPayments(limit, offset);
  }

  async listFinancePayouts(limit = 20, offset = 0) {
    const [items, total] = await Promise.all([
      this.prisma.payout.findMany({
        include: {
          driverProfile: {
            include: {
              user: { select: { id: true, displayName: true, phone: true, email: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.payout.count(),
    ]);

    return {
      items: items.map((p) => ({
        id: p.id,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        provider: p.provider,
        providerReference: p.providerReference,
        createdAt: p.createdAt,
        processedAt: p.processedAt,
        driver: {
          id: p.driverProfile.user.id,
          name: p.driverProfile.user.displayName,
          phone: p.driverProfile.user.phone,
          email: p.driverProfile.user.email,
        },
      })),
      total,
      limit,
      offset,
    };
  }

  async listFinanceLedger(limit = 20, offset = 0) {
    const [items, total] = await Promise.all([
      this.prisma.ledgerEntry.findMany({
        include: {
          ledgerAccount: true,
          wallet: { include: { user: { select: { id: true, displayName: true, phone: true, email: true } } } },
          financialTransaction: {
            select: {
              id: true,
              eventType: true,
              reference: true,
              referenceType: true,
              referenceId: true,
              paymentId: true,
              payoutId: true,
              tripId: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.ledgerEntry.count(),
    ]);

    return { items, total, limit, offset };
  }

  async listFinanceWallets(limit = 20, offset = 0) {
    const [items, total] = await Promise.all([
      this.prisma.wallet.findMany({
        include: {
          user: { select: { id: true, displayName: true, phone: true, email: true, userType: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.wallet.count(),
    ]);

    return { items, total, limit, offset };
  }

  async getFinanceReconciliation() {
    const [ledgerTransactions, ledgerEntries, providerEvents, unprocessedProviderEvents, failedPayments, pendingPayouts] = await Promise.all([
      this.prisma.financialTransaction.count(),
      this.prisma.ledgerEntry.count(),
      this.prisma.providerEvent.count(),
      this.prisma.providerEvent.count({ where: { processedAt: null } }),
      this.prisma.payment.count({ where: { status: 'FAILED' } }),
      this.prisma.payout.count({ where: { status: { in: ['PENDING', 'PROCESSING'] } } }),
    ]);

    return {
      status: failedPayments === 0 && unprocessedProviderEvents === 0 ? 'CLEAR' : 'REVIEW_REQUIRED',
      ledgerTransactions,
      ledgerEntries,
      providerEvents,
      unprocessedProviderEvents,
      failedPayments,
      pendingPayouts,
      paystackMode: 'NOT_CONFIGURED',
    };
  }

  private async ensureLedgerAccount(
    tx: FinancialTx,
    account: { code: string; name: string; accountType: string },
    currency: string
  ) {
    return tx.ledgerAccount.upsert({
      where: { code: account.code },
      update: {},
      create: {
        code: account.code,
        name: account.name,
        accountType: account.accountType,
        currency,
      },
    });
  }

  private signedAmount(amountMinor: bigint, transactionType: 'CREDIT' | 'DEBIT'): string {
    return minorUnitsToDecimal(transactionType === 'DEBIT' ? -amountMinor : amountMinor);
  }

  private async recordAccountEvent(
    tx: FinancialTx,
    input: {
      eventType: LedgerEventType;
      reference: string;
      referenceType: string;
      referenceId: string;
      paymentId?: string;
      payoutId?: string;
      tripId?: string;
      currency: string;
      amountMinor: bigint;
      account: { code: string; name: string; accountType: string };
      transactionType: 'CREDIT' | 'DEBIT';
      description: string;
      metadata?: Record<string, unknown>;
    }
  ) {
    const existing = await tx.financialTransaction.findUnique({ where: { reference: input.reference } });
    if (existing) return existing;

    const account = await this.ensureLedgerAccount(tx, input.account, input.currency);
    const updatedAccount = await tx.ledgerAccount.update({
      where: { id: account.id },
      data: { balance: { increment: this.signedAmount(input.amountMinor, input.transactionType) } },
    });

    const financialTransaction = await tx.financialTransaction.create({
      data: {
        eventType: input.eventType,
        reference: input.reference,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        paymentId: input.paymentId,
        payoutId: input.payoutId,
        tripId: input.tripId,
        currency: input.currency,
        amount: minorUnitsToDecimal(input.amountMinor),
        metadata: input.metadata as any,
      },
    });

    await tx.ledgerEntry.create({
      data: {
        ledgerAccountId: account.id,
        financialTransactionId: financialTransaction.id,
        eventType: input.eventType,
        transactionType: input.transactionType,
        amount: minorUnitsToDecimal(input.amountMinor),
        balanceAfter: updatedAccount.balance,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        description: input.description,
        metadata: input.metadata as any,
      },
    });

    return financialTransaction;
  }

  private async recordWalletEvent(
    tx: FinancialTx,
    input: {
      eventType: LedgerEventType;
      reference: string;
      referenceType: string;
      referenceId: string;
      paymentId?: string;
      payoutId?: string;
      tripId?: string;
      userId: string;
      currency: string;
      amountMinor: bigint;
      transactionType: 'CREDIT' | 'DEBIT';
      description: string;
      metadata?: Record<string, unknown>;
    }
  ) {
    const existing = await tx.financialTransaction.findUnique({ where: { reference: input.reference } });
    if (existing) return existing;

    const wallet = await tx.wallet.upsert({
      where: { userId: input.userId },
      update: {},
      create: {
        userId: input.userId,
        currency: input.currency,
      },
    });

    const balanceBefore = wallet.balance;
    const updatedWallet = await tx.wallet.update({
      where: { id: wallet.id },
      data: { balance: { increment: this.signedAmount(input.amountMinor, input.transactionType) } },
    });

    const financialTransaction = await tx.financialTransaction.create({
      data: {
        eventType: input.eventType,
        reference: input.reference,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        paymentId: input.paymentId,
        payoutId: input.payoutId,
        tripId: input.tripId,
        currency: input.currency,
        amount: minorUnitsToDecimal(input.amountMinor),
        metadata: input.metadata as any,
      },
    });

    await tx.ledgerEntry.create({
      data: {
        walletId: wallet.id,
        financialTransactionId: financialTransaction.id,
        eventType: input.eventType,
        transactionType: input.transactionType,
        amount: minorUnitsToDecimal(input.amountMinor),
        balanceAfter: updatedWallet.balance,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        description: input.description,
        metadata: input.metadata as any,
      },
    });

    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        financialTransactionId: financialTransaction.id,
        eventType: input.eventType,
        transactionType: input.transactionType,
        amount: minorUnitsToDecimal(input.amountMinor),
        balanceBefore,
        balanceAfter: updatedWallet.balance,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        description: input.description,
        metadata: input.metadata as any,
      },
    });

    return financialTransaction;
  }

  private formatPaymentResponse(payment: any) {
    return {
      id: payment.id,
      tripId: payment.tripId,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      reference: payment.reference,
      provider: payment.provider,
      createdAt: payment.createdAt,
    };
  }

  private decimalLikeToNumber(value: { toString(): string } | null | undefined): number {
    return minorUnitsToNumber(decimalToMinorUnits(value ?? { toString: () => '0' }));
  }
}
