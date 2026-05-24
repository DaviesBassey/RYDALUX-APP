import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ApproveKycDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsOptional()
  comment?: string;
}
