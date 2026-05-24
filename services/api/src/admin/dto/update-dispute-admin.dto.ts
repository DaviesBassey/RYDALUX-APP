import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

const DISPUTE_ADMIN_STATUSES = ['OPEN', 'UNDER_REVIEW', 'AWAITING_PROVIDER', 'RESOLVED', 'CLOSED'];
const DISPUTE_RESOLUTIONS = ['WON', 'LOST', 'CLOSED'];

export class UpdateDisputeAdminDto {
  @IsString()
  @IsOptional()
  @IsIn(DISPUTE_ADMIN_STATUSES)
  adminStatus?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  adminNotes?: string;
}

export class ResolveDisputeDto {
  @IsString()
  @IsIn(DISPUTE_RESOLUTIONS)
  resolution: 'WON' | 'LOST' | 'CLOSED';

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;
}
