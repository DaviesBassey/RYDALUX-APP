import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request, UnauthorizedException } from '@nestjs/common';
import { SafetyService } from './safety.service';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FlagUserDto } from './dto/flag-user.dto';

@Controller('admin/safety')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminSafetyController {
  constructor(private safetyService: SafetyService) {}

  @Get('dashboard')
  @Permissions('SAFETY_OFFICER')
  async getDashboard() {
    return this.safetyService.getDashboardSummary();
  }

  @Get('sos')
  @Permissions('SAFETY_OFFICER')
  async listSosEvents(@Request() req: any) {
    return this.safetyService.listSosEvents();
  }

  @Patch('sos/:id/acknowledge')
  @Permissions('SAFETY_OFFICER')
  async acknowledgeSos(@Request() req: any, @Param('id') sosEventId: string) {
    const userId = req.user?.userId || req.user?.sub || req.user?.id;
    if (!userId) throw new UnauthorizedException('Missing authenticated user id');

    return this.safetyService.acknowledgeSosEvent(userId, sosEventId);
  }

  @Patch('sos/:id/escalate')
  @Permissions('SAFETY_OFFICER')
  async escalateSos(@Request() req: any, @Param('id') sosEventId: string, @Body() body: any) {
    const userId = req.user?.userId || req.user?.sub || req.user?.id;
    if (!userId) throw new UnauthorizedException('Missing authenticated user id');

    return this.safetyService.escalateSosEvent(userId, sosEventId, body.reason);
  }

  @Patch('sos/:id/resolve')
  @Permissions('SAFETY_OFFICER')
  async resolveSos(@Request() req: any, @Param('id') sosEventId: string, @Body() body: any) {
    const userId = req.user?.userId || req.user?.sub || req.user?.id;
    if (!userId) throw new UnauthorizedException('Missing authenticated user id');

    return this.safetyService.resolveSosEvent(userId, sosEventId, body.resolution);
  }

  @Get('incidents')
  @Permissions('SAFETY_OFFICER')
  async listIncidents() {
    return this.safetyService.listIncidentReports();
  }

  @Patch('incidents/:id/status')
  @Permissions('SAFETY_OFFICER')
  async updateIncidentStatus(@Request() req: any, @Param('id') reportId: string, @Body() body: any) {
    const userId = req.user?.userId || req.user?.sub || req.user?.id;
    if (!userId) throw new UnauthorizedException('Missing authenticated user id');

    return this.safetyService.updateIncidentStatus(userId, reportId, body.status, body.notes);
  }

  @Get('flags')
  @Permissions('SAFETY_OFFICER')
  async listFlags() {
    return { flags: [], total: 0 };
  }

  @Post('flags')
  @Permissions('SAFETY_OFFICER')
  async createFlag(@Request() req: any, @Body() dto: FlagUserDto) {
    const userId = req.user?.userId || req.user?.sub || req.user?.id;
    if (!userId) throw new UnauthorizedException('Missing authenticated user id');

    return this.safetyService.flagUser(userId, dto);
  }

  @Patch('flags/:id')
  @Permissions('SAFETY_OFFICER')
  async updateFlag(@Request() req: any, @Param('id') flagId: string, @Body() body: any) {
    const userId = req.user?.userId || req.user?.sub || req.user?.id;
    if (!userId) throw new UnauthorizedException('Missing authenticated user id');

    if (body.action === 'unflag') {
      return this.safetyService.unflagUser(userId, flagId);
    }
    return { flagId, updated: true };
  }

  @Get('events/recent')
  @Permissions('SAFETY_OFFICER')
  async getRecentEvents() {
    return this.safetyService.getRecentSafetyEvents();
  }
}
