import { Controller, Post, Get, Body, Param, UseGuards, Request } from '@nestjs/common';
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
    return this.safetyService.createSosEvent(req.user.id, dto);
  }

  @Get('sos/:id')
  async getSos(@Request() req: any, @Param('id') sosEventId: string) {
    return this.safetyService.getSosEvent(sosEventId, req.user.id);
  }

  @Post('incidents')
  async createIncident(@Request() req: any, @Body() dto: CreateIncidentReportDto) {
    return this.safetyService.createIncidentReport(req.user.id, dto);
  }

  @Get('incidents/:id')
  async getIncident(@Request() req: any, @Param('id') reportId: string) {
    return this.safetyService.getIncidentReport(reportId, req.user.id);
  }

  @Post('trusted-contacts')
  async addTrustedContact(@Request() req: any, @Body() dto: AddTrustedContactDto) {
    return this.safetyService.addTrustedContact(req.user.id, dto);
  }

  @Get('trusted-contacts')
  async listTrustedContacts(@Request() req: any) {
    return this.safetyService.listTrustedContacts(req.user.id);
  }

  @Post('trusted-contacts/:id/remove')
  async removeTrustedContact(@Request() req: any, @Param('id') contactId: string) {
    return this.safetyService.removeTrustedContact(req.user.id, contactId);
  }

  @Post('share-trip')
  async generateShareLink(@Request() req: any, @Body() dto: GenerateShareLinkDto) {
    return this.safetyService.generateShareLink(req.user.id, dto);
  }

  @Get('share-trip/:token')
  async getSharedTrip(@Param('token') token: string) {
    return this.safetyService.getSharedTrip(token);
  }

  @Post('share-trip/:id/expire')
  async expireShareLink(@Request() req: any, @Param('id') linkId: string) {
    return this.safetyService.expireShareLink(req.user.id, linkId);
  }

  @Post('check-in')
  async createCheckIn(@Request() req: any, @Body() body: any) {
    const { tripId, type, latitude, longitude } = body;
    return this.safetyService.createSafetyCheckIn(tripId, req.user.id, type, latitude, longitude);
  }

  @Get('check-in/:id')
  async getCheckIn(@Param('id') checkInId: string) {
    return { checkInId, status: 'retrieved' };
  }
}
