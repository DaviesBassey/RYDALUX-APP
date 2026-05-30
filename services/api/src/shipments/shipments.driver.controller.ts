import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ShipmentsService } from './shipments.service';
import { VerifyShipmentOtpDto } from './dto/verify-shipment-otp.dto';
import { ShipmentProofDto } from './dto/shipment-proof.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DriverOnlyGuard } from '../auth/driver-only.guard';

@Controller('driver/shipments')
@UseGuards(JwtAuthGuard, DriverOnlyGuard)
export class DriverShipmentsController {
  constructor(private readonly shipmentsService: ShipmentsService) {}

  @Get('available')
  getAvailableShipments(@Req() req: any) {
    return this.shipmentsService.getAvailableShipments(req.user.userId);
  }

  @Get('active')
  getDriverActiveShipment(@Req() req: any) {
    return this.shipmentsService.getDriverActiveShipment(req.user.userId);
  }

  @Get(':id')
  getShipmentById(@Param('id') id: string, @Req() req: any) {
    return this.shipmentsService.getShipmentById(id, req.user.userId, 'DRIVER');
  }

  @Post(':id/accept')
  driverAcceptShipment(@Param('id') id: string, @Req() req: any) {
    return this.shipmentsService.driverAcceptShipment(id, req.user.userId);
  }

  @Post(':id/arrive-pickup')
  arriveAtPickup(@Param('id') id: string, @Req() req: any) {
    return this.shipmentsService.arriveAtPickup(id, req.user.userId);
  }

  @Post(':id/verify-pickup-otp')
  verifyPickupOtp(@Param('id') id: string, @Body() body: VerifyShipmentOtpDto, @Req() req: any) {
    return this.shipmentsService.verifyPickupOtp(id, req.user.userId, body);
  }

  @Post(':id/start')
  startShipment(@Param('id') id: string, @Req() req: any) {
    return this.shipmentsService.startShipment(id, req.user.userId);
  }

  @Post(':id/arrive-delivery')
  arriveAtDelivery(@Param('id') id: string, @Req() req: any) {
    return this.shipmentsService.arriveAtDelivery(id, req.user.userId);
  }

  @Post(':id/verify-delivery-otp')
  verifyDeliveryOtp(@Param('id') id: string, @Body() body: VerifyShipmentOtpDto, @Req() req: any) {
    return this.shipmentsService.verifyDeliveryOtp(id, req.user.userId, body);
  }

  @Post(':id/complete')
  completeShipment(@Param('id') id: string, @Req() req: any) {
    return this.shipmentsService.completeShipment(id, req.user.userId);
  }

  @Post(':id/proof')
  submitProof(@Param('id') id: string, @Body() body: ShipmentProofDto, @Req() req: any) {
    return this.shipmentsService.submitProof(id, req.user.userId, body);
  }
}
