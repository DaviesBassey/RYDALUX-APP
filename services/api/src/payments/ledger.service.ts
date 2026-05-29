import { Injectable, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { decimalToMinorUnits, minorUnitsToDecimal } from './payments.service';

export type FinancialTx = Prisma.TransactionClient;

@Injectable()
export class LedgerService {
  private readonly logger = new Logger(LedgerService.name);

  constructor(private readonly prisma: PrismaService) {}

  async validateLedgerBalance(tx: FinancialTx, financialTransactionId: string): Promise<boolean> {
    const entries = await tx.ledgerEntry.findMany({
      where: { financialTransactionId },
    });

    if (entries.length === 0) {
      throw new BadRequestException('Ledger transaction must have entries');
    }

    let totalDebit = 0n;
    let totalCredit = 0n;

    for (const entry of entries) {
      const amountMinor = decimalToMinorUnits(entry.amount);
      if (entry.transactionType === 'DEBIT') {
        totalDebit += amountMinor;
      } else {
        totalCredit += amountMinor;
      }
    }

    if (totalDebit !== totalCredit) {
      this.logger.error(
        `Ledger imbalance for transaction ${financialTransactionId}: debits=${minorUnitsToDecimal(totalDebit)}, credits=${minorUnitsToDecimal(totalCredit)}`
      );
      throw new BadRequestException('Ledger transaction must balance: debits must equal credits');
    }

    await tx.financialTransaction.update({
      where: { id: financialTransactionId },
      data: {
        totalDebit: minorUnitsToDecimal(totalDebit),
        totalCredit: minorUnitsToDecimal(totalCredit),
      },
    });

    return true;
  }

  async preventEntryModification(tx: FinancialTx, entryId: string): Promise<void> {
    const entry = await tx.ledgerEntry.findUnique({ where: { id: entryId } });
    if (!entry) {
      throw new BadRequestException('Ledger entry not found');
    }

    const transaction = await tx.financialTransaction.findUnique({
      where: { id: entry.financialTransactionId! },
    });

    if (transaction?.postedAt && new Date().getTime() - transaction.postedAt.getTime() > 1000) {
      throw new ForbiddenException('Posted ledger entries are immutable and cannot be modified');
    }
  }

  async createReversal(
    tx: FinancialTx,
    originalTransactionId: string,
    reversedByAdminId: string,
    reversalReason: string
  ): Promise<string> {
    const original = await tx.financialTransaction.findUnique({
      where: { id: originalTransactionId },
      include: { ledgerEntries: true },
    });

    if (!original) {
      throw new BadRequestException('Original transaction not found');
    }

    if (original.status !== 'POSTED') {
      throw new BadRequestException('Can only reverse posted transactions');
    }

    const reversalReference = `${original.reference}:reversal:${Date.now().toString(36).toUpperCase()}`;

    const reversalTransaction = await tx.financialTransaction.create({
      data: {
        eventType: original.eventType,
        reference: reversalReference,
        referenceType: original.referenceType,
        referenceId: original.referenceId,
        paymentId: original.paymentId,
        payoutId: original.payoutId,
        tripId: original.tripId,
        currency: original.currency,
        amount: original.amount,
        status: 'POSTED',
        postedAt: new Date(),
        reversedAt: null,
        reversalReferenceId: originalTransactionId,
        reversedByAdminId,
        metadata: {
          ...((original.metadata as Record<string, unknown>) || {}),
          reversalReason,
          reversedFromTransactionId: originalTransactionId,
        },
      },
    });

    for (const entry of original.ledgerEntries) {
      const reversedTransactionType = entry.transactionType === 'DEBIT' ? 'CREDIT' : 'DEBIT';
      await tx.ledgerEntry.create({
        data: {
          walletId: entry.walletId,
          ledgerAccountId: entry.ledgerAccountId,
          financialTransactionId: reversalTransaction.id,
          eventType: entry.eventType,
          transactionType: reversedTransactionType,
          amount: entry.amount,
          balanceAfter: entry.balanceAfter,
          referenceType: entry.referenceType,
          referenceId: entry.referenceId,
          description: `Reversal of: ${entry.description}`,
          metadata: entry.metadata || undefined,
        },
      });
    }

    await tx.financialTransaction.update({
      where: { id: originalTransactionId },
      data: {
        status: 'REVERSED',
        reversedAt: new Date(),
        reversalReference,
        reversedByAdminId,
      },
    });

    await this.validateLedgerBalance(tx, reversalTransaction.id);

    return reversalTransaction.id;
  }

  async recordManualAdjustment(
    tx: FinancialTx,
    adminId: string,
    ledgerAccountId: string,
    amountMinor: bigint,
    transactionType: 'CREDIT' | 'DEBIT',
    reason: string,
    metadata?: Record<string, unknown>
  ): Promise<string> {
    if (!adminId) {
      throw new ForbiddenException('Admin ID required for manual adjustment');
    }

    if (!reason || reason.trim().length === 0) {
      throw new BadRequestException('Manual adjustment reason required');
    }

    const reference = `MANUAL-ADJ-${Date.now().toString(36).toUpperCase()}`;

    const account = await tx.ledgerAccount.findUnique({ where: { id: ledgerAccountId } });
    if (!account) {
      throw new BadRequestException('Ledger account not found');
    }

    const transaction = await tx.financialTransaction.create({
      data: {
        eventType: 'ADJUSTMENT',
        reference,
        referenceType: 'MANUAL_ADJUSTMENT',
        referenceId: null,
        currency: account.currency,
        amount: minorUnitsToDecimal(amountMinor),
        status: 'POSTED',
        postedAt: new Date(),
        metadata: {
          ...(metadata || {}),
          reason,
          adjustedByAdminId: adminId,
        },
      },
    });

    const updatedAccount = await tx.ledgerAccount.update({
      where: { id: ledgerAccountId },
      data: { balance: { increment: minorUnitsToDecimal(transactionType === 'DEBIT' ? -amountMinor : amountMinor) } },
    });

    await tx.ledgerEntry.create({
      data: {
        ledgerAccountId,
        financialTransactionId: transaction.id,
        eventType: 'ADJUSTMENT',
        transactionType,
        amount: minorUnitsToDecimal(amountMinor),
        balanceAfter: updatedAccount.balance,
        referenceType: 'MANUAL_ADJUSTMENT',
        referenceId: null,
        description: reason,
        metadata: { adjustedByAdminId: adminId },
      },
    });

    const balancingTransactionType = transactionType === 'DEBIT' ? 'CREDIT' : 'DEBIT';
    await tx.ledgerEntry.create({
      data: {
        ledgerAccountId: ledgerAccountId,
        financialTransactionId: transaction.id,
        eventType: 'ADJUSTMENT',
        transactionType: balancingTransactionType,
        amount: minorUnitsToDecimal(amountMinor),
        balanceAfter: updatedAccount.balance,
        referenceType: 'MANUAL_ADJUSTMENT_COUNTER',
        referenceId: null,
        description: `Balancing entry for: ${reason}`,
        metadata: { adjustedByAdminId: adminId },
      },
    });

    await this.validateLedgerBalance(tx, transaction.id);

    await this.prisma.auditLog.create({
      data: {
        actorId: adminId,
        action: 'LEDGER_MANUAL_ADJUSTMENT',
        entity: 'FINANCIAL_TRANSACTION',
        entityId: transaction.id,
        payload: {
          ledgerAccountId,
          amount: minorUnitsToDecimal(amountMinor),
          transactionType,
          reason,
          reference,
        } as any,
      },
    });

    return transaction.id;
  }

  async checkIdempotency(tx: FinancialTx, reference: string): Promise<string | null> {
    const existing = await tx.financialTransaction.findUnique({ where: { reference } });
    return existing?.id ?? null;
  }

  async getTransactionBalance(tx: FinancialTx, transactionId: string): Promise<{ debits: string; credits: string; balanced: boolean }> {
    const transaction = await tx.financialTransaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new BadRequestException('Transaction not found');
    }

    return {
      debits: transaction.totalDebit.toString(),
      credits: transaction.totalCredit.toString(),
      balanced: transaction.totalDebit.equals(transaction.totalCredit),
    };
  }

  async listTransactions(limit = 20, offset = 0, status?: string) {
    const where = status ? { status } : {};
    const [transactions, total] = await Promise.all([
      this.prisma.financialTransaction.findMany({
        where,
        include: { ledgerEntries: true },
        orderBy: { postedAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.financialTransaction.count({ where }),
    ]);

    return {
      transactions: transactions.map((t) => ({
        id: t.id,
        reference: t.reference,
        eventType: t.eventType,
        status: t.status,
        totalDebit: t.totalDebit.toString(),
        totalCredit: t.totalCredit.toString(),
        balanced: t.totalDebit.equals(t.totalCredit),
        postedAt: t.postedAt,
        reversedAt: t.reversedAt,
        entriesCount: t.ledgerEntries.length,
      })),
      total,
      limit,
      offset,
    };
  }
}
