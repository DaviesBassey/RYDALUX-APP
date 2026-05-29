import { IsString, IsOptional } from 'class-validator';

export class AddTrustedContactDto {
  @IsString()
  name: string;

  @IsString()
  phone: string;

  @IsOptional()
  @IsString()
  relationship?: string;
}
