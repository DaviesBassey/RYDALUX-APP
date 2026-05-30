import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { ShipmentPhotoType } from '@prisma/client';

export class ShipmentPhotoUploadRequestDto {
  @IsEnum(ShipmentPhotoType)
  photoType: ShipmentPhotoType;

  @IsOptional()
  @IsString()
  mimeType?: string;

  @IsOptional()
  @IsNumber()
  fileSize?: number;
}
