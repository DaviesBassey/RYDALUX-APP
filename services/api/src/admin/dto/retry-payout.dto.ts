import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RetryPayoutDto {
  @IsString()
  @IsOptional()
  @MaxLength(240)
  comment?: string;
}
