import { IsEnum, IsOptional, IsString, IsUrl } from 'class-validator';

export class SubmitProofDto {
  @IsUrl()
  url: string;

  @IsOptional()
  @IsEnum(['PHOTO_URL'])
  proofType?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
