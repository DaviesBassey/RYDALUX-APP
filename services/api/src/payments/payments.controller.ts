import { Body, Controller, Get, Headers, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RiderOnlyGuard } from '../auth/rider-only.guard';
import { DriverOnlyGuard } from '../auth/driver-only.guard';
import { PaymentsService } from './payments.service';
import { InitiateMockPaymentDto } from './dto/initiate-mock-payment.dto';
import { IdempotencyService } from '../idempotency/idempotency.service';
import { PaystackService } from './paystack.service';
import { SaveDriverBankAccountDto } from './dto/save-driver-bank-account.dto';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly idempotencyService: IdempotencyService,
    private readonly paystackService: PaystackService,
  ) {}

  @Post('mock/initiate')
  @UseGuards(JwtAuthGuard, RiderOnlyGuard)
  initiateMockPayment(
    @Req() req: any,
    @Body() body: InitiateMockPaymentDto,
    @Headers('idempotency-key') idempotencyKey?: string
  ) {
    return this.idempotencyService.run({
      key: idempotencyKey,
      scope: 'payments:mock:initiate',
      method: req.method,
      endpoint: req.route?.path ?? '/payments/mock/initiate',
      actorId: req.user.userId,
      body,
    }, () => this.paymentsService.initiateMockPayment(req.user.userId, body.tripId));
  }

  @Get('trip/:tripId')
  @UseGuards(JwtAuthGuard, RiderOnlyGuard)
  getPaymentForTrip(@Param('tripId') tripId: string, @Req() req: any) {
    return this.paymentsService.getPaymentForTrip(tripId, req.user.userId);
  }

  @Get('drivers/payouts')
  @UseGuards(JwtAuthGuard, DriverOnlyGuard)
  getDriverPayouts(@Req() req: any, @Query('limit') limit?: string, @Query('offset') offset?: string) {
    return this.paymentsService.getDriverPayouts(req.user.userId, Number(limit) || 20, Number(offset) || 0);
  }

  @Post('drivers/bank-account')
  @UseGuards(JwtAuthGuard, DriverOnlyGuard)
  saveDriverBankAccount(@Req() req: any, @Body() body: SaveDriverBankAccountDto) {
    return this.paystackService.saveDriverBankAccount(req.user.userId, body);
  }

  @Get('drivers/bank-account')
  @UseGuards(JwtAuthGuard, DriverOnlyGuard)
  getDriverBankAccount(@Req() req: any) {
    return this.paystackService.getDriverBankAccount(req.user.userId);
  }
}
