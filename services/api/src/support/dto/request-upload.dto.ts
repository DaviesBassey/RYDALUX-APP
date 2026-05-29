import { IsString, IsNumber, Max } from 'class-validator';

export class RequestUploadDto {
  @IsString()
  fileName: string;

  @IsNumber()
  @Max(10 * 1024 * 1024) // 10 MB max
  fileSize: number;

  @IsString()
  mimeType: string;
}
