import { IsOptional, IsString, IsUrl } from 'class-validator';

export class ShipmentProofDto {
  @IsUrl()
  url: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
