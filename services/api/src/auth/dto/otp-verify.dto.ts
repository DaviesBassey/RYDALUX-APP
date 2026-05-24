import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

export class OtpVerifyDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[0-9]{8,15}$/)
  phone: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9]{4,6}$/)
  code: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  fingerprint: string;

  @IsString()
  deviceName?: string;
}
