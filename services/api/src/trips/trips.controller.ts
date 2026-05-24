import { Body, Controller, ForbiddenException, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { TripsService } from './trips.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { TransitionTripDto } from './dto/transition-trip.dto';
import { DispatchDecisionDto } from './dto/dispatch-decision.dto';
import { UpdateTripLocationDto } from './dto/update-trip-location.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DriverOnlyGuard } from '../auth/driver-only.guard';
import { RiderOnlyGuard } from '../auth/rider-only.guard';

const RIDER_ALLOWED_TRANSITIONS = new Set([
  'QUOTED',
  'REQUESTED',
  'CANCELLED_BY_RIDER',
]);

const DRIVER_ALLOWED_TRANSITIONS = new Set([
  'DRIVER_ARRIVING',
  'DRIVER_ARRIVED',
  'PIN_VERIFIED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED_BY_DRIVER',
  'DISPUTED',
]);

@Controller('trips')
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  // ── Rider MVP endpoints ────────────────────────────────────────────────────

  @Post()
  @UseGuards(JwtAuthGuard, RiderOnlyGuard)
  async createTrip(@Body() body: CreateTripDto, @Req() req: any) {
    return this.tripsService.createTrip(req.user.userId, body);
  }

  // IMPORTANT: declared before @Get(':id') so "rider" is not consumed as :id
  @Get('rider/active')
  @UseGuards(JwtAuthGuard, RiderOnlyGuard)
  async getActiveTrip(@Req() req: any) {
    return this.tripsService.getActiveTrip(req.user.userId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getTrip(@Param('id') id: string, @Req() req: any) {
    return this.tripsService.getTripForUser(id, req.user.userId, req.user.userType);
  }

  // ── Dispatch & driver endpoints ────────────────────────────────────────────

  @Post(':id/dispatch')
  async dispatch(@Param('id') id: string) {
    return this.tripsService.dispatchTrip(id);
  }

  @Post(':id/drivers/:driverId/accept')
  async accept(
    @Param('id') id: string,
    @Param('driverId') driverId: string,
    @Body() body: DispatchDecisionDto
  ) {
    return this.tripsService.acceptDispatch(id, driverId, body.reason);
  }

  @Post(':id/drivers/:driverId/reject')
  async reject(
    @Param('id') id: string,
    @Param('driverId') driverId: string,
    @Body() body: DispatchDecisionDto
  ) {
    return this.tripsService.rejectDispatch(id, driverId, body.reason);
  }

  @Post(':id/location')
  @UseGuards(JwtAuthGuard, DriverOnlyGuard)
  async updateLocation(@Param('id') id: string, @Body() body: UpdateTripLocationDto, @Req() req: any) {
    return this.tripsService.updateDriverLocation(id, req.user.userId, body);
  }

  @Get(':id/location')
  @UseGuards(JwtAuthGuard, RiderOnlyGuard)
  async getLocation(@Param('id') id: string, @Req() req: any) {
    return this.tripsService.getDriverLiveLocation(id, req.user.userId);
  }

  @Get(':id/pin')
  @UseGuards(JwtAuthGuard, RiderOnlyGuard)
  async getPin(@Param('id') id: string, @Req() req: any) {
    return this.tripsService.getTripPin(id, req.user.userId);
  }

  @Post(':id/transition')
  @UseGuards(JwtAuthGuard)
  async transition(@Param('id') id: string, @Body() body: TransitionTripDto, @Req() req: any) {
    const { userId, userType } = req.user;

    if (userType === 'RIDER' && !RIDER_ALLOWED_TRANSITIONS.has(body.nextState)) {
      throw new ForbiddenException('Riders cannot perform this transition.');
    }
    if (userType === 'DRIVER' && !DRIVER_ALLOWED_TRANSITIONS.has(body.nextState)) {
      throw new ForbiddenException('Drivers cannot perform this transition.');
    }

    return this.tripsService.transition(id, userId, body.nextState as any, { reason: body.reason, pin: body.pin });
  }
}
