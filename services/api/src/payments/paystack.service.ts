import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { createHmac, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService, decimalToMinorUnits, LEDGER_ACCOUNTS, minorUnitsToDecimal } from './payments.service';
import { IdempotencyService } from '../idempotency/idempotency.service';
import { SaveDriverBankAccountDto } from './dto/save-driver-bank-account.dto';

interface PaystackInitializeResponse {
  status: boolean;
  message: string;
  data?: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

interface PaystackVerificationData {
  id: number;
  status: string;
  reference: string;
  amount: number;
  channel: string;
  currency: string;
  metadata: Record<string, unknown>;
  gateway_response: string;
  authorization: {
    authorization_code: string;
    card_type: string;
    last4: string;
    bank: string;
  } | null;
}

interface PaystackVerificationResponse {
  status: boolean;
  message: string;
  data?: PaystackVerificationData;
}

interface PaystackRecipientResponse {
  status: boolean;
  message: string;
  data?: {
    recipient_code: string;
    id?: number;
    details?: Record<string, unknown>;
  };
}

interface PaystackTransferResponse {
  status: boolean;
  message: string;
  data?: {
    id?: number;
    transfer_code: string;
    reference: string;
    status: string;
  };
}

interface PaystackRefundResponse {
  status: boolean;
  message: string;
  data?: {
    id?: number;
    reference?: string;
    status?: string;
  };
}

interface PaystackWebhookPayload {
  event: string;
  data: {
    id?: number;
    reference?: string;
    transfer_code?: string;
    status: string;
    amount: number;
    channel?: string;
    currency?: string;
    gateway_response?: string;
    reason?: string;
    transaction_reference?: string;
    refund_reference?: string;
    dispute?: number | string;
    category?: string;
    message?: string;
    metadata?: Record<string, unknown>;
    authorization?: {
      authorization_code: string;
      card_type: string;
      last4: string;
      bank: string;
    } | null;
  };
}

@Injectable()
export class PaystackService {
  private readonly logger = new Logger(PaystackService.name);
  private readonly baseUrl = 'https://api.paystack.co';

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly paymentsService: PaymentsService,
    private readonly idempotencyService: IdempotencyService,
    private readonly prisma: PrismaService,
  ) {}

  private get secretKey(): string {
    return this.configService.get<string>('paystackSecretKey') ?? '';
  }

  private get webhookSecret(): string {
    return this.configService.get<string>('paystackWebhookSecret') ?? '';
  }

  async initiatePaystackPayment(userId: string, tripId: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        riderProfile: { select: { userId: true } },
        fareQuote: { select: { totalFare: true } },
        payment: true,
      },
    });

    if (!trip) throw new NotFoundException('Trip not found.');
    if (!trip.riderProfile || trip.riderProfile.userId !== userId) throw new ForbiddenException('Access denied.');
    if (!trip.fareQuote) throw new BadRequestException('No fare quote for this trip.');
    if (trip.payment) {
      return {
        payment: this.formatPaymentResponse(trip.payment),
        authorizationUrl: null,
        accessCode: null,
      };
    }

    const reference = `RYD-PAY-${Date.now().toString(36).toUpperCase()}`;

    const payment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.payment.create({
        data: {
          userId,
          tripId,
          amount: trip.fareQuote!.totalFare,
          currency: 'NGN',
          provider: 'paystack',
          status: 'PENDING',
          reference,
        },
      });

      await this.paymentsService.recordAccountEvent(tx, {
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
          payload: { tripId, reference: created.reference, provider: 'paystack' } as any,
        },
      });

      return created;
    });

    if (!this.secretKey) {
      this.logger.warn('Paystack secret key not configured; returning payment without authorization URL');
      return {
        payment: this.formatPaymentResponse(payment),
        authorizationUrl: null,
        accessCode: null,
      };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (!user?.email) {
      throw new BadRequestException('Rider email is required to initialize Paystack payment.');
    }

    const amountKobo = Number(decimalToMinorUnits(trip.fareQuote.totalFare));
    const callbackUrl = this.configService.get<string>('paystackCallbackUrl') || undefined;

    try {
      const response = await firstValueFrom(
        this.httpService.post<PaystackInitializeResponse>(
          `${this.baseUrl}/transaction/initialize`,
          {
            email: user.email,
            amount: amountKobo,
            reference: payment.reference,
            callback_url: callbackUrl,
            metadata: { tripId, userId, reference: payment.reference },
          },
          {
            headers: { Authorization: `Bearer ${this.secretKey}` },
          },
        ),
      );

      if (!response.data?.status || !response.data.data?.authorization_url) {
        throw new BadRequestException('Paystack initialization failed: ' + (response.data?.message ?? 'Unknown error'));
      }

      return {
        payment: this.formatPaymentResponse(payment),
        authorizationUrl: response.data.data.authorization_url,
        accessCode: response.data.data.access_code,
      };
    } catch (error) {
      this.logger.error(`Paystack initialize failed for ${payment.reference}: ${(error as Error).message}`);
      throw new BadRequestException('Paystack initialization failed.');
    }
  }

  async verifyTransaction(reference: string): Promise<PaystackVerificationResponse> {
    if (!this.secretKey) {
      throw new Error('Paystack secret key not configured');
    }

    const response = await firstValueFrom(
      this.httpService.get<PaystackVerificationResponse>(
        `${this.baseUrl}/transaction/verify/${encodeURIComponent(reference)}`,
        {
          headers: { Authorization: `Bearer ${this.secretKey}` },
        },
      ),
    );

    return response.data;
  }

  verifyWebhookSignature(body: string | Buffer, signature: string): boolean {
    if (!this.webhookSecret) {
      this.logger.warn('Paystack webhook secret not configured; rejecting webhook');
      return false;
    }
    const hash = createHmac('sha512', this.webhookSecret).update(body).digest('hex');
    try {
      return timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
    } catch {
      return false;
    }
  }

  async handleWebhookEvent(payload: PaystackWebhookPayload) {
    const event = payload.event;
    const data = payload.data;

    const reference = data.reference ?? data.transfer_code ?? data.refund_reference ?? data.transaction_reference ?? null;
    const providerEventId = `${event}:${data.id?.toString() ?? reference ?? this.idempotencyService.hashProviderPayload(payload)}`;

    const providerEvent = await this.idempotencyService.recordProviderEvent({
      provider: 'paystack',
      eventType: event,
      providerEventId,
      reference,
      payload,
    });

    if (providerEvent.processedAt) {
      return;
    }

    let processed = true;
    if (event === 'charge.success') {
      processed = await this.handleChargeSuccess(data);
    } else if (event === 'charge.failed') {
      processed = await this.handleChargeFailed(data);
    } else if (event === 'transfer.success') {
      processed = await this.handleTransferSuccess(data);
    } else if (event === 'transfer.failed') {
      processed = await this.handleTransferFailed(data);
    } else if (event === 'refund.pending' || event === 'refund.processed' || event === 'refund.failed') {
      processed = await this.handleRefundEvent(event, data);
    } else if (event.startsWith('charge.dispute.')) {
      processed = await this.handleDisputeEvent(event, data);
    } else {
      this.logger.log(`Unhandled Paystack event: ${event}`);
    }

    if (processed) {
      await this.prisma.providerEvent.update({ where: { id: providerEvent.id }, data: { processedAt: new Date() } });
    }
  }

  private async handleChargeSuccess(data: PaystackWebhookPayload['data']): Promise<boolean> {
    if (!data.reference) return false;
    let verification: PaystackVerificationResponse;
    try {
      verification = await this.verifyTransaction(data.reference);
    } catch (err: any) {
      this.logger.error(`Failed to verify Paystack transaction ${data.reference}: ${err.message}`);
      return false;
    }

    if (!verification.status || verification.data?.status !== 'success') {
      this.logger.warn(`Paystack verification failed for ${data.reference}`);
      return false;
    }

    const payment = await this.prisma.payment.findUnique({ where: { reference: data.reference } });
    if (!payment) {
      this.logger.warn(`Payment not found for Paystack reference ${data.reference}`);
      return true;
    }
    if (payment.status === 'CAPTURED' || payment.status === 'FAILED' || payment.status === 'REFUNDED') {
      return true;
    }

    const paystackData = verification.data!;
    const existingMeta =
      typeof payment.gatewayMeta === 'object' && payment.gatewayMeta !== null
        ? (payment.gatewayMeta as Record<string, unknown>)
        : {};

    const updatedGatewayMeta = {
      ...existingMeta,
      paystackTransactionId: paystackData.id,
      paystackAuthorizationCode: paystackData.authorization?.authorization_code,
      paystackChannel: paystackData.channel,
      paystackCardType: paystackData.authorization?.card_type,
      paystackLast4: paystackData.authorization?.last4,
      paystackBank: paystackData.authorization?.bank,
      paystackVerifiedAt: new Date().toISOString(),
    };

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        externalId: paystackData.id.toString(),
        gatewayMeta: updatedGatewayMeta as any,
        status: payment.status === 'PENDING' ? 'AUTHORIZED' : payment.status,
      },
    });

    const trip = await this.prisma.trip.findUnique({ where: { id: payment.tripId ?? undefined } });
    if (trip?.status === 'COMPLETED') {
      await this.paymentsService.capturePaymentForTrip(trip.id, trip.driverProfileId);
    }

    return true;
  }

  private async handleChargeFailed(data: PaystackWebhookPayload['data']): Promise<boolean> {
    if (!data.reference) return false;
    const payment = await this.prisma.payment.findUnique({ where: { reference: data.reference } });
    if (!payment) {
      this.logger.warn(`Payment not found for Paystack reference ${data.reference}`);
      return true;
    }
    if (payment.status === 'CAPTURED' || payment.status === 'FAILED' || payment.status === 'REFUNDED') {
      return true;
    }

    const existingMeta =
      typeof payment.gatewayMeta === 'object' && payment.gatewayMeta !== null
        ? (payment.gatewayMeta as Record<string, unknown>)
        : {};

    const updatedGatewayMeta = {
      ...existingMeta,
      paystackFailureMessage: data.gateway_response,
      paystackFailedAt: new Date().toISOString(),
    };

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'FAILED',
        gatewayMeta: updatedGatewayMeta as any,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: null,
        action: 'PAYMENT_FAILED',
        entity: 'PAYMENT',
        entityId: payment.id,
        payload: { reference: data.reference, reason: data.gateway_response, provider: 'paystack' } as any,
      },
    });

    return true;
  }

  async saveDriverBankAccount(userId: string, payload: SaveDriverBankAccountDto) {
    const driverProfile = await this.prisma.driverProfile.findUnique({ where: { userId } });
    if (!driverProfile) throw new NotFoundException('Driver profile not found.');

    const accountNumberLast4 = payload.accountNumber.slice(-4);
    const recipientCode = this.secretKey
      ? await this.createTransferRecipient(payload)
      : `mock-recipient-${driverProfile.id}`;

    const bankAccount = await this.prisma.driverBankAccount.upsert({
      where: { driverProfileId: driverProfile.id },
      update: {
        bankCode: payload.bankCode,
        bankName: payload.bankName,
        accountName: payload.accountName,
        accountNumberLast4,
        currency: 'NGN',
        provider: this.secretKey ? 'paystack' : 'mock-paystack',
        paystackRecipientCode: recipientCode,
        recipientCreatedAt: new Date(),
        deletedAt: null,
        metadata: { recipientProvider: this.secretKey ? 'paystack' : 'mock-paystack' } as any,
      },
      create: {
        driverProfileId: driverProfile.id,
        bankCode: payload.bankCode,
        bankName: payload.bankName,
        accountName: payload.accountName,
        accountNumberLast4,
        currency: 'NGN',
        provider: this.secretKey ? 'paystack' : 'mock-paystack',
        paystackRecipientCode: recipientCode,
        recipientCreatedAt: new Date(),
        metadata: { recipientProvider: this.secretKey ? 'paystack' : 'mock-paystack' } as any,
      },
    });

    return { bankAccount: this.formatBankAccount(bankAccount) };
  }

  async getDriverBankAccount(userId: string) {
    const driverProfile = await this.prisma.driverProfile.findUnique({
      where: { userId },
      include: { bankAccount: true },
    });
    if (!driverProfile) throw new NotFoundException('Driver profile not found.');

    return { bankAccount: driverProfile.bankAccount ? this.formatBankAccount(driverProfile.bankAccount) : null };
  }

  async initiatePayoutTransfer(payoutId: string, approverId: string, comment?: string) {
    const payout = await this.prisma.payout.findUnique({
      where: { id: payoutId },
      include: {
        driverProfile: {
          include: { bankAccount: true },
        },
      },
    });
    if (!payout) throw new NotFoundException('Payout not found.');
    if (payout.status === 'PAID') return { success: true, status: 'PAID' };
    if (payout.status === 'FAILED') throw new BadRequestException('Payout has failed and cannot be approved.');

    if (!this.secretKey || payout.provider !== 'paystack') {
      return this.markMockPayoutPaid(payoutId, approverId, comment);
    }

    if (!payout.driverProfile.bankAccount?.paystackRecipientCode) {
      throw new BadRequestException('Driver bank account is required before payout approval.');
    }

    if (payout.status === 'PROCESSING' && payout.providerTransferCode) {
      return { success: true, status: 'PROCESSING', transferCode: payout.providerTransferCode };
    }

    const reference = `RYD-TRF-${payout.id}`;
    const amountKobo = Number(decimalToMinorUnits(payout.amount));

    const response = await firstValueFrom(
      this.httpService.post<PaystackTransferResponse>(
        `${this.baseUrl}/transfer`,
        {
          source: 'balance',
          amount: amountKobo,
          recipient: payout.driverProfile.bankAccount.paystackRecipientCode,
          reason: comment ?? `RYDALUX driver payout ${payout.id}`,
          reference,
        },
        { headers: { Authorization: `Bearer ${this.secretKey}` } },
      ),
    );

    if (!response.data?.status || !response.data.data?.transfer_code) {
      throw new BadRequestException('Paystack transfer initiation failed: ' + (response.data?.message ?? 'Unknown error'));
    }

    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.payout.updateMany({
        where: { id: payout.id, status: 'PENDING' },
        data: {
          status: 'PROCESSING',
          providerReference: reference,
          providerTransferId: response.data.data?.id?.toString(),
          providerTransferCode: response.data.data!.transfer_code,
          transferInitiatedAt: new Date(),
          notes: comment,
        },
      });
      if (updated.count !== 1) return;

      await tx.auditLog.create({
        data: {
          actorId: approverId,
          action: 'PAYOUT_TRANSFER_INITIATED',
          entity: 'PAYOUT',
          entityId: payout.id,
          payload: { provider: 'paystack', reference, transferCode: response.data.data!.transfer_code } as any,
        },
      });
    });

    return { success: true, status: 'PROCESSING', transferCode: response.data.data.transfer_code };
  }

  async requestRefund(adminId: string, paymentId: string, reason?: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Payment not found.');
    if (payment.status !== 'CAPTURED') throw new BadRequestException('Only captured payments can be refunded.');

    const existingRefund = await this.prisma.refund.findFirst({
      where: { paymentId, status: { in: ['PENDING', 'PROCESSING', 'PROCESSED'] } },
    });
    if (existingRefund) return { refund: existingRefund };

    const reference = `RYD-RFD-${payment.id}`;
    const initialStatus = this.secretKey && payment.provider === 'paystack' ? 'PROCESSING' : 'PROCESSED';
    const refund = await this.prisma.refund.create({
      data: {
        paymentId,
        amount: payment.amount,
        currency: payment.currency,
        status: initialStatus,
        provider: payment.provider,
        providerReference: reference,
        reason,
        requestedById: adminId,
        metadata: { fullRefund: true } as any,
        processedAt: initialStatus === 'PROCESSED' ? new Date() : null,
      },
    });

    if (!this.secretKey || payment.provider !== 'paystack') {
      await this.prisma.payment.update({ where: { id: payment.id }, data: { status: 'REFUNDED' } });
      return { refund };
    }

    const response = await firstValueFrom(
      this.httpService.post<PaystackRefundResponse>(
        `${this.baseUrl}/refund`,
        {
          transaction: payment.externalId ?? payment.reference,
          amount: Number(decimalToMinorUnits(payment.amount)),
          currency: payment.currency,
          customer_note: reason,
          merchant_note: reason ?? `RYDALUX refund ${payment.id}`,
        },
        { headers: { Authorization: `Bearer ${this.secretKey}` } },
      ),
    );

    if (!response.data?.status) {
      await this.prisma.refund.update({ where: { id: refund.id }, data: { status: 'FAILED', failedAt: new Date() } });
      throw new BadRequestException('Paystack refund initiation failed: ' + (response.data?.message ?? 'Unknown error'));
    }

    const updatedRefund = await this.prisma.refund.update({
      where: { id: refund.id },
      data: {
        providerRefundId: response.data.data?.id?.toString(),
        providerReference: response.data.data?.reference ?? reference,
        metadata: { fullRefund: true, paystackStatus: response.data.data?.status } as any,
      },
    });

    return { refund: updatedRefund };
  }

  async listRefunds(limit = 20, offset = 0) {
    const [items, total] = await Promise.all([
      this.prisma.refund.findMany({
        include: { payment: { select: { id: true, reference: true, status: true, provider: true } } },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.refund.count(),
    ]);
    return { items, total, limit, offset };
  }

  async listDisputes(limit = 20, offset = 0) {
    const [items, total] = await Promise.all([
      this.prisma.dispute.findMany({
        include: { payment: { select: { id: true, reference: true, status: true, provider: true } } },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.dispute.count(),
    ]);
    return { items, total, limit, offset };
  }

  private async createTransferRecipient(payload: SaveDriverBankAccountDto) {
    const response = await firstValueFrom(
      this.httpService.post<PaystackRecipientResponse>(
        `${this.baseUrl}/transferrecipient`,
        {
          type: 'nuban',
          name: payload.accountName,
          account_number: payload.accountNumber,
          bank_code: payload.bankCode,
          currency: 'NGN',
        },
        { headers: { Authorization: `Bearer ${this.secretKey}` } },
      ),
    );

    if (!response.data?.status || !response.data.data?.recipient_code) {
      throw new BadRequestException('Paystack transfer recipient creation failed: ' + (response.data?.message ?? 'Unknown error'));
    }

    return response.data.data.recipient_code;
  }

  private async markMockPayoutPaid(payoutId: string, approverId: string, comment?: string) {
    await this.prisma.$transaction(async (tx) => {
      const payout = await tx.payout.findUnique({
        where: { id: payoutId },
        include: { driverProfile: { select: { userId: true } } },
      });
      if (!payout || payout.status === 'PAID') return;
      if (payout.status === 'FAILED') throw new BadRequestException('Payout has failed and cannot be approved.');

      const paid = await tx.payout.updateMany({
        where: { id: payoutId, status: { in: ['PENDING', 'PROCESSING'] } },
        data: {
          status: 'PAID',
          processedAt: new Date(),
          notes: comment,
        },
      });
      if (paid.count !== 1) return;

      await this.recordPayoutPaidLedger(tx, payout, approverId, 'mock-payout-approval');
    });

    return { success: true, status: 'PAID' };
  }

  private async handleTransferSuccess(data: PaystackWebhookPayload['data']): Promise<boolean> {
    const transferCode = data.transfer_code;
    if (!transferCode) return false;

    await this.prisma.$transaction(async (tx) => {
      const payout = await tx.payout.findUnique({
        where: { providerTransferCode: transferCode },
        include: { driverProfile: { select: { userId: true } } },
      });
      if (!payout || payout.status === 'PAID') return;

      const paid = await tx.payout.updateMany({
        where: { id: payout.id, status: 'PROCESSING' },
        data: { status: 'PAID', processedAt: new Date(), transferFailureReason: null },
      });
      if (paid.count !== 1) return;

      await this.recordPayoutPaidLedger(tx, payout, null, 'paystack-transfer-success');
    });

    return true;
  }

  private async handleTransferFailed(data: PaystackWebhookPayload['data']): Promise<boolean> {
    const transferCode = data.transfer_code;
    if (!transferCode) return false;

    await this.prisma.$transaction(async (tx) => {
      const payout = await tx.payout.findUnique({ where: { providerTransferCode: transferCode } });
      if (!payout || payout.status === 'PAID') return;

      await tx.payout.updateMany({
        where: { id: payout.id, status: 'PROCESSING' },
        data: {
          status: 'FAILED',
          failedAt: new Date(),
          transferFailureReason: data.reason ?? data.gateway_response ?? data.message ?? 'Paystack transfer failed',
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: null,
          action: 'PAYOUT_TRANSFER_FAILED',
          entity: 'PAYOUT',
          entityId: payout.id,
          payload: { provider: 'paystack', transferCode, reason: data.reason ?? data.gateway_response ?? data.message } as any,
        },
      });
    });

    return true;
  }

  private async handleRefundEvent(event: string, data: PaystackWebhookPayload['data']): Promise<boolean> {
    const reference = data.refund_reference ?? data.reference;
    if (!reference) return false;

    const status = event === 'refund.processed' ? 'PROCESSED' : event === 'refund.failed' ? 'FAILED' : 'PROCESSING';
    const refund = await this.prisma.refund.findFirst({ where: { providerReference: reference } });
    if (!refund) return true;

    await this.prisma.$transaction(async (tx) => {
      await tx.refund.update({
        where: { id: refund.id },
        data: {
          status,
          processedAt: status === 'PROCESSED' ? new Date() : refund.processedAt,
          failedAt: status === 'FAILED' ? new Date() : refund.failedAt,
          metadata: { event, paystackStatus: data.status, reason: data.reason ?? data.message } as any,
        },
      });

      if (status === 'PROCESSED') {
        await tx.payment.update({ where: { id: refund.paymentId }, data: { status: 'REFUNDED' } });
      }
    });

    return true;
  }

  private async handleDisputeEvent(event: string, data: PaystackWebhookPayload['data']): Promise<boolean> {
    const providerDisputeId = data.dispute?.toString() ?? data.id?.toString();
    if (!providerDisputeId) return false;

    const reference = data.transaction_reference ?? data.reference ?? null;
    const payment = reference ? await this.prisma.payment.findUnique({ where: { reference } }) : null;
    const status = this.mapDisputeStatus(event, data.status);

    await this.prisma.dispute.upsert({
      where: { provider_providerDisputeId: { provider: 'paystack', providerDisputeId } },
      update: {
        paymentId: payment?.id,
        reference,
        status,
        category: data.category,
        reason: data.reason ?? data.message,
        amount: data.amount ? minorUnitsToDecimal(BigInt(data.amount)) : undefined,
        currency: data.currency ?? 'NGN',
        metadata: { event, payloadStatus: data.status, metadata: data.metadata } as any,
        resolvedAt: status === 'WON' || status === 'LOST' || status === 'CLOSED' ? new Date() : null,
      },
      create: {
        paymentId: payment?.id,
        provider: 'paystack',
        providerDisputeId,
        reference,
        status,
        category: data.category,
        reason: data.reason ?? data.message,
        amount: data.amount ? minorUnitsToDecimal(BigInt(data.amount)) : undefined,
        currency: data.currency ?? 'NGN',
        metadata: { event, payloadStatus: data.status, metadata: data.metadata } as any,
        resolvedAt: status === 'WON' || status === 'LOST' || status === 'CLOSED' ? new Date() : null,
      },
    });

    return true;
  }

  private mapDisputeStatus(event: string, status?: string): 'OPEN' | 'AWAITING_RESPONSE' | 'UNDER_REVIEW' | 'WON' | 'LOST' | 'CLOSED' {
    const normalized = status?.toLowerCase();
    if (normalized === 'won') return 'WON';
    if (normalized === 'lost') return 'LOST';
    if (normalized === 'resolved') return 'CLOSED';
    if (event === 'charge.dispute.resolve') return 'CLOSED';
    if (event === 'charge.dispute.remind') return 'AWAITING_RESPONSE';
    return 'OPEN';
  }

  private async recordPayoutPaidLedger(tx: any, payout: any, approverId: string | null, source: string) {
    const amountMinor = decimalToMinorUnits(payout.amount);

    await this.paymentsService.recordWalletEvent(tx, {
      eventType: 'DRIVER_PAYOUT_PAID',
      reference: `payout:${payout.id}:paid:wallet`,
      referenceType: 'PAYOUT',
      referenceId: payout.id,
      payoutId: payout.id,
      userId: payout.driverProfile.userId,
      currency: payout.currency,
      amountMinor,
      transactionType: 'DEBIT',
      description: 'Driver payout paid',
      metadata: { approverId, source },
    });

    await this.paymentsService.recordAccountEvent(tx, {
      eventType: 'DRIVER_PAYOUT_PAID',
      reference: `payout:${payout.id}:paid:driver-payable`,
      referenceType: 'PAYOUT',
      referenceId: payout.id,
      payoutId: payout.id,
      currency: payout.currency,
      amountMinor,
      account: LEDGER_ACCOUNTS.DRIVER_PAYABLE,
      transactionType: 'DEBIT',
      description: 'Driver payable reduced after payout',
      metadata: { approverId, source },
    });

    await this.paymentsService.recordAccountEvent(tx, {
      eventType: 'DRIVER_PAYOUT_PAID',
      reference: `payout:${payout.id}:paid:clearing`,
      referenceType: 'PAYOUT',
      referenceId: payout.id,
      payoutId: payout.id,
      currency: payout.currency,
      amountMinor,
      account: LEDGER_ACCOUNTS.PAYOUT_CLEARING,
      transactionType: 'CREDIT',
      description: 'Payout clearing recorded as paid',
      metadata: { approverId, source },
    });

    await tx.auditLog.create({
      data: {
        actorId: approverId,
        action: 'PAYOUT_PAID',
        entity: 'PAYOUT',
        entityId: payout.id,
        payload: { source, eventType: 'DRIVER_PAYOUT_PAID' } as any,
      },
    });
  }

  private formatBankAccount(bankAccount: any) {
    return {
      id: bankAccount.id,
      bankCode: bankAccount.bankCode,
      bankName: bankAccount.bankName,
      accountName: bankAccount.accountName,
      accountNumberLast4: bankAccount.accountNumberLast4,
      currency: bankAccount.currency,
      provider: bankAccount.provider,
      hasRecipient: Boolean(bankAccount.paystackRecipientCode),
      recipientCreatedAt: bankAccount.recipientCreatedAt,
      updatedAt: bankAccount.updatedAt,
    };
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
}
