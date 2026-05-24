import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { createHmac, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService, decimalToMinorUnits, LEDGER_ACCOUNTS } from './payments.service';
import { IdempotencyService } from '../idempotency/idempotency.service';

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

interface PaystackWebhookPayload {
  event: string;
  data: {
    id?: number;
    reference: string;
    status: string;
    amount: number;
    channel?: string;
    currency?: string;
    gateway_response?: string;
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

    const amountKobo = Math.round(Number(trip.fareQuote.totalFare) * 100);
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

    const providerEventId = data.id?.toString() ?? `${event}-${data.reference}-${Date.now()}`;

    await this.idempotencyService.recordProviderEvent({
      provider: 'paystack',
      eventType: event,
      providerEventId,
      reference: data.reference,
      payload,
    });

    if (event === 'charge.success') {
      await this.handleChargeSuccess(data);
    } else if (event === 'charge.failed') {
      await this.handleChargeFailed(data);
    } else {
      this.logger.log(`Unhandled Paystack event: ${event}`);
    }
  }

  private async handleChargeSuccess(data: PaystackWebhookPayload['data']) {
    let verification: PaystackVerificationResponse;
    try {
      verification = await this.verifyTransaction(data.reference);
    } catch (err: any) {
      this.logger.error(`Failed to verify Paystack transaction ${data.reference}: ${err.message}`);
      return;
    }

    if (!verification.status || verification.data?.status !== 'success') {
      this.logger.warn(`Paystack verification failed for ${data.reference}`);
      return;
    }

    const payment = await this.prisma.payment.findUnique({ where: { reference: data.reference } });
    if (!payment) {
      this.logger.warn(`Payment not found for Paystack reference ${data.reference}`);
      return;
    }
    if (payment.status === 'CAPTURED' || payment.status === 'FAILED' || payment.status === 'REFUNDED') {
      return;
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
  }

  private async handleChargeFailed(data: PaystackWebhookPayload['data']) {
    const payment = await this.prisma.payment.findUnique({ where: { reference: data.reference } });
    if (!payment) {
      this.logger.warn(`Payment not found for Paystack reference ${data.reference}`);
      return;
    }
    if (payment.status === 'CAPTURED' || payment.status === 'FAILED' || payment.status === 'REFUNDED') {
      return;
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
