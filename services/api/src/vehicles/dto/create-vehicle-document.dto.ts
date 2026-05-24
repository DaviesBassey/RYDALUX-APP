import { IsIn, IsNotEmpty, IsOptional, IsObject, IsString } from 'class-validator';

export class CreateVehicleDocumentDto {
  @IsString()
  @IsNotEmpty()
  @IsIn([
    'VEHICLE_REGISTRATION',
    'ROADWORTHINESS_CERTIFICATE',
    'INSURANCE_DOCUMENT',
    'VEHICLE_EXTERIOR_PHOTO',
    'VEHICLE_INTERIOR_PHOTO'
  ])
  documentType: string;

  @IsString()
  @IsOptional()
  issuedAt?: string;

  @IsString()
  @IsOptional()
  expiresAt?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
