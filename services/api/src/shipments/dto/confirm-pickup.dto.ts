import { IsString } from 'class-validator';

export class ConfirmPickupDto {
  @IsString()
  pin: string;
}
