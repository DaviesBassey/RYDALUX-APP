import { IsOptional, IsString, MaxLength } from 'class-validator';

export class DeadLetterProviderEventDto {
  @IsString()
  @IsOptional()
  @MaxLength(500)
  reason?: string;
}
