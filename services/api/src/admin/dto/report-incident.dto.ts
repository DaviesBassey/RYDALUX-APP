import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ReportIncidentDto {
  @IsString()
  @IsNotEmpty()
  tripId: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsOptional()
  severity?: string;
}
