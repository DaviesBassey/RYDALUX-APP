import { IsString, IsUUID } from 'class-validator';

export class CreateTripDto {
  @IsUUID()
  fareQuoteId: string;

  @IsString()
  pickupAddress: string;

  @IsString()
  dropoffAddress: string;
}
