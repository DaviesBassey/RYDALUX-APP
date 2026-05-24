import { IsIn, IsNotEmpty, IsOptional, IsObject, IsString } from 'class-validator';

export class CreateDriverDocumentDto {
  @IsString()
  @IsNotEmpty()
  @IsIn([
    'PROFILE_PHOTO',
    'GOVERNMENT_ID',
    'NIN',
    'DRIVER_LICENSE',
    'PROOF_OF_ADDRESS',
    'EMERGENCY_CONTACT',
    'VEHICLE_REGISTRATION',
    'ROADWORTHINESS_CERTIFICATE',
    'INSURANCE_DOCUMENT',
    'VEHICLE_EXTERIOR_PHOTO',
    'VEHICLE_INTERIOR_PHOTO'
  ])
  documentType: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['DRIVER', 'VEHICLE'])
  scope: 'DRIVER' | 'VEHICLE';

  @IsString()
  @IsOptional()
  vehicleId?: string;

  @IsObject()
  @IsOptional()
  vehicleData?: {
    registrationNumber: string;
    make: string;
    model: string;
    year: number;
    color: string;
    capacity: number;
    vehicleType: string;
    vehicleCategory?: string;
  };

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
