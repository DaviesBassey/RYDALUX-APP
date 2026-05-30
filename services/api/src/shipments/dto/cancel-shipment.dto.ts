import { IsOptional, IsString } from 'class-validator';

export class CancelShipmentDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
