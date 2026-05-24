import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AdminService } from './admin.service';
import { PaymentsService } from '../payments/payments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminOnlyGuard } from '../auth/admin-only.guard';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { ApproveKycDto } from './dto/approve-kyc.dto';
import { ApprovePayoutDto } from './dto/approve-payout.dto';
import { DispatchTaskDto } from './dto/dispatch-task.dto';
import { ReportIncidentDto } from './dto/report-incident.dto';
import { ResolveSosEventDto } from './dto/resolve-sos-event.dto';
import { UpdateIncidentStatusDto } from './dto/update-incident-status.dto';
import { ReviewDriverDocumentDto } from '../drivers/dto/review-driver-document.dto';
import { ReviewVehicleDto } from './dto/review-vehicle.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminOnlyGuard, PermissionsGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly paymentsService: PaymentsService
  ) {}

  @Post('kyc/approve')
  @Permissions('KYC_REVIEWER')
  approveKyc(@Req() req: Request, @Body() body: ApproveKycDto) {
    const user = req.user as any;
    return this.adminService.approveKyc(user.userId, body.userId, body.comment);
  }

  @Post('payouts/approve')
  @Permissions('FINANCE_MANAGER')
  approvePayout(@Req() req: Request, @Body() body: ApprovePayoutDto) {
    const user = req.user as any;
    return this.adminService.approvePayout(user.userId, body.payoutId, body.comment);
  }

  @Post('operations/dispatch')
  @Permissions('OPERATIONS_MANAGER')
  dispatchTask(@Req() req: Request, @Body() body: DispatchTaskDto) {
    const user = req.user as any;
    return this.adminService.dispatchTask(user.userId, body.tripId, body.driverId);
  }

  @Post('incidents/report')
  @Permissions('SAFETY_OFFICER')
  reportIncident(@Req() req: Request, @Body() body: ReportIncidentDto) {
    const user = req.user as any;
    return this.adminService.reportIncident(user.userId, body.tripId, body.description, body.severity);
  }

  @Post('drivers/documents/:documentId/review')
  @Permissions('DRIVER_ONBOARDING_REVIEWER')
  reviewDriverDocument(@Req() req: Request, @Param('documentId') documentId: string, @Body() body: ReviewDriverDocumentDto) {
    const user = req.user as any;
    return this.adminService.reviewDriverDocument(user.userId, documentId, body);
  }

  @Post('vehicles/:vehicleId/review')
  @Permissions('VEHICLE_MANAGER')
  reviewVehicle(@Req() req: Request, @Param('vehicleId') vehicleId: string, @Body() body: ReviewVehicleDto) {
    const user = req.user as any;
    return this.adminService.reviewVehicle(user.userId, vehicleId, body);
  }

  @Get('kyc/pending')
  @Permissions('KYC_REVIEWER')
  getPendingKyc(@Query('limit') limit?: string, @Query('offset') offset?: string) {
    return this.adminService.getPendingKyc(Number(limit) || 20, Number(offset) || 0);
  }

  @Get('drivers/documents/pending')
  @Permissions('DRIVER_ONBOARDING_REVIEWER')
  getPendingDriverDocuments(@Query('limit') limit?: string, @Query('offset') offset?: string) {
    return this.adminService.getPendingDriverDocuments(Number(limit) || 20, Number(offset) || 0);
  }

  @Get('vehicles/pending')
  @Permissions('VEHICLE_MANAGER')
  getPendingVehicles(@Query('limit') limit?: string, @Query('offset') offset?: string) {
    return this.adminService.getPendingVehicles(Number(limit) || 20, Number(offset) || 0);
  }

  @Get('audit-logs')
  @Permissions('READ_ONLY_AUDITOR')
  getAuditLogs() {
    return this.adminService.getAuditLogs();
  }

  @Get('sos-events')
  @Permissions('SAFETY_OFFICER')
  listSosEvents(@Query('limit') limit?: string, @Query('offset') offset?: string) {
    return this.adminService.listSosEvents(Number(limit) || 20, Number(offset) || 0);
  }

  @Get('incidents')
  @Permissions('SAFETY_OFFICER')
  listIncidents(@Query('limit') limit?: string, @Query('offset') offset?: string) {
    return this.adminService.listIncidents(Number(limit) || 20, Number(offset) || 0);
  }

  @Patch('sos-events/:id/resolve')
  @Permissions('SAFETY_OFFICER')
  resolveSosEvent(@Req() req: Request, @Param('id') id: string, @Body() body: ResolveSosEventDto) {
    const user = req.user as any;
    return this.adminService.resolveSosEvent(user.userId, id, body.notes);
  }

  @Patch('incidents/:id/status')
  @Permissions('SAFETY_OFFICER')
  updateIncidentStatus(@Req() req: Request, @Param('id') id: string, @Body() body: UpdateIncidentStatusDto) {
    const user = req.user as any;
    return this.adminService.updateIncidentStatus(user.userId, id, body.status);
  }

  @Get('payments')
  @Permissions('FINANCE_MANAGER')
  listPayments(@Query('limit') limit?: string, @Query('offset') offset?: string) {
    return this.paymentsService.listPayments(Number(limit) || 20, Number(offset) || 0);
  }

  @Get('payouts/pending')
  @Permissions('FINANCE_MANAGER')
  listPendingPayouts(@Query('limit') limit?: string, @Query('offset') offset?: string) {
    return this.paymentsService.listPendingPayouts(Number(limit) || 20, Number(offset) || 0);
  }

  @Get('revenue')
  @Permissions('FINANCE_MANAGER')
  getRevenueStats() {
    return this.paymentsService.getRevenueStats();
  }
}
