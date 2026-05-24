import { IsLatitude, IsLongitude, IsOptional, IsString, IsEnum, IsISO8601 } from 'class-validator';
import { ServiceType } from '@prisma/client';

export class CreateFareQuoteDto {
  @IsLatitude()
  pickupLatitude: number;

  @IsLongitude()
  pickupLongitude: number;

  @IsLatitude()
  dropoffLatitude: number;

  @IsLongitude()
  dropoffLongitude: number;

  @IsEnum(ServiceType)
  rideCategory: ServiceType;

  @IsOptional()
  @IsISO8601()
  scheduledTime?: string;

  @IsOptional()
  @IsString()
  promoCode?: string;
}

export class FareQuoteResponseDto {
  id: string;
  breakdown: any;
  expiresAt: string | null;
}
