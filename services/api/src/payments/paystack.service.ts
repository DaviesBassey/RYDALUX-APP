import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { createHmac, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import {
  calculateShare,
  decimalToMinorUnits,
  DRIVER_EARNINGS_BPS,
  LEDGER_ACCOUNTS,
  minorUnitsToDecimal,
  PaymentsService,
  PLATFORM_COMMISSION_BPS,
} from './payments.service';
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

    if (providerEvent.status === 'DEAD_LETTER' || providerEvent.processedAt) {
      return;
    }

    await this.processProviderEvent(providerEvent.id, payload);
  }

  private async processProviderEvent(providerEventId: string, payload: PaystackWebhookPayload) {
    await this.prisma.providerEvent.update({
      where: { id: providerEventId },
      data: {
        status: 'PENDING',
        attemptCount: { increment: 1 },
        lastError: null,
        nextRetryAt: null,
        deadLetteredAt: null,
      },
    });

    try {
      const event = payload.event;
      const data = payload.data;

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

      if (!processed) {
        throw new Error(`Provider event ${event} was not processed.`);
      }

      await this.prisma.providerEvent.update({
        where: { id: providerEventId },
        data: {
          status: 'PROCESSED',
          processedAt: new Date(),
          lastError: null,
          nextRetryAt: null,
        },
      });
    } catch (error) {
      const message = (error as Error).message;
      this.logger.error(`Provider event processing failed: ${message}`);
      await this.prisma.providerEvent.update({
        where: { id: providerEventId },
        data: {
          status: 'FAILED',
          lastError: message,
          nextRetryAt: new Date(Date.now() + 5 * 60 * 1000),
        },
      });
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
    const operation = await this.prisma.financialOperation.create({
      data: {
        operationType: 'TRANSFER_INITIATION',
        status: 'PROCESSING',
        provider: 'paystack',
        providerReference: reference,
        entityType: 'PAYOUT',
        entityId: payout.id,
        requestPayload: { amount: amountKobo, recipient: payout.driverProfile.bankAccount.paystackRecipientCode, comment } as any,
        attemptCount: 1,
        lastAttemptAt: new Date(),
      },
    });

    let response;
    try {
      response = await firstValueFrom(
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
    } catch (error) {
      await this.prisma.financialOperation.update({
        where: { id: operation.id },
        data: {
          status: 'FAILED',
          errorMessage: (error as Error).message,
          nextRetryAt: new Date(Date.now() + 15 * 60 * 1000),
        },
      });
      throw error;
    }

    if (!response.data?.status || !response.data.data?.transfer_code) {
      await this.prisma.financialOperation.update({
        where: { id: operation.id },
        data: {
          status: 'FAILED',
          responsePayload: response.data as any,
          errorMessage: response.data?.message ?? 'Paystack transfer initiation failed',
          nextRetryAt: new Date(Date.now() + 15 * 60 * 1000),
        },
      });
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

      await tx.financialOperation.update({
        where: { id: operation.id },
        data: {
          status: 'SUCCEEDED',
          providerReference: response.data.data!.transfer_code,
          responsePayload: response.data as any,
          completedAt: new Date(),
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
    const refund = await this.prisma.$transaction(async (tx) => {
      const created = await tx.refund.create({
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

      await tx.financialOperation.create({
        data: {
          operationType: 'REFUND_INITIATION',
          status: initialStatus === 'PROCESSED' ? 'SUCCEEDED' : 'PROCESSING',
          provider: payment.provider,
          providerReference: reference,
          entityType: 'REFUND',
          entityId: created.id,
          requestPayload: { paymentId, reason, fullRefund: true } as any,
          attemptCount: 1,
          lastAttemptAt: new Date(),
          completedAt: initialStatus === 'PROCESSED' ? new Date() : null,
        },
      });

      return created;
    });

    if (!this.secretKey || payment.provider !== 'paystack') {
      await this.reverseFullRefundLedger(refund.id, 'mock-refund');
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
      await this.prisma.financialOperation.updateMany({
        where: { entityType: 'REFUND', entityId: refund.id, operationType: 'REFUND_INITIATION' },
        data: {
          status: 'FAILED',
          errorMessage: response.data?.message ?? 'Paystack refund initiation failed',
          nextRetryAt: new Date(Date.now() + 15 * 60 * 1000),
        },
      });
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

    await this.prisma.financialOperation.updateMany({
      where: { entityType: 'REFUND', entityId: refund.id, operationType: 'REFUND_INITIATION' },
      data: {
        status: 'SUCCEEDED',
        providerReference: updatedRefund.providerReference,
        responsePayload: response.data as any,
        completedAt: new Date(),
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

  async listProviderEvents(status?: string, limit = 20, offset = 0) {
    const where = status ? { status: status as any } : {};
    const [items, total] = await Promise.all([
      this.prisma.providerEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.providerEvent.count({ where }),
    ]);

    return { items, total, limit, offset };
  }

  async listFinancialOperations(limit = 20, offset = 0) {
    const [items, total] = await Promise.all([
      this.prisma.financialOperation.findMany({
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.financialOperation.count(),
    ]);

    return { items, total, limit, offset };
  }

  async retryProviderEvent(eventId: string, adminId: string | null) {
    const providerEvent = await this.prisma.providerEvent.findUnique({ where: { id: eventId } });
    if (!providerEvent) throw new NotFoundException('Provider event not found.');
    if (providerEvent.status === 'PROCESSED' || providerEvent.processedAt) {
      return { success: true, status: 'PROCESSED' };
    }
    if (!providerEvent.payload) {
      throw new BadRequestException('Provider event has no payload to retry.');
    }

    await this.processProviderEvent(providerEvent.id, providerEvent.payload as any);
    const refreshed = await this.prisma.providerEvent.findUnique({ where: { id: eventId } });

    await this.prisma.auditLog.create({
      data: {
        actorId: adminId,
        action: 'PROVIDER_EVENT_RETRY',
        entity: 'PROVIDER_EVENT',
        entityId: eventId,
        payload: { status: refreshed?.status, eventType: providerEvent.eventType, reference: providerEvent.reference } as any,
      },
    });

    return { success: refreshed?.status === 'PROCESSED', status: refreshed?.status };
  }

  async deadLetterProviderEvent(eventId: string, adminId: string, reason?: string) {
    const providerEvent = await this.prisma.providerEvent.findUnique({ where: { id: eventId } });
    if (!providerEvent) throw new NotFoundException('Provider event not found.');
    if (providerEvent.status === 'PROCESSED' || providerEvent.processedAt) {
      throw new BadRequestException('Processed provider events cannot be dead-lettered.');
    }

    const updated = await this.prisma.providerEvent.update({
      where: { id: eventId },
      data: {
        status: 'DEAD_LETTER',
        lastError: reason ?? providerEvent.lastError ?? 'Marked dead-letter by finance admin.',
        deadLetteredAt: new Date(),
        nextRetryAt: null,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: adminId,
        action: 'PROVIDER_EVENT_DEAD_LETTER',
        entity: 'PROVIDER_EVENT',
        entityId: eventId,
        payload: { reason, eventType: providerEvent.eventType, reference: providerEvent.reference } as any,
      },
    });

    return { success: true, providerEvent: updated };
  }

  async retryPayoutTransfer(payoutId: string, adminId: string, comment?: string) {
    const payout = await this.prisma.payout.findUnique({
      where: { id: payoutId },
      include: { driverProfile: { include: { bankAccount: true } } },
    });
    if (!payout) throw new NotFoundException('Payout not found.');
    if (payout.status !== 'FAILED') {
      throw new BadRequestException('Only failed payouts can be retried.');
    }

    const paidLedger = await this.prisma.financialTransaction.findUnique({
      where: { reference: `payout:${payout.id}:paid:wallet` },
    });
    if (paidLedger) {
      throw new BadRequestException('Payout already has paid ledger entries and cannot be retried.');
    }

    const operation = await this.prisma.financialOperation.create({
      data: {
        operationType: 'PAYOUT_RETRY',
        status: 'PROCESSING',
        provider: payout.provider,
        providerReference: payout.providerReference,
        entityType: 'PAYOUT',
        entityId: payout.id,
        requestPayload: { comment, previousTransferCode: payout.providerTransferCode } as any,
        attemptCount: 1,
        lastAttemptAt: new Date(),
      },
    });

    await this.prisma.payout.update({
      where: { id: payout.id },
      data: {
        status: 'PENDING',
        providerReference: null,
        providerTransferId: null,
        providerTransferCode: null,
        transferFailureReason: null,
        transferInitiatedAt: null,
        failedAt: null,
        notes: comment,
      },
    });

    try {
      const result = await this.initiatePayoutTransfer(payout.id, adminId, comment);
      await this.prisma.financialOperation.update({
        where: { id: operation.id },
        data: {
          status: 'SUCCEEDED',
          responsePayload: result as any,
          completedAt: new Date(),
        },
      });

      await this.prisma.auditLog.create({
        data: {
          actorId: adminId,
          action: 'PAYOUT_RETRY_INITIATED',
          entity: 'PAYOUT',
          entityId: payout.id,
          payload: { operationId: operation.id, result } as any,
        },
      });

      return result;
    } catch (error) {
      await this.prisma.payout.update({
        where: { id: payout.id },
        data: {
          status: 'FAILED',
          failedAt: new Date(),
          transferFailureReason: (error as Error).message,
        },
      });
      await this.prisma.financialOperation.update({
        where: { id: operation.id },
        data: {
          status: 'FAILED',
          errorMessage: (error as Error).message,
          nextRetryAt: new Date(Date.now() + 15 * 60 * 1000),
        },
      });
      throw error;
    }
  }

  async getReconciliationMismatches(limit = 50, offset = 0) {
    const staleCutoff = new Date(Date.now() - 30 * 60 * 1000);
    const [stalePayouts, providerEvents, refunds, paidPayoutsMissingLedger, operations] = await Promise.all([
      this.prisma.payout.findMany({
        where: { status: 'PROCESSING', transferInitiatedAt: { lt: staleCutoff } },
        orderBy: { transferInitiatedAt: 'asc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.providerEvent.findMany({
        where: { status: { in: ['PENDING', 'FAILED'] } },
        orderBy: { createdAt: 'asc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.refund.findMany({
        where: { status: 'PROCESSED', ledgerReversedAt: null },
        include: { payment: true },
        orderBy: { processedAt: 'asc' },
        take: limit,
        skip: offset,
      }),
      this.findPaidPayoutsMissingLedger(limit),
      this.prisma.financialOperation.findMany({
        where: { status: { in: ['FAILED', 'NEEDS_RECONCILIATION', 'DEAD_LETTER'] } },
        orderBy: { updatedAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          operationType: true,
          status: true,
          provider: true,
          providerReference: true,
          entityType: true,
          entityId: true,
          errorMessage: true,
          attemptCount: true,
          lastAttemptAt: true,
          nextRetryAt: true,
          completedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

    return {
      stalePayouts,
      providerEvents,
      refunds,
      paidPayoutsMissingLedger,
      operations,
      total:
        stalePayouts.length +
        providerEvents.length +
        refunds.length +
        paidPayoutsMissingLedger.length +
        operations.length,
    };
  }

  async runManualReconciliation(adminId: string | null) {
    const operation = await this.prisma.financialOperation.create({
      data: {
        operationType: 'MANUAL_RECONCILIATION',
        status: 'PROCESSING',
        provider: 'internal',
        entityType: 'RECONCILIATION',
        entityId: `manual:${Date.now()}`,
        attemptCount: 1,
        lastAttemptAt: new Date(),
      },
    });

    const actions: Array<Record<string, unknown>> = [];
    try {
      const refunds = await this.prisma.refund.findMany({
        where: { status: 'PROCESSED', ledgerReversedAt: null },
        select: { id: true },
      });

      for (const refund of refunds) {
        const result = await this.reverseFullRefundLedger(refund.id, 'manual-reconciliation');
        actions.push({ type: 'REFUND_REVERSAL', refundId: refund.id, result });
      }

      const mismatches = await this.getReconciliationMismatches();
      await this.prisma.financialOperation.update({
        where: { id: operation.id },
        data: {
          status: mismatches.total > 0 ? 'NEEDS_RECONCILIATION' : 'SUCCEEDED',
          responsePayload: { actions, mismatches } as any,
          completedAt: new Date(),
        },
      });

      await this.prisma.auditLog.create({
        data: {
          actorId: adminId,
          action: 'FINANCE_RECONCILIATION_RUN',
          entity: 'FINANCIAL_OPERATION',
          entityId: operation.id,
          payload: { actionsCount: actions.length, mismatchCount: mismatches.total } as any,
        },
      });

      return { success: true, operationId: operation.id, actions, mismatches };
    } catch (error) {
      await this.prisma.financialOperation.update({
        where: { id: operation.id },
        data: {
          status: 'FAILED',
          errorMessage: (error as Error).message,
          nextRetryAt: new Date(Date.now() + 15 * 60 * 1000),
        },
      });
      throw error;
    }
  }

  async updateDisputeAdminState(disputeId: string, adminId: string, adminStatus?: string, adminNotes?: string) {
    const dispute = await this.prisma.dispute.findUnique({ where: { id: disputeId } });
    if (!dispute) throw new NotFoundException('Dispute not found.');

    const updated = await this.prisma.dispute.update({
      where: { id: disputeId },
      data: { adminStatus, adminNotes },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: adminId,
        action: 'DISPUTE_ADMIN_UPDATED',
        entity: 'DISPUTE',
        entityId: disputeId,
        payload: { adminStatus, adminNotes } as any,
      },
    });

    return { success: true, dispute: updated };
  }

  async resolveDispute(disputeId: string, adminId: string, resolution: 'WON' | 'LOST' | 'CLOSED', notes?: string) {
    const dispute = await this.prisma.dispute.findUnique({ where: { id: disputeId } });
    if (!dispute) throw new NotFoundException('Dispute not found.');

    const updated = await this.prisma.dispute.update({
      where: { id: disputeId },
      data: {
        status: resolution,
        adminStatus: resolution,
        adminNotes: notes ?? dispute.adminNotes,
        resolvedById: adminId,
        resolvedAt: new Date(),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: adminId,
        action: 'DISPUTE_RESOLVED',
        entity: 'DISPUTE',
        entityId: disputeId,
        payload: { resolution, notes } as any,
      },
    });

    return { success: true, dispute: updated };
  }

  private async findPaidPayoutsMissingLedger(limit: number) {
    const paidPayouts = await this.prisma.payout.findMany({
      where: { status: 'PAID' },
      orderBy: { processedAt: 'desc' },
      take: limit,
    });
    const missing = [];
    for (const payout of paidPayouts) {
      const ledger = await this.prisma.financialTransaction.findUnique({
        where: { reference: `payout:${payout.id}:paid:wallet` },
      });
      if (!ledger) missing.push(payout);
    }
    return missing;
  }

  private async reverseFullRefundLedger(refundId: string, source: string) {
    return this.prisma.$transaction(async (tx) => {
      const refund = await tx.refund.findUnique({
        where: { id: refundId },
        include: { payment: true },
      });
      if (!refund) throw new NotFoundException('Refund not found.');
      if (refund.status !== 'PROCESSED') {
        return { reversed: false, reason: 'Refund is not processed.' };
      }
      if (refund.ledgerReversedAt) {
        return { reversed: true, alreadyReversed: true };
      }

      const refundMinor = decimalToMinorUnits(refund.amount);
      const paymentMinor = decimalToMinorUnits(refund.payment.amount);
      if (refundMinor !== paymentMinor) {
        await tx.financialOperation.create({
          data: {
            operationType: 'MANUAL_RECONCILIATION',
            status: 'NEEDS_RECONCILIATION',
            provider: refund.provider,
            providerReference: refund.providerReference,
            entityType: 'REFUND',
            entityId: refund.id,
            errorMessage: 'Partial refund reversal is deferred to Phase 7.7.',
            requestPayload: { refundAmount: refund.amount, paymentAmount: refund.payment.amount } as any,
          },
        });
        return { reversed: false, reason: 'Partial refund reversal deferred.' };
      }

      const driverMinor = calculateShare(paymentMinor, DRIVER_EARNINGS_BPS);
      const commissionMinor = calculateShare(paymentMinor, PLATFORM_COMMISSION_BPS);

      await this.paymentsService.recordAccountEvent(tx, {
        eventType: 'REFUND_PROCESSED',
        reference: `refund:${refund.id}:processed`,
        referenceType: 'REFUND',
        referenceId: refund.id,
        paymentId: refund.paymentId,
        tripId: refund.payment.tripId ?? undefined,
        currency: refund.currency,
        amountMinor: paymentMinor,
        account: LEDGER_ACCOUNTS.CASH_CLEARING,
        transactionType: 'DEBIT',
        description: 'Full refund processed',
        metadata: { source, providerReference: refund.providerReference },
      });

      await this.paymentsService.recordAccountEvent(tx, {
        eventType: 'REFUND_COMMISSION_REVERSED',
        reference: `refund:${refund.id}:commission-reversed`,
        referenceType: 'REFUND',
        referenceId: refund.id,
        paymentId: refund.paymentId,
        tripId: refund.payment.tripId ?? undefined,
        currency: refund.currency,
        amountMinor: commissionMinor,
        account: LEDGER_ACCOUNTS.COMMISSION_REVENUE,
        transactionType: 'DEBIT',
        description: 'Platform commission reversed after full refund',
        metadata: { source, commissionBps: PLATFORM_COMMISSION_BPS },
      });

      const driverEarning = await tx.financialTransaction.findFirst({
        where: {
          paymentId: refund.paymentId,
          eventType: 'DRIVER_EARNING_RECORDED',
          reference: { endsWith: ':driver-earning' },
        },
      });

      if (driverEarning) {
        const payoutPending = await tx.financialTransaction.findFirst({
          where: { paymentId: refund.paymentId, eventType: 'DRIVER_PAYOUT_PENDING' },
          select: { payoutId: true },
        });
        const payout = payoutPending?.payoutId
          ? await tx.payout.findUnique({ where: { id: payoutPending.payoutId }, include: { driverProfile: { select: { userId: true } } } })
          : null;

        if (payout?.status === 'PAID' || payout?.status === 'PROCESSING') {
          await tx.financialOperation.create({
            data: {
              operationType: 'MANUAL_RECONCILIATION',
              status: 'NEEDS_RECONCILIATION',
              provider: refund.provider,
              providerReference: refund.providerReference,
              entityType: 'REFUND',
              entityId: refund.id,
              errorMessage: `Driver earning reversal blocked because payout is ${payout.status}.`,
              requestPayload: { payoutId: payout.id, payoutStatus: payout.status } as any,
            },
          });
        } else if (payout?.driverProfile?.userId) {
          const wallet = await tx.wallet.findUnique({ where: { userId: payout.driverProfile.userId } });
          const balanceMinor = wallet ? decimalToMinorUnits(wallet.balance) : 0n;
          if (balanceMinor >= driverMinor) {
            await this.paymentsService.recordWalletEvent(tx, {
              eventType: 'REFUND_DRIVER_EARNING_REVERSED',
              reference: `refund:${refund.id}:driver-earning-reversed:wallet`,
              referenceType: 'REFUND',
              referenceId: refund.id,
              paymentId: refund.paymentId,
              payoutId: payout.id,
              tripId: refund.payment.tripId ?? undefined,
              userId: payout.driverProfile.userId,
              currency: refund.currency,
              amountMinor: driverMinor,
              transactionType: 'DEBIT',
              description: 'Driver earning reversed after full refund',
              metadata: { source, payoutStatus: payout.status },
            });

            await this.paymentsService.recordAccountEvent(tx, {
              eventType: 'REFUND_DRIVER_EARNING_REVERSED',
              reference: `refund:${refund.id}:driver-earning-reversed:driver-payable`,
              referenceType: 'REFUND',
              referenceId: refund.id,
              paymentId: refund.paymentId,
              payoutId: payout.id,
              tripId: refund.payment.tripId ?? undefined,
              currency: refund.currency,
              amountMinor: driverMinor,
              account: LEDGER_ACCOUNTS.DRIVER_PAYABLE,
              transactionType: 'DEBIT',
              description: 'Driver payable reversed after full refund',
              metadata: { source, payoutStatus: payout.status },
            });

            if (payout.status === 'PENDING' || payout.status === 'FAILED') {
              await tx.payout.update({
                where: { id: payout.id },
                data: { status: 'CANCELLED', notes: 'Cancelled after full payment refund.' },
              });
            }
          } else {
            await tx.financialOperation.create({
              data: {
                operationType: 'MANUAL_RECONCILIATION',
                status: 'NEEDS_RECONCILIATION',
                provider: refund.provider,
                providerReference: refund.providerReference,
                entityType: 'REFUND',
                entityId: refund.id,
                errorMessage: 'Driver wallet has insufficient balance for safe earning reversal.',
                requestPayload: { driverUserId: payout.driverProfile.userId, driverEarning: minorUnitsToDecimal(driverMinor) } as any,
              },
            });
          }
        }
      }

      await tx.refund.update({
        where: { id: refund.id },
        data: { ledgerReversedAt: new Date() },
      });
      await tx.payment.update({ where: { id: refund.paymentId }, data: { status: 'REFUNDED' } });

      await tx.auditLog.create({
        data: {
          actorId: refund.requestedById,
          action: 'REFUND_LEDGER_REVERSED',
          entity: 'REFUND',
          entityId: refund.id,
          payload: { source, paymentId: refund.paymentId } as any,
        },
      });

      return { reversed: true };
    });
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

    if (status === 'PROCESSED') {
      await this.reverseFullRefundLedger(refund.id, 'paystack-refund-webhook');
    }

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
