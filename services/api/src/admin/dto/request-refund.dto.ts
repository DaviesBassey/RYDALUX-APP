import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class RequestRefundDto {
  @IsUUID()
  paymentId: string;

  @IsString()
  @IsOptional()
  @MaxLength(240)
  reason?: string;
}
