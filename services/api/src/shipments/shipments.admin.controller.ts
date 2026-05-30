import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ShipmentsService } from './shipments.service';
import { AssignShipmentDriverDto } from './dto/assign-shipment-driver.dto';
import { CancelShipmentDto } from './dto/cancel-shipment.dto';
import { DisputeShipmentDto } from './dto/dispute-shipment.dto';
import { UpdateShipmentStatusDto } from './dto/update-shipment-status.dto';
import { AdminShipmentListQueryDto } from './dto/admin-shipment-list-query.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminOnlyGuard } from '../auth/admin-only.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';

@Controller('admin/shipments')
@UseGuards(JwtAuthGuard, AdminOnlyGuard, PermissionsGuard)
export class AdminShipmentsController {
  constructor(private readonly shipmentsService: ShipmentsService) {}

  @Get()
  @Permissions('read:shipments')
  adminListShipments(@Query() query: AdminShipmentListQueryDto) {
    return this.shipmentsService.adminListShipments(query);
  }

  @Get(':id')
  @Permissions('read:shipments')
  adminGetShipment(@Param('id') id: string) {
    return this.shipmentsService.adminGetShipment(id);
  }

  @Post(':id/assign-driver')
  @Permissions('update:shipments')
  adminAssignDriver(@Param('id') id: string, @Body() body: AssignShipmentDriverDto, @Req() req: any) {
    return this.shipmentsService.adminAssignDriver(id, req.user.userId, body);
  }

  @Post(':id/cancel')
  @Permissions('update:shipments')
  adminCancelShipment(@Param('id') id: string, @Body() body: CancelShipmentDto, @Req() req: any) {
    return this.shipmentsService.adminCancelShipment(id, req.user.userId, body);
  }

  @Post(':id/dispute')
  @Permissions('update:shipments')
  adminDisputeShipment(@Param('id') id: string, @Body() body: DisputeShipmentDto, @Req() req: any) {
    return this.shipmentsService.adminDisputeShipment(id, req.user.userId, body);
  }

  @Patch(':id/status')
  @Permissions('update:shipments')
  adminUpdateStatus(@Param('id') id: string, @Body() body: UpdateShipmentStatusDto, @Req() req: any) {
    return this.shipmentsService.adminUpdateStatus(id, req.user.userId, body);
  }
}
