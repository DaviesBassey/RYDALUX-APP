import { IsEnum, IsLatitude, IsLongitude, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { PackageCategory, ShipmentPriority } from '@prisma/client';

export class CreateShipmentQuoteDto {
  @IsLatitude()
  pickupLatitude: number;

  @IsLongitude()
  pickupLongitude: number;

  @IsLatitude()
  dropoffLatitude: number;

  @IsLongitude()
  dropoffLongitude: number;

  @IsEnum(PackageCategory)
  packageCategory: PackageCategory;

  @IsEnum(ShipmentPriority)
  priority: ShipmentPriority;

  @IsOptional()
  @IsNumber()
  @Min(0)
  declaredValue?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number;

  @IsOptional()
  @IsString()
  promoCode?: string;
}
