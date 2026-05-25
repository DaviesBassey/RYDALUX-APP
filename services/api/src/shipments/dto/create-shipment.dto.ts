import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateShipmentDto {
  @IsUUID()
  fareQuoteId: string;

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

  @IsIn(['SMALL', 'MEDIUM', 'LARGE'])
  packageSizeClass: string;

  @IsOptional()
  @IsString()
  specialInstructions?: string;
}
