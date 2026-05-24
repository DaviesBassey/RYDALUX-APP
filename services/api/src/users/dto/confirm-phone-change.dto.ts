import { IsNotEmpty, IsString } from 'class-validator';

export class ConfirmPhoneChangeDto {
  @IsString()
  @IsNotEmpty()
  newPhone: string;

  @IsString()
  @IsNotEmpty()
  code: string;
}
