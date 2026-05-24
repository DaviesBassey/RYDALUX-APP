import { IsOptional, IsString } from 'class-validator';

export class AccountDeletionRequestDto {
  @IsString()
  @IsOptional()
  reason?: string;
}
