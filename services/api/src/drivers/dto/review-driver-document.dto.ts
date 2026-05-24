import { IsIn, IsOptional, IsString } from 'class-validator';

export class ReviewDriverDocumentDto {
  @IsIn(['approve', 'reject'])
  action: 'approve' | 'reject';

  @IsString()
  @IsOptional()
  expiresAt?: string;

  @IsString()
  @IsOptional()
  rejectionReason?: string;
}
