import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
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
    return this.safetyService.acknowledgeSosEvent(req.user.userId, sosEventId);
  }

  @Patch('sos/:id/escalate')
  @Permissions('SAFETY_OFFICER')
  async escalateSos(@Request() req: any, @Param('id') sosEventId: string, @Body() body: any) {
    return this.safetyService.escalateSosEvent(req.user.userId, sosEventId, body.reason);
  }

  @Patch('sos/:id/resolve')
  @Permissions('SAFETY_OFFICER')
  async resolveSos(@Request() req: any, @Param('id') sosEventId: string, @Body() body: any) {
    return this.safetyService.resolveSosEvent(req.user.userId, sosEventId, body.resolution);
  }

  @Get('incidents')
  @Permissions('SAFETY_OFFICER')
  async listIncidents() {
    return this.safetyService.listIncidentReports();
  }

  @Patch('incidents/:id/status')
  @Permissions('SAFETY_OFFICER')
  async updateIncidentStatus(@Request() req: any, @Param('id') reportId: string, @Body() body: any) {
    return this.safetyService.updateIncidentStatus(req.user.userId, reportId, body.status, body.notes);
  }

  @Get('flags')
  @Permissions('SAFETY_OFFICER')
  async listFlags() {
    return { flags: [], total: 0 };
  }

  @Post('flags')
  @Permissions('SAFETY_OFFICER')
  async createFlag(@Request() req: any, @Body() dto: FlagUserDto) {
    return this.safetyService.flagUser(req.user.userId, dto);
  }

  @Patch('flags/:id')
  @Permissions('SAFETY_OFFICER')
  async updateFlag(@Request() req: any, @Param('id') flagId: string, @Body() body: any) {
    if (body.action === 'unflag') {
      return this.safetyService.unflagUser(req.user.userId, flagId);
    }
    return { flagId, updated: true };
  }

  @Get('events/recent')
  @Permissions('SAFETY_OFFICER')
  async getRecentEvents() {
    return this.safetyService.getRecentSafetyEvents();
  }
}
