import { Body, Controller, Headers, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RiderOnlyGuard } from '../auth/rider-only.guard';
import { PaystackService } from './paystack.service';
import { IdempotencyService } from '../idempotency/idempotency.service';
import { InitiatePaystackPaymentDto } from './dto/initiate-paystack-payment.dto';

@Controller()
export class PaystackController {
  constructor(
    private readonly paystackService: PaystackService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  @Post('payments/paystack/initiate')
  @UseGuards(JwtAuthGuard, RiderOnlyGuard)
  initiatePaystackPayment(
    @Req() req: any,
    @Body() body: InitiatePaystackPaymentDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.idempotencyService.run(
      {
        key: idempotencyKey,
        scope: 'payments:paystack:initiate',
        method: req.method,
        endpoint: req.route?.path ?? '/payments/paystack/initiate',
        actorId: req.user.userId,
        body,
      },
      () => this.paystackService.initiatePaystackPayment(req.user.userId, body.tripId),
    );
  }

  @Post('webhooks/paystack')
  @SkipThrottle()
  @HttpCode(200)
  async handlePaystackWebhook(
    @Headers('x-paystack-signature') signature: string,
    @Req() req: any,
  ) {
    const rawBody = req.rawBody as Buffer | undefined;
    if (!rawBody) {
      return { received: false };
    }
    const isValid = this.paystackService.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      return { received: false };
    }
    const payload = JSON.parse(rawBody.toString());
    await this.paystackService.handleWebhookEvent(payload);
    return { received: true };
  }
}
