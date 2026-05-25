import { IsEnum, IsOptional, IsString } from 'class-validator';

export class AdminShipmentStatusDto {
  @IsEnum(['CANCELLED', 'FAILED'])
  status: 'CANCELLED' | 'FAILED';

  @IsOptional()
  @IsString()
  reason?: string;
}

export class AdminResolveShipmentDto {
  @IsString()
  resolution: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
