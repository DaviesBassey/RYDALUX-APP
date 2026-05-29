import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards, Query } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DriverOnlyGuard } from '../auth/driver-only.guard';
import { DriversService } from './drivers.service';
import { SubmitDriverOnboardingDto } from './dto/submit-driver-onboarding.dto';
import { CreateDriverDocumentDto } from './dto/create-driver-document.dto';
import { PayoutsService, AddPayoutAccountDto, RequestPayoutDto } from '../payments/payouts.service';

@Controller('drivers')
@UseGuards(JwtAuthGuard, DriverOnlyGuard)
export class DriversController {
  constructor(
    private readonly driversService: DriversService,
    private readonly payoutsService: PayoutsService,
  ) {}

  @Post('onboarding/profile')
  async submitOnboardingProfile(@Req() req: Request, @Body() body: SubmitDriverOnboardingDto) {
    const user = req.user as any;
    return this.driversService.submitOnboardingProfile(user.userId, body);
  }

  @Post('onboarding/documents')
  async createDocumentUpload(@Req() req: Request, @Body() body: CreateDriverDocumentDto) {
    const user = req.user as any;
    return this.driversService.requestDocumentUpload(user.userId, body);
  }

  @Get('onboarding/documents/:documentId/upload-url')
  async getUploadUrl(@Req() req: Request, @Param('documentId') documentId: string) {
    const user = req.user as any;
    return this.driversService.getSignedUploadUrl(user.userId, documentId);
  }

  @Get('onboarding/status')
  async getOnboardingStatus(@Req() req: Request) {
    const user = req.user as any;
    return this.driversService.getOnboardingStatus(user.userId);
  }

  @Patch('onboarding/activate')
  async activateOnline(@Req() req: Request) {
    const user = req.user as any;
    return this.driversService.activateDriverOnline(user.userId);
  }

  @Post('payout-account')
  async addPayoutAccount(@Req() req: Request, @Body() body: AddPayoutAccountDto) {
    const user = req.user as any;
    return this.payoutsService.addPayoutAccount(user.userId, body);
  }

  @Get('payout-account')
  async getPayoutAccount(@Req() req: Request) {
    const user = req.user as any;
    return this.payoutsService.getPayoutAccount(user.userId);
  }

  @Post('payouts/request')
  async requestPayout(@Req() req: Request, @Body() body: RequestPayoutDto) {
    const user = req.user as any;
    return this.payoutsService.requestPayout(user.userId, body.amount, body.reason);
  }

  @Get('payouts')
  async getPayoutHistory(@Req() req: Request, @Query('limit') limit?: string, @Query('offset') offset?: string) {
    const user = req.user as any;
    return this.payoutsService.getPayoutHistory(user.userId, parseInt(limit || '20'), parseInt(offset || '0'));
  }

  @Get('payouts/balance')
  async getPayoutBalance(@Req() req: Request) {
    const user = req.user as any;
    const balance = await this.payoutsService.getPayoutBalance(user.userId);
    return { balance };
  }
}
