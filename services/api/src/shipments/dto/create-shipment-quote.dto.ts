import { IsIn, IsLatitude, IsLongitude, IsOptional, IsString } from 'class-validator';

export class CreateShipmentQuoteDto {
  @IsLatitude()
  pickupLatitude: number;

  @IsLongitude()
  pickupLongitude: number;

  @IsLatitude()
  dropoffLatitude: number;

  @IsLongitude()
  dropoffLongitude: number;

  @IsIn(['SMALL', 'MEDIUM', 'LARGE'])
  packageSizeClass: string;

  @IsOptional()
  @IsString()
  promoCode?: string;
}
