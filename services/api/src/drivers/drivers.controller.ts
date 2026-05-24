import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DriverOnlyGuard } from '../auth/driver-only.guard';
import { DriversService } from './drivers.service';
import { SubmitDriverOnboardingDto } from './dto/submit-driver-onboarding.dto';
import { CreateDriverDocumentDto } from './dto/create-driver-document.dto';

@Controller('drivers')
@UseGuards(JwtAuthGuard, DriverOnlyGuard)
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

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
    const approved = await this.driversService.canActivateOnline(user.userId);
    return { fullyApproved: approved };
  }

  @Patch('onboarding/activate')
  async activateOnline(@Req() req: Request) {
    const user = req.user as any;
    return this.driversService.activateDriverOnline(user.userId);
  }
}
