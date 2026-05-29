import { IsEnum, IsOptional, IsString } from 'class-validator';
import { SupportTicketPriority } from '@prisma/client';

export class ChangeTicketPriorityDto {
  @IsEnum(SupportTicketPriority)
  priority: SupportTicketPriority;

  @IsOptional()
  @IsString()
  reason?: string;
}
