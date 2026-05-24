import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SafetyService } from './safety.service';
import { TriggerSosDto } from './dto/trigger-sos.dto';

@Controller('sos')
@UseGuards(JwtAuthGuard)
export class SafetyController {
  constructor(private readonly safetyService: SafetyService) {}

  @Post('trigger')
  triggerSos(@Body() body: TriggerSosDto, @Req() req: any) {
    const { userId, userType } = req.user;
    return this.safetyService.triggerSos(
      userId,
      userType,
      body.type,
      body.latitude,
      body.longitude,
      body.notes,
    );
  }

  @Get('status')
  getActiveSos(@Req() req: any) {
    return this.safetyService.getActiveSosForUser(req.user.userId);
  }
}
