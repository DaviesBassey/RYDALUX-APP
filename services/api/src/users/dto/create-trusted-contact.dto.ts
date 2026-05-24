import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateTrustedContactDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsOptional()
  relationship?: string;
}
