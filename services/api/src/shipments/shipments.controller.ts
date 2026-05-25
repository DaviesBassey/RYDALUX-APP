import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ShipmentsService } from './shipments.service';
import { CreateShipmentQuoteDto } from './dto/create-shipment-quote.dto';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { ConfirmPickupDto } from './dto/confirm-pickup.dto';
import { SubmitProofDto } from './dto/submit-proof.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RiderOnlyGuard } from '../auth/rider-only.guard';
import { DriverOnlyGuard } from '../auth/driver-only.guard';

@Controller('shipments')
export class ShipmentsController {
  constructor(private readonly shipmentsService: ShipmentsService) {}

  // ── Rider endpoints ──────────────────────────────────────────────────────────

  @Post('quote')
  @UseGuards(JwtAuthGuard, RiderOnlyGuard)
  createQuote(@Body() body: CreateShipmentQuoteDto) {
    return this.shipmentsService.createQuote(body);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RiderOnlyGuard)
  createShipment(@Body() body: CreateShipmentDto, @Req() req: any) {
    return this.shipmentsService.createShipment(req.user.userId, body);
  }

  // Static segments before :id to prevent route shadowing
  @Get('active')
  @UseGuards(JwtAuthGuard, RiderOnlyGuard)
  getActiveShipment(@Req() req: any) {
    return this.shipmentsService.getActiveShipment(req.user.userId);
  }

  @Get(':id/codes')
  @UseGuards(JwtAuthGuard, RiderOnlyGuard)
  getShipmentCodes(@Param('id') id: string, @Req() req: any) {
    return this.shipmentsService.getShipmentCodes(id, req.user.userId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  getShipmentById(@Param('id') id: string, @Req() req: any) {
    return this.shipmentsService.getShipmentById(id, req.user.userId, req.user.userType);
  }

  // ── Driver endpoints ─────────────────────────────────────────────────────────

  @Get('driver/available')
  @UseGuards(JwtAuthGuard, DriverOnlyGuard)
  getAvailableShipments(@Req() req: any) {
    return this.shipmentsService.getAvailableShipments(req.user.userId);
  }

  @Get('driver/active')
  @UseGuards(JwtAuthGuard, DriverOnlyGuard)
  getDriverActiveShipment(@Req() req: any) {
    return this.shipmentsService.getDriverActiveShipment(req.user.userId);
  }

  @Post(':id/driver/accept')
  @UseGuards(JwtAuthGuard, DriverOnlyGuard)
  driverAcceptShipment(@Param('id') id: string, @Req() req: any) {
    return this.shipmentsService.driverAcceptShipment(id, req.user.userId);
  }

  @Post(':id/arrive-pickup')
  @UseGuards(JwtAuthGuard, DriverOnlyGuard)
  arriveAtPickup(@Param('id') id: string, @Req() req: any) {
    return this.shipmentsService.arriveAtPickup(id, req.user.userId);
  }

  @Post(':id/confirm-pickup')
  @UseGuards(JwtAuthGuard, DriverOnlyGuard)
  confirmPickup(@Param('id') id: string, @Body() body: ConfirmPickupDto, @Req() req: any) {
    return this.shipmentsService.confirmPickup(id, req.user.userId, body.pin);
  }

  @Post(':id/proofs')
  @UseGuards(JwtAuthGuard, DriverOnlyGuard)
  submitProof(@Param('id') id: string, @Body() body: SubmitProofDto, @Req() req: any) {
    return this.shipmentsService.submitProof(id, req.user.userId, body);
  }

  @Post(':id/confirm-delivery')
  @UseGuards(JwtAuthGuard, DriverOnlyGuard)
  confirmDelivery(@Param('id') id: string, @Req() req: any) {
    return this.shipmentsService.confirmDelivery(id, req.user.userId);
  }
}
