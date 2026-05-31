import { Controller, Post, Get, Body, Param, UseGuards, Request, UnauthorizedException } from '@nestjs/common';
import { SafetyService } from './safety.service';
import { CreateSosEventDto } from './dto/create-sos-event.dto';
import { CreateIncidentReportDto } from './dto/create-incident-report.dto';
import { AddTrustedContactDto } from './dto/add-trusted-contact.dto';
import { GenerateShareLinkDto } from './dto/generate-share-link.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('safety')
@UseGuards(JwtAuthGuard)
export class SafetyController {
  constructor(private safetyService: SafetyService) {}

  @Post('sos')
  async createSos(@Request() req: any, @Body() dto: CreateSosEventDto) {
    const userId = req.user?.userId || req.user?.sub || req.user?.id;
    if (!userId) throw new UnauthorizedException('Missing authenticated user id');

    return this.safetyService.createSosEvent(userId, dto);
  }

  @Get('sos/:id')
  async getSos(@Request() req: any, @Param('id') sosEventId: string) {
    const userId = req.user?.userId || req.user?.sub || req.user?.id;
    if (!userId) throw new UnauthorizedException('Missing authenticated user id');

    return this.safetyService.getSosEvent(sosEventId, userId);
  }

  @Post('incidents')
  async createIncident(@Request() req: any, @Body() dto: CreateIncidentReportDto) {
    const userId = req.user?.userId || req.user?.sub || req.user?.id;
    if (!userId) throw new UnauthorizedException('Missing authenticated user id');

    return this.safetyService.createIncidentReport(userId, dto);
  }

  @Get('incidents/:id')
  async getIncident(@Request() req: any, @Param('id') reportId: string) {
    const userId = req.user?.userId || req.user?.sub || req.user?.id;
    if (!userId) throw new UnauthorizedException('Missing authenticated user id');

    return this.safetyService.getIncidentReport(reportId, userId);
  }

  @Post('trusted-contacts')
  async addTrustedContact(@Request() req: any, @Body() dto: AddTrustedContactDto) {
    const userId = req.user?.userId || req.user?.sub || req.user?.id;
    if (!userId) throw new UnauthorizedException('Missing authenticated user id');

    return this.safetyService.addTrustedContact(userId, dto);
  }

  @Get('trusted-contacts')
  async listTrustedContacts(@Request() req: any) {
    const userId = req.user?.userId || req.user?.sub || req.user?.id;
    if (!userId) throw new UnauthorizedException('Missing authenticated user id');

    return this.safetyService.listTrustedContacts(userId);
  }

  @Post('trusted-contacts/:id/remove')
  async removeTrustedContact(@Request() req: any, @Param('id') contactId: string) {
    const userId = req.user?.userId || req.user?.sub || req.user?.id;
    if (!userId) throw new UnauthorizedException('Missing authenticated user id');

    return this.safetyService.removeTrustedContact(userId, contactId);
  }

  @Post('share-trip')
  async generateShareLink(@Request() req: any, @Body() dto: GenerateShareLinkDto) {
    const userId = req.user?.userId || req.user?.sub || req.user?.id;
    if (!userId) throw new UnauthorizedException('Missing authenticated user id');

    return this.safetyService.generateShareLink(userId, dto);
  }

  @Get('share-trip/:token')
  async getSharedTrip(@Param('token') token: string) {
    return this.safetyService.getSharedTrip(token);
  }

  @Post('share-trip/:id/expire')
  async expireShareLink(@Request() req: any, @Param('id') linkId: string) {
    const userId = req.user?.userId || req.user?.sub || req.user?.id;
    if (!userId) throw new UnauthorizedException('Missing authenticated user id');

    return this.safetyService.expireShareLink(userId, linkId);
  }

  @Post('check-in')
  async createCheckIn(@Request() req: any, @Body() body: any) {
    const userId = req.user?.userId || req.user?.sub || req.user?.id;
    if (!userId) throw new UnauthorizedException('Missing authenticated user id');

    const { tripId, type, latitude, longitude } = body;
    return this.safetyService.createSafetyCheckIn(tripId, userId, type, latitude, longitude);
  }

  @Get('check-in/:id')
  async getCheckIn(@Param('id') checkInId: string) {
    return { checkInId, status: 'retrieved' };
  }
}
