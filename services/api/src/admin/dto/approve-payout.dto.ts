import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ApprovePayoutDto {
  @IsString()
  @IsNotEmpty()
  payoutId: string;

  @IsString()
  @IsOptional()
  comment?: string;
}
