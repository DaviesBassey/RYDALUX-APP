import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { PackageCategory, ShipmentPriority } from '@prisma/client';

export class CreateShipmentDto {
  @IsUUID()
  quoteId: string;

  @IsString()
  pickupAddress: string;

  @IsString()
  dropoffAddress: string;

  @IsString()
  senderName: string;

  @IsString()
  recipientName: string;

  @IsString()
  recipientPhone: string;

  @IsOptional()
  @IsString()
  packageDescription?: string;

  @IsEnum(PackageCategory)
  packageCategory: PackageCategory;

  @IsEnum(ShipmentPriority)
  priority: ShipmentPriority;

  @IsOptional()
  @IsString()
  specialInstructions?: string;
}
