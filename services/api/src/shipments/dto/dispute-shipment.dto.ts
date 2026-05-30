import { IsString, MinLength } from 'class-validator';

export class DisputeShipmentDto {
  @IsString()
  @MinLength(5)
  reason: string;
}
