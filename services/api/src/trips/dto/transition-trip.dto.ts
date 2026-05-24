import { IsIn, IsOptional, IsString } from 'class-validator';

const VALID_TRIP_STATUSES = [
  'DRAFT',
  'QUOTED',
  'REQUESTED',
  'DRIVER_ASSIGNED',
  'DRIVER_ARRIVING',
  'DRIVER_ARRIVED',
  'PIN_VERIFIED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED_BY_RIDER',
  'CANCELLED_BY_DRIVER',
  'EXPIRED',
  'DISPUTED'
] as const;

export class TransitionTripDto {
  @IsIn(VALID_TRIP_STATUSES)
  nextState: typeof VALID_TRIP_STATUSES[number];

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  pin?: string;
}
