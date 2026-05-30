import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { ShipmentStatus } from '@prisma/client';
import { Type } from 'class-transformer';

export class ShipmentListQueryDto {
  @IsOptional()
  @IsEnum(ShipmentStatus)
  status?: ShipmentStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}
