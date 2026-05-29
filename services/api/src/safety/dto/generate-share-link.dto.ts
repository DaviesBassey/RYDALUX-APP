import { IsUUID, IsOptional, IsNumber, Min } from 'class-validator';

export class GenerateShareLinkDto {
  @IsUUID()
  tripId: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  expirationMinutes?: number;
}
