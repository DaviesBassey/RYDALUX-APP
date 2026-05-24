import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RiderOnlyGuard } from '../auth/rider-only.guard';
import { DriverOnlyGuard } from '../auth/driver-only.guard';
import { PaymentsService } from './payments.service';
import { InitiateMockPaymentDto } from './dto/initiate-mock-payment.dto';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('mock/initiate')
  @UseGuards(JwtAuthGuard, RiderOnlyGuard)
  initiateMockPayment(@Req() req: any, @Body() body: InitiateMockPaymentDto) {
    return this.paymentsService.initiateMockPayment(req.user.userId, body.tripId);
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
}
