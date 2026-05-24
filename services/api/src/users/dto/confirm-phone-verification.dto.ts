import { IsNotEmpty, IsString } from 'class-validator';

export class ConfirmPhoneVerificationDto {
  @IsString()
  @IsNotEmpty()
  code: string;
}
