import { IsString, Matches } from 'class-validator';

export class VerifyShipmentOtpDto {
  @IsString()
  @Matches(/^\d{6}$/, { message: 'OTP must be a 6-digit numeric string.' })
  code: string;
}
