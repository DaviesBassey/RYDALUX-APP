import { Body, Controller, Get, Headers, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AdminService } from './admin.service';
import { PaymentsService } from '../payments/payments.service';
import { PaystackService } from '../payments/paystack.service';
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
import { IdempotencyService } from '../idempotency/idempotency.service';
import { RequestRefundDto } from './dto/request-refund.dto';
import { RetryPayoutDto } from './dto/retry-payout.dto';
import { DeadLetterProviderEventDto } from './dto/dead-letter-provider-event.dto';
import { ResolveDisputeDto, UpdateDisputeAdminDto } from './dto/update-dispute-admin.dto';
import { FinanceSchedulerService } from '../scheduler/finance-scheduler.service';
import { ShipmentsService } from '../shipments/shipments.service';
import { AdminShipmentStatusDto, AdminResolveShipmentDto } from '../shipments/dto/admin-shipment.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminOnlyGuard, PermissionsGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly paymentsService: PaymentsService,
    private readonly idempotencyService: IdempotencyService,
    private readonly paystackService: PaystackService,
    private readonly financeSchedulerService: FinanceSchedulerService,
    private readonly shipmentsService: ShipmentsService,
  ) {}

  @Post('kyc/approve')
  @Permissions('KYC_REVIEWER')
  approveKyc(@Req() req: Request, @Body() body: ApproveKycDto) {
    const user = req.user as any;
    return this.adminService.approveKyc(user.userId, body.userId, body.comment);
  }

  @Post('payouts/approve')
  @Permissions('FINANCE_MANAGER')
  approvePayout(@Req() req: Request, @Body() body: ApprovePayoutDto, @Headers('idempotency-key') idempotencyKey?: string) {
    const user = req.user as any;
    return this.idempotencyService.run({
      key: idempotencyKey,
      scope: 'admin:payouts:approve',
      method: req.method,
      endpoint: req.route?.path ?? '/admin/payouts/approve',
      actorId: user.userId,
      body,
      ttlMs: 7 * 24 * 60 * 60 * 1000,
    }, () => this.adminService.approvePayout(user.userId, body.payoutId, body.comment));
  }

  @Post('payouts/:id/retry')
  @Permissions('FINANCE_MANAGER')
  retryPayout(@Req() req: Request, @Param('id') id: string, @Body() body: RetryPayoutDto, @Headers('idempotency-key') idempotencyKey?: string) {
    const user = req.user as any;
    return this.idempotencyService.run({
      key: idempotencyKey,
      scope: 'admin:payouts:retry',
      method: req.method,
      endpoint: req.route?.path ?? '/admin/payouts/:id/retry',
      actorId: user.userId,
      body: { id, ...body },
      ttlMs: 7 * 24 * 60 * 60 * 1000,
    }, () => this.paystackService.retryPayoutTransfer(id, user.userId, body.comment));
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

  @Get('finance/summary')
  @Permissions('FINANCE_MANAGER')
  getFinanceSummary() {
    return this.paymentsService.getFinanceSummary();
  }

  @Get('finance/payments')
  @Permissions('FINANCE_MANAGER')
  listFinancePayments(@Query('limit') limit?: string, @Query('offset') offset?: string) {
    return this.paymentsService.listFinancePayments(Number(limit) || 20, Number(offset) || 0);
  }

  @Get('finance/payouts')
  @Permissions('FINANCE_MANAGER')
  listFinancePayouts(@Query('limit') limit?: string, @Query('offset') offset?: string) {
    return this.paymentsService.listFinancePayouts(Number(limit) || 20, Number(offset) || 0);
  }

  @Get('finance/ledger')
  @Permissions('FINANCE_MANAGER')
  listFinanceLedger(@Query('limit') limit?: string, @Query('offset') offset?: string) {
    return this.paymentsService.listFinanceLedger(Number(limit) || 20, Number(offset) || 0);
  }

  @Get('finance/wallets')
  @Permissions('FINANCE_MANAGER')
  listFinanceWallets(@Query('limit') limit?: string, @Query('offset') offset?: string) {
    return this.paymentsService.listFinanceWallets(Number(limit) || 20, Number(offset) || 0);
  }

  @Get('finance/reconciliation')
  @Permissions('FINANCE_MANAGER')
  getFinanceReconciliation() {
    return this.paymentsService.getFinanceReconciliation();
  }

  @Post('finance/reconciliation/run')
  @Permissions('FINANCE_MANAGER')
  runFinanceReconciliation(@Req() req: Request, @Headers('idempotency-key') idempotencyKey?: string) {
    const user = req.user as any;
    return this.idempotencyService.run({
      key: idempotencyKey,
      scope: 'admin:finance:reconciliation:run',
      method: req.method,
      endpoint: req.route?.path ?? '/admin/finance/reconciliation/run',
      actorId: user.userId,
      body: {},
      ttlMs: 60 * 60 * 1000,
    }, () => this.paystackService.runManualReconciliation(user.userId));
  }

  @Post('finance/reconciliation/retry-provider-events')
  @Permissions('FINANCE_MANAGER')
  runProviderEventRetries(@Req() req: Request, @Headers('idempotency-key') idempotencyKey?: string) {
    const user = req.user as any;
    return this.idempotencyService.run({
      key: idempotencyKey,
      scope: 'admin:finance:provider-events:retry-due',
      method: req.method,
      endpoint: req.route?.path ?? '/admin/finance/reconciliation/retry-provider-events',
      actorId: user.userId,
      body: {},
      ttlMs: 60 * 60 * 1000,
    }, () => this.financeSchedulerService.runDueProviderEventRetries('manual'));
  }

  @Get('finance/reconciliation/status')
  @Permissions('FINANCE_MANAGER')
  getFinanceSchedulerStatus() {
    return this.financeSchedulerService.getSchedulerStatus();
  }

  @Get('finance/reconciliation/jobs')
  @Permissions('FINANCE_MANAGER')
  listFinanceReconciliationJobs(@Query('limit') limit?: string, @Query('offset') offset?: string) {
    return this.financeSchedulerService.listReconciliationJobs(Number(limit) || 20, Number(offset) || 0);
  }

  @Get('finance/reconciliation/mismatches')
  @Permissions('FINANCE_MANAGER')
  getFinanceReconciliationMismatches(@Query('limit') limit?: string, @Query('offset') offset?: string) {
    return this.paystackService.getReconciliationMismatches(Number(limit) || 50, Number(offset) || 0);
  }

  @Get('finance/provider-events')
  @Permissions('FINANCE_MANAGER')
  listProviderEvents(@Query('status') status?: string, @Query('limit') limit?: string, @Query('offset') offset?: string) {
    return this.paystackService.listProviderEvents(status, Number(limit) || 20, Number(offset) || 0);
  }

  @Get('finance/operations')
  @Permissions('FINANCE_MANAGER')
  listFinancialOperations(@Query('limit') limit?: string, @Query('offset') offset?: string) {
    return this.paystackService.listFinancialOperations(Number(limit) || 20, Number(offset) || 0);
  }

  @Post('finance/daily-close/generate')
  @Permissions('FINANCE_MANAGER')
  generateDailyClose(@Req() req: Request, @Headers('idempotency-key') idempotencyKey?: string) {
    const user = req.user as any;
    return this.idempotencyService.run({
      key: idempotencyKey,
      scope: 'admin:finance:daily-close:generate',
      method: req.method,
      endpoint: req.route?.path ?? '/admin/finance/daily-close/generate',
      actorId: user.userId,
      body: {},
      ttlMs: 60 * 60 * 1000,
    }, () => this.financeSchedulerService.generateDailyClose());
  }

  @Get('finance/daily-close')
  @Permissions('FINANCE_MANAGER')
  listDailyCloseReports(@Query('limit') limit?: string, @Query('offset') offset?: string) {
    return this.financeSchedulerService.listDailyCloseReports(Number(limit) || 20, Number(offset) || 0);
  }

  @Get('finance/daily-close/latest')
  @Permissions('FINANCE_MANAGER')
  getLatestDailyCloseReport() {
    return this.financeSchedulerService.getLatestDailyCloseReport();
  }

  @Post('finance/provider-events/:id/retry')
  @Permissions('FINANCE_MANAGER')
  retryProviderEvent(@Req() req: Request, @Param('id') id: string, @Headers('idempotency-key') idempotencyKey?: string) {
    const user = req.user as any;
    return this.idempotencyService.run({
      key: idempotencyKey,
      scope: 'admin:finance:provider-events:retry',
      method: req.method,
      endpoint: req.route?.path ?? '/admin/finance/provider-events/:id/retry',
      actorId: user.userId,
      body: { id },
      ttlMs: 60 * 60 * 1000,
    }, () => this.paystackService.retryProviderEvent(id, user.userId));
  }

  @Post('finance/provider-events/:id/dead-letter')
  @Permissions('FINANCE_MANAGER')
  deadLetterProviderEvent(@Req() req: Request, @Param('id') id: string, @Body() body: DeadLetterProviderEventDto) {
    const user = req.user as any;
    return this.paystackService.deadLetterProviderEvent(id, user.userId, body.reason);
  }

  @Post('finance/refunds')
  @Permissions('FINANCE_MANAGER')
  requestRefund(@Req() req: Request, @Body() body: RequestRefundDto, @Headers('idempotency-key') idempotencyKey?: string) {
    const user = req.user as any;
    return this.idempotencyService.run({
      key: idempotencyKey,
      scope: 'admin:finance:refunds:create',
      method: req.method,
      endpoint: req.route?.path ?? '/admin/finance/refunds',
      actorId: user.userId,
      body,
      ttlMs: 7 * 24 * 60 * 60 * 1000,
    }, () => this.paystackService.requestRefund(user.userId, body.paymentId, body.reason));
  }

  @Get('finance/refunds')
  @Permissions('FINANCE_MANAGER')
  listRefunds(@Query('limit') limit?: string, @Query('offset') offset?: string) {
    return this.paystackService.listRefunds(Number(limit) || 20, Number(offset) || 0);
  }

  @Get('finance/disputes')
  @Permissions('FINANCE_MANAGER')
  listDisputes(@Query('limit') limit?: string, @Query('offset') offset?: string) {
    return this.paystackService.listDisputes(Number(limit) || 20, Number(offset) || 0);
  }

  @Patch('finance/disputes/:id')
  @Permissions('FINANCE_MANAGER')
  updateDisputeAdminState(@Req() req: Request, @Param('id') id: string, @Body() body: UpdateDisputeAdminDto) {
    const user = req.user as any;
    return this.paystackService.updateDisputeAdminState(id, user.userId, body.adminStatus, body.adminNotes);
  }

  @Post('finance/disputes/:id/resolve')
  @Permissions('FINANCE_MANAGER')
  resolveDispute(@Req() req: Request, @Param('id') id: string, @Body() body: ResolveDisputeDto) {
    const user = req.user as any;
    return this.paystackService.resolveDispute(id, user.userId, body.resolution, body.notes);
  }

  // ── Shipment management ──────────────────────────────────────────────────────

  @Get('shipments')
  listShipments(@Query('status') status?: string, @Query('limit') limit?: string, @Query('offset') offset?: string) {
    return this.shipmentsService.adminListShipments(status, Number(limit) || 20, Number(offset) || 0);
  }

  @Get('shipments/:id')
  getShipment(@Param('id') id: string) {
    return this.shipmentsService.adminGetShipment(id);
  }

  @Patch('shipments/:id/status')
  forceShipmentStatus(@Param('id') id: string, @Body() body: AdminShipmentStatusDto, @Req() req: Request) {
    const user = req.user as any;
    return this.shipmentsService.adminForceStatus(id, user.userId, body.status, body.reason);
  }

  @Post('shipments/:id/resolve')
  resolveShipment(@Param('id') id: string, @Body() body: AdminResolveShipmentDto, @Req() req: Request) {
    const user = req.user as any;
    return this.shipmentsService.adminResolveShipment(id, user.userId, body.resolution, body.notes);
  }
}
