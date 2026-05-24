import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DriverOnlyGuard } from '../auth/driver-only.guard';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { CreateVehicleDocumentDto } from './dto/create-vehicle-document.dto';

@Controller('vehicles')
@UseGuards(JwtAuthGuard, DriverOnlyGuard)
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Post()
  createVehicle(@Req() req: Request, @Body() body: CreateVehicleDto) {
    const user = req.user as any;
    return this.vehiclesService.createVehicle(user.userId, body);
  }

  @Post(':id/documents')
  requestVehicleDocumentUpload(@Req() req: Request, @Param('id') id: string, @Body() body: CreateVehicleDocumentDto) {
    const user = req.user as any;
    return this.vehiclesService.requestVehicleDocumentUpload(user.userId, id, body);
  }

  @Get(':id/documents')
  listVehicleDocuments(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as any;
    return this.vehiclesService.listVehicleDocuments(user.userId, id);
  }

  @Get(':id/verification')
  getVehicleVerificationStatus(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as any;
    return this.vehiclesService.getVehicleVerificationStatus(user.userId, id);
  }

  @Get()
  listVehicles(@Req() req: Request) {
    const user = req.user as any;
    return this.vehiclesService.listVehicles(user.userId);
  }

  @Get(':id')
  getVehicle(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as any;
    return this.vehiclesService.getVehicle(user.userId, id);
  }

  @Patch(':id/activate')
  activateVehicle(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as any;
    return this.vehiclesService.activateVehicle(user.userId, id);
  }
}
