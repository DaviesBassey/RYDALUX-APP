import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { createHmac } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService, decimalToMinorUnits, LEDGER_ACCOUNTS } from './payments.service';
import { IPaymentProvider, PaymentVerificationResponse } from './payment-provider.interface';

interface FlutterwaveInitializeResponse {
  status: string;
  message: string;
  data?: {
    link: string;
    secure_link: string;
  };
}

interface FlutterwaveVerificationResponse {
  status: string;
  message: string;
  data?: {
    id: number;
    tx_ref: string;
    status: string;
    amount: number;
    currency: string;
    payment_type: string;
    meta?: {
      tripId?: string;
      userId?: string;
    };
  };
}

@Injectable()
export class FlutterwaveService implements IPaymentProvider {
  private readonly logger = new Logger(FlutterwaveService.name);
  private readonly baseUrl = 'https://api.flutterwave.com/v3';

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly paymentsService: PaymentsService,
    private readonly prisma: PrismaService,
  ) {}

  private get secretKey(): string {
    return this.configService.get<string>('flutterwaveSecretKey') ?? '';
  }

  private get webhookSecret(): string {
    return this.configService.get<string>('flutterwaveWebhookSecret') ?? '';
  }

  async initiatePayment(userId: string, tripId: string) {
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
      };
    }

    const reference = `RYD-FLW-${Date.now().toString(36).toUpperCase()}`;

    const payment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.payment.create({
        data: {
          userId,
          tripId,
          amount: trip.fareQuote!.totalFare,
          currency: 'NGN',
          provider: 'flutterwave',
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
          payload: { tripId, reference: created.reference, provider: 'flutterwave' } as any,
        },
      });

      return created;
    });

    if (!this.secretKey) {
      this.logger.warn('Flutterwave secret key not configured; returning payment without authorization URL');
      return {
        payment: this.formatPaymentResponse(payment),
        authorizationUrl: null,
      };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, displayName: true, phone: true },
    });
    if (!user?.email) {
      throw new BadRequestException('Rider email is required to initialize Flutterwave payment.');
    }

    const amountInKobo = Number(decimalToMinorUnits(trip.fareQuote.totalFare));
    const callbackUrl = this.configService.get<string>('flutterwaveCallbackUrl') || undefined;

    try {
      const response = await firstValueFrom(
        this.httpService.post<FlutterwaveInitializeResponse>(
          `${this.baseUrl}/payments`,
          {
            tx_ref: payment.reference,
            amount: amountInKobo / 100,
            currency: 'NGN',
            payment_options: 'card, banktransfer, ussd, paysub',
            customer: {
              email: user.email,
              name: user.displayName || 'Rider',
              phonenumber: user.phone,
            },
            meta: {
              tripId,
              userId,
              reference: payment.reference,
            },
            redirect_url: callbackUrl,
          },
          {
            headers: { Authorization: `Bearer ${this.secretKey}` },
          },
        ),
      );

      if (response.data?.status !== 'success' || !response.data.data?.link) {
        throw new BadRequestException('Flutterwave initialization failed: ' + (response.data?.message ?? 'Unknown error'));
      }

      return {
        payment: this.formatPaymentResponse(payment),
        authorizationUrl: response.data.data.link,
      };
    } catch (error) {
      this.logger.error(`Flutterwave initialize failed for ${payment.reference}: ${(error as Error).message}`);
      throw new BadRequestException('Flutterwave initialization failed.');
    }
  }

  async verifyTransaction(reference: string): Promise<PaymentVerificationResponse> {
    if (!this.secretKey) {
      throw new Error('Flutterwave secret key not configured');
    }

    const response = await firstValueFrom(
      this.httpService.get<FlutterwaveVerificationResponse>(
        `${this.baseUrl}/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`,
        {
          headers: { Authorization: `Bearer ${this.secretKey}` },
        },
      ),
    );

    const data = response.data.data;
    if (!data) {
      throw new Error('No transaction data in Flutterwave response');
    }

    return {
      id: data.id?.toString() || '',
      status: data.status || 'unknown',
      reference: data.tx_ref || reference,
      amount: data.amount || 0,
      channel: data.payment_type || 'unknown',
      currency: data.currency || 'NGN',
      gatewayResponse: '',
    };
  }

  verifyWebhookSignature(body: string | Buffer, signature: string): boolean {
    if (!this.webhookSecret) {
      this.logger.warn('Flutterwave webhook secret not configured; rejecting webhook');
      return false;
    }
    const hash = createHmac('sha256', this.webhookSecret).update(body).digest('hex');
    return hash === signature;
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
