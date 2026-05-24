import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

export class OtpRequestDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[0-9]{8,15}$/)
  phone: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  fingerprint: string;

  @IsString()
  deviceName?: string;
}
