import { IsOptional, IsString } from 'class-validator';

export class DispatchDecisionDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
