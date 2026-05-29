import { IsString, IsUUID, IsOptional } from 'class-validator';

export class CreateIncidentReportDto {
  @IsUUID()
  tripId: string;

  @IsString()
  type: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  severity?: string;
}
