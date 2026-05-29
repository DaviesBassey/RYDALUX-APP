import { IsEnum, IsOptional, IsString } from 'class-validator';
import { SupportStatus } from '@prisma/client';

export class ChangeTicketStatusDto {
  @IsEnum(SupportStatus)
  status: SupportStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}
