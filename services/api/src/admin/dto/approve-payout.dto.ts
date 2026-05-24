import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class ApprovePayoutDto {
  @IsUUID()
  @IsNotEmpty()
  payoutId: string;

  @IsString()
  @IsOptional()
  comment?: string;
}
