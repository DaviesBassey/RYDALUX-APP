import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class PaymentMethodDto {
  @IsString()
  @IsNotEmpty()
  provider: string;

  @IsObject()
  @IsNotEmpty()
  data: Record<string, unknown>;

  @IsString()
  @IsOptional()
  nickname?: string;
}
