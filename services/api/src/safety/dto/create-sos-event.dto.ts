import { IsString, IsNumber, IsOptional, IsUUID, Min, Max } from 'class-validator';

export class CreateSosEventDto {
  @IsString()
  type: string;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @IsOptional()
  @IsUUID()
  tripId?: string;
}
