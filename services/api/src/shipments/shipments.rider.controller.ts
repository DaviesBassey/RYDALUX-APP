import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ShipmentsService } from './shipments.service';
import { CreateShipmentQuoteDto } from './dto/create-shipment-quote.dto';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { CancelShipmentDto } from './dto/cancel-shipment.dto';
import { ShipmentPhotoUploadRequestDto } from './dto/shipment-photo-upload-request.dto';
import { CreateShipmentSupportTicketDto } from './dto/create-shipment-support-ticket.dto';
import { ShipmentListQueryDto } from './dto/shipment-list-query.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RiderOnlyGuard } from '../auth/rider-only.guard';

@Controller('shipments')
@UseGuards(JwtAuthGuard, RiderOnlyGuard)
export class RiderShipmentsController {
  constructor(private readonly shipmentsService: ShipmentsService) {}

  @Post('quote')
  createQuote(@Body() body: CreateShipmentQuoteDto, @Req() req: any) {
    return this.shipmentsService.createQuote(req.user.userId, body);
  }

  @Post()
  createShipment(@Body() body: CreateShipmentDto, @Req() req: any) {
    return this.shipmentsService.createShipment(req.user.userId, body);
  }

  @Get()
  listRiderShipments(@Query() query: ShipmentListQueryDto, @Req() req: any) {
    return this.shipmentsService.listRiderShipments(req.user.userId, query);
  }

  @Get('active')
  getActiveShipment(@Req() req: any) {
    return this.shipmentsService.getActiveShipment(req.user.userId);
  }

  @Get(':id/codes')
  getShipmentCodes(@Param('id') id: string, @Req() req: any) {
    return this.shipmentsService.getShipmentCodes(id, req.user.userId);
  }

  @Get(':id')
  getShipmentById(@Param('id') id: string, @Req() req: any) {
    return this.shipmentsService.getShipmentById(id, req.user.userId, 'RIDER');
  }

  @Post(':id/cancel')
  cancelShipment(@Param('id') id: string, @Body() body: CancelShipmentDto, @Req() req: any) {
    return this.shipmentsService.cancelShipment(id, req.user.userId, body);
  }

  @Post(':id/photos/request-upload')
  requestPhotoUpload(@Param('id') id: string, @Body() body: ShipmentPhotoUploadRequestDto, @Req() req: any) {
    return this.shipmentsService.requestPhotoUpload(id, req.user.userId, body);
  }

  @Post(':id/support-ticket')
  createSupportTicket(@Param('id') id: string, @Body() body: CreateShipmentSupportTicketDto, @Req() req: any) {
    return this.shipmentsService.createSupportTicket(id, req.user.userId, body);
  }
}
