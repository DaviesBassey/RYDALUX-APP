import { IsString, IsEnum, IsOptional, IsUUID, MinLength } from 'class-validator';
import { SupportTicketType, SupportTicketPriority } from '@prisma/client';

export class CreateSupportTicketDto {
  @IsString()
  @MinLength(5)
  title: string;

  @IsString()
  @MinLength(10)
  description: string;

  @IsEnum(SupportTicketType)
  type: SupportTicketType;

  @IsOptional()
  @IsEnum(SupportTicketPriority)
  priority?: SupportTicketPriority;

  @IsOptional()
  @IsUUID()
  tripId?: string;

  @IsOptional()
  @IsUUID()
  paymentId?: string;

  @IsOptional()
  @IsUUID()
  payoutId?: string;

  @IsOptional()
  @IsUUID()
  sosEventId?: string;

  @IsOptional()
  @IsUUID()
  incidentReportId?: string;

  @IsOptional()
  @IsUUID()
  vehicleId?: string;
}
