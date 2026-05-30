import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { SupportTicketPriority } from '@prisma/client';

export class CreateShipmentSupportTicketDto {
  @IsString()
  @MinLength(5)
  title: string;

  @IsString()
  @MinLength(10)
  description: string;

  @IsOptional()
  @IsEnum(SupportTicketPriority)
  priority?: SupportTicketPriority = SupportTicketPriority.MEDIUM;
}
