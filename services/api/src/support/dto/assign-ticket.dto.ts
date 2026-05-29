import { IsUUID, IsOptional, IsString } from 'class-validator';

export class AssignTicketDto {
  @IsUUID()
  adminUserId: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
