import { IsIn, IsOptional, IsString } from 'class-validator';

export class ReviewVehicleDto {
  @IsIn(['approve', 'reject', 'suspend', 'reactivate'])
  action: 'approve' | 'reject' | 'suspend' | 'reactivate';

  @IsString()
  @IsOptional()
  rejectionReason?: string;

  @IsString()
  @IsOptional()
  expiresAt?: string;
}
