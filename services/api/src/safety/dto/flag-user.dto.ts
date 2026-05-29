import { IsString, IsUUID, IsOptional } from 'class-validator';

export class FlagUserDto {
  @IsUUID()
  userId: string;

  @IsString()
  flagType: string;

  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  severity?: string;
}
