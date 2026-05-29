import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService, decimalToMinorUnits, minorUnitsToDecimal } from './payments.service';
import { LedgerService } from './ledger.service';

export type FinancialTx = Prisma.TransactionClient;

export class AddPayoutAccountDto {
  bankCode: string;
  bankName?: string;
  accountName: string;
  accountNumber: string;
  accountHolderName?: string;
}

export class RequestPayoutDto {
  amount: string;
  reason?: string;
}

export class RejectPayoutDto {
  reason: string;
}

export class MarkPayoutFailedDto {
  reason: string;
}

const MIN_PAYOUT_THRESHOLD = 100000n; // 1000 NGN in minor units (100,000 cents)
const PAYOUT_COOLDOWN_HOURS = 24;
const REAUTH_REQUIRED_DAYS = 30;

@Injectable()
export class PayoutsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsService: PaymentsService,
    private readonly ledgerService: LedgerService,
  ) {}

  async addPayoutAccount(
    driverId: string,
    accountDto: AddPayoutAccountDto,
  ): Promise<any> {
    const driver = await this.prisma.driverProfile.findUnique({
      where: { userId: driverId },
    });

    if (!driver) {
      throw new NotFoundException('Driver profile not found');
    }

    const cooldownUntil = new Date(Date.now() + PAYOUT_COOLDOWN_HOURS * 60 * 60 * 1000);
    const reAuthUntil = new Date(Date.now() + REAUTH_REQUIRED_DAYS * 24 * 60 * 60 * 1000);

    return this.prisma.$transaction(async (tx) => {
      // Update payout account
      const bankAccount = await tx.driverBankAccount.upsert({
        where: { driverProfileId: driver.id },
        create: {
          driverProfileId: driver.id,
          bankCode: accountDto.bankCode,
          bankName: accountDto.bankName,
          accountName: accountDto.accountName,
          accountNumberLast4: accountDto.accountNumber.slice(-4),
          currency: 'NGN',
          provider: 'paystack',
          verifiedAt: new Date(),
          reAuthRequiredAt: reAuthUntil,
        },
        update: {
          bankCode: accountDto.bankCode,
          bankName: accountDto.bankName,
          accountName: accountDto.accountName,
          accountNumberLast4: accountDto.accountNumber.slice(-4),
          verifiedAt: new Date(),
          reAuthRequiredAt: reAuthUntil,
        },
      });

      // Update payout cooldown on driver profile
      await tx.driverProfile.update({
        where: { id: driver.id },
        data: {
          payoutAccountCooldownUntil: cooldownUntil,
        },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          actorId: driverId,
          action: 'PAYOUT_ACCOUNT_ADDED',
          entity: 'PAYOUT_ACCOUNT',
          entityId: bankAccount.id,
          payload: {
            bankCode: accountDto.bankCode,
            accountLast4: accountDto.accountNumber.slice(-4),
          } as any,
        },
      });

      return bankAccount;
    });
  }

  async requestPayout(
    driverId: string,
    amount: string,
    reason?: string,
  ): Promise<any> {
    const driver = await this.prisma.driverProfile.findUnique({
      where: { userId: driverId },
      include: { bankAccount: true },
    });

    if (!driver) {
      throw new NotFoundException('Driver profile not found');
    }

    // Check KYC status
    const kyc = await this.prisma.kycCheck.findFirst({
      where: { userId: driverId },
      orderBy: { createdAt: 'desc' },
    });

    if (!kyc || kyc.status !== 'APPROVED') {
      throw new BadRequestException('Driver must have approved KYC to request payout');
    }

    // Check payout account exists and is verified
    if (!driver.bankAccount || !driver.bankAccount.verifiedAt) {
      throw new BadRequestException('Payout account must be added and verified before requesting payout');
    }

    // Check cooldown
    if (driver.payoutAccountCooldownUntil && new Date() < driver.payoutAccountCooldownUntil) {
      throw new BadRequestException('Payout account change cooldown in effect. Please wait before requesting another payout');
    }

    // Check amount is above minimum
    const amountMinor = decimalToMinorUnits({ toString: () => amount });
    if (amountMinor < MIN_PAYOUT_THRESHOLD) {
      throw new BadRequestException(`Minimum payout amount is ${minorUnitsToDecimal(MIN_PAYOUT_THRESHOLD)} NGN`);
    }

    // Check available balance from DRIVER_PAYABLE account
    const driverPayableAccount = await this.prisma.ledgerAccount.findUnique({
      where: { code: 'platform:driver_payable:NGN' },
    });

    if (!driverPayableAccount) {
      throw new BadRequestException('Driver payable account not configured');
    }

    const requiredBalance = decimalToMinorUnits({ toString: () => driverPayableAccount.balance.toString() });
    if (requiredBalance < amountMinor) {
      throw new BadRequestException(
        `Insufficient balance. Available: ${minorUnitsToDecimal(requiredBalance)} NGN, Requested: ${amount} NGN`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // Create payout request
      const payout = await tx.payout.create({
        data: {
          driverProfileId: driver.id,
          amount: amount,
          currency: 'NGN',
          status: 'REQUESTED',
          provider: 'paystack',
          requestedByDriverId: driverId,
          requestedAt: new Date(),
          notes: reason,
        },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          actorId: driverId,
          action: 'PAYOUT_REQUESTED',
          entity: 'PAYOUT',
          entityId: payout.id,
          payload: {
            amount,
            reason,
          } as any,
        },
      });

      return payout;
    });
  }

  async approvePayout(
    tx: FinancialTx,
    adminId: string,
    payoutId: string,
    comment?: string,
  ): Promise<any> {
    const payout = await tx.payout.findUnique({
      where: { id: payoutId },
      include: { driverProfile: true },
    });

    if (!payout) {
      throw new NotFoundException('Payout not found');
    }

    // Check idempotency: if already approved with ledger transaction, skip
    const existingTxn = await tx.financialTransaction.findUnique({
      where: { reference: `payout:${payoutId}:approved` },
    });

    if (existingTxn && payout.status === 'APPROVED') {
      return payout; // Already approved, return existing payout
    }

    if (payout.status !== 'REQUESTED') {
      throw new BadRequestException(`Cannot approve payout with status ${payout.status}`);
    }

    const approvedAt = new Date();
    const amountMinor = decimalToMinorUnits({ toString: () => payout.amount.toString() });

    // Create ledger transaction: DEBIT DRIVER_PAYABLE, CREDIT PAYOUT_CLEARING
    const driverPayableAccount = await tx.ledgerAccount.findUnique({
      where: { code: 'platform:driver_payable:NGN' },
    });
    const payoutClearingAccount = await tx.ledgerAccount.findUnique({
      where: { code: 'platform:payout_clearing:NGN' },
    });

    if (!driverPayableAccount || !payoutClearingAccount) {
      throw new BadRequestException('Required ledger accounts not configured');
    }

    // Record account events (uses existing PaymentsService pattern)
    await this.paymentsService.recordAccountEvent(tx, {
      eventType: 'DRIVER_PAYOUT_PENDING',
      reference: `payout:${payoutId}:approved:driver-payable`,
      referenceType: 'PAYOUT',
      referenceId: payoutId,
      payoutId,
      currency: payout.currency,
      account: driverPayableAccount,
      transactionType: 'DEBIT',
      amountMinor,
      description: `Payout approved for driver ${payout.driverProfile.id}`,
    });

    await this.paymentsService.recordAccountEvent(tx, {
      eventType: 'DRIVER_PAYOUT_PENDING',
      reference: `payout:${payoutId}:approved:payout-clearing`,
      referenceType: 'PAYOUT',
      referenceId: payoutId,
      payoutId,
      currency: payout.currency,
      account: payoutClearingAccount,
      transactionType: 'CREDIT',
      amountMinor,
      description: `Payout clearing for driver ${payout.driverProfile.id}`,
    });

    // Validate ledger balance
    const lastTxn = await tx.financialTransaction.findFirst({
      where: { reference: { startsWith: `payout:${payoutId}:approved` } },
      orderBy: { createdAt: 'desc' },
    });

    if (lastTxn) {
      await this.ledgerService.validateLedgerBalance(tx, lastTxn.id);
    }

    // Update payout status
    const updatedPayout = await tx.payout.update({
      where: { id: payoutId },
      data: {
        status: 'APPROVED',
        approvedByAdminId: adminId,
        approvedAt: approvedAt,
        notes: comment,
      },
    });

    // Audit log
    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action: 'PAYOUT_APPROVED',
        entity: 'PAYOUT',
        entityId: payoutId,
        payload: {
          amount: payout.amount,
          comment,
        } as any,
      },
    });

    return updatedPayout;
  }

  async rejectPayout(
    tx: FinancialTx,
    adminId: string,
    payoutId: string,
    reason: string,
  ): Promise<any> {
    if (!reason || reason.trim().length === 0) {
      throw new BadRequestException('Rejection reason is required');
    }

    const payout = await tx.payout.findUnique({
      where: { id: payoutId },
    });

    if (!payout) {
      throw new NotFoundException('Payout not found');
    }

    if (payout.status !== 'REQUESTED') {
      throw new BadRequestException(`Cannot reject payout with status ${payout.status}`);
    }

    const rejectedAt = new Date();

    const updatedPayout = await tx.payout.update({
      where: { id: payoutId },
      data: {
        status: 'REJECTED',
        rejectedByAdminId: adminId,
        rejectedAt: rejectedAt,
        rejectionReason: reason,
      },
    });

    // Audit log
    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action: 'PAYOUT_REJECTED',
        entity: 'PAYOUT',
        entityId: payoutId,
        payload: {
          amount: payout.amount,
          reason,
        } as any,
      },
    });

    return updatedPayout;
  }

  async markPayoutProcessing(tx: FinancialTx, adminId: string, payoutId: string): Promise<any> {
    const payout = await tx.payout.findUnique({ where: { id: payoutId } });

    if (!payout) {
      throw new NotFoundException('Payout not found');
    }

    if (payout.status !== 'APPROVED') {
      throw new BadRequestException(`Cannot mark as processing. Current status: ${payout.status}`);
    }

    const updatedPayout = await tx.payout.update({
      where: { id: payoutId },
      data: { status: 'PROCESSING', transferInitiatedAt: new Date() },
    });

    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action: 'PAYOUT_PROCESSING',
        entity: 'PAYOUT',
        entityId: payoutId,
        payload: { status: 'PROCESSING' } as any,
      },
    });

    return updatedPayout;
  }

  async markPayoutPaid(tx: FinancialTx, adminId: string, payoutId: string, providerReference?: string): Promise<any> {
    const payout = await tx.payout.findUnique({ where: { id: payoutId } });

    if (!payout) {
      throw new NotFoundException('Payout not found');
    }

    if (payout.status !== 'PROCESSING') {
      throw new BadRequestException(`Cannot mark as paid. Current status: ${payout.status}`);
    }

    const updatedPayout = await tx.payout.update({
      where: { id: payoutId },
      data: {
        status: 'PAID',
        processedAt: new Date(),
        providerReference: providerReference || payout.providerReference,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action: 'PAYOUT_PAID',
        entity: 'PAYOUT',
        entityId: payoutId,
        payload: { status: 'PAID', providerReference } as any,
      },
    });

    return updatedPayout;
  }

  async markPayoutFailed(tx: FinancialTx, adminId: string, payoutId: string, reason: string): Promise<any> {
    const payout = await tx.payout.findUnique({ where: { id: payoutId } });

    if (!payout) {
      throw new NotFoundException('Payout not found');
    }

    if (payout.status !== 'PROCESSING') {
      throw new BadRequestException(`Cannot mark as failed. Current status: ${payout.status}`);
    }

    const updatedPayout = await tx.payout.update({
      where: { id: payoutId },
      data: {
        status: 'FAILED',
        failedAt: new Date(),
        transferFailureReason: reason,
      },
    });

    // Create reversal ledger transaction to move balance back
    const amountMinor = decimalToMinorUnits({ toString: () => payout.amount.toString() });

    const driverPayableAccount = await tx.ledgerAccount.findUnique({
      where: { code: 'platform:driver_payable:NGN' },
    });
    const payoutClearingAccount = await tx.ledgerAccount.findUnique({
      where: { code: 'platform:payout_clearing:NGN' },
    });

    if (driverPayableAccount && payoutClearingAccount) {
      // Reverse the approved entry: CREDIT DRIVER_PAYABLE, DEBIT PAYOUT_CLEARING
      await this.paymentsService.recordAccountEvent(tx, {
        eventType: 'ADJUSTMENT',
        reference: `payout:${payoutId}:failed:driver-payable`,
        referenceType: 'PAYOUT',
        referenceId: payoutId,
        payoutId,
        currency: payout.currency,
        account: driverPayableAccount,
        transactionType: 'CREDIT',
        amountMinor,
        description: `Payout failed reversal for driver ${payout.driverProfileId}`,
      });

      await this.paymentsService.recordAccountEvent(tx, {
        eventType: 'ADJUSTMENT',
        reference: `payout:${payoutId}:failed:payout-clearing`,
        referenceType: 'PAYOUT',
        referenceId: payoutId,
        payoutId,
        currency: payout.currency,
        account: payoutClearingAccount,
        transactionType: 'DEBIT',
        amountMinor,
        description: `Payout failed reversal clearing for driver ${payout.driverProfileId}`,
      });
    }

    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action: 'PAYOUT_FAILED',
        entity: 'PAYOUT',
        entityId: payoutId,
        payload: { status: 'FAILED', reason } as any,
      },
    });

    return updatedPayout;
  }

  async getPayoutHistory(driverId: string, limit = 20, offset = 0): Promise<any> {
    const driver = await this.prisma.driverProfile.findUnique({
      where: { userId: driverId },
    });

    if (!driver) {
      throw new NotFoundException('Driver profile not found');
    }

    const [payouts, total] = await Promise.all([
      this.prisma.payout.findMany({
        where: { driverProfileId: driver.id },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.payout.count({ where: { driverProfileId: driver.id } }),
    ]);

    return {
      payouts: payouts.map((p) => ({
        id: p.id,
        amount: p.amount.toString(),
        currency: p.currency,
        status: p.status,
        requestedAt: p.requestedAt,
        approvedAt: p.approvedAt,
        rejectedAt: p.rejectedAt,
        processedAt: p.processedAt,
        failedAt: p.failedAt,
        rejectionReason: p.rejectionReason,
      })),
      total,
      limit,
      offset,
    };
  }

  async getPayoutRequests(status?: string, limit = 20, offset = 0): Promise<any> {
    const where = status ? { status: status as any } : {};

    const [payouts, total] = await Promise.all([
      this.prisma.payout.findMany({
        where,
        include: { driverProfile: { include: { user: true } } },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.payout.count({ where }),
    ]);

    return {
      payouts: payouts.map((p) => ({
        id: p.id,
        driverId: p.driverProfile.userId,
        driverName: p.driverProfile.user ? `${p.driverProfile.user.firstName || ''} ${p.driverProfile.user.lastName || ''}`.trim() : 'Unknown',
        amount: p.amount.toString(),
        currency: p.currency,
        status: p.status,
        requestedAt: p.requestedAt,
        approvedAt: p.approvedAt,
        rejectedAt: p.rejectedAt,
        rejectionReason: p.rejectionReason,
      })),
      total,
      limit,
      offset,
    };
  }

  async getPayoutAccount(driverId: string): Promise<any> {
    const driver = await this.prisma.driverProfile.findUnique({
      where: { userId: driverId },
      include: { bankAccount: true },
    });

    if (!driver) {
      throw new NotFoundException('Driver profile not found');
    }

    if (!driver.bankAccount) {
      return null;
    }

    return {
      id: driver.bankAccount.id,
      bankCode: driver.bankAccount.bankCode,
      bankName: driver.bankAccount.bankName,
      accountName: driver.bankAccount.accountName,
      accountNumberLast4: driver.bankAccount.accountNumberLast4,
      verifiedAt: driver.bankAccount.verifiedAt,
      reAuthRequiredAt: driver.bankAccount.reAuthRequiredAt,
      cooldownUntil: driver.payoutAccountCooldownUntil,
    };
  }

  async getPayoutBalance(driverId: string): Promise<string> {
    const driver = await this.prisma.driverProfile.findUnique({
      where: { userId: driverId },
    });

    if (!driver) {
      throw new NotFoundException('Driver profile not found');
    }

    const driverPayableAccount = await this.prisma.ledgerAccount.findUnique({
      where: { code: 'platform:driver_payable:NGN' },
    });

    if (!driverPayableAccount) {
      return '0.00';
    }

    return driverPayableAccount.balance.toString();
  }
}
