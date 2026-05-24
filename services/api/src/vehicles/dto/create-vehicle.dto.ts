import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateVehicleDto {
  @IsString()
  @IsNotEmpty()
  registrationNumber: string;

  @IsString()
  @IsNotEmpty()
  make: string;

  @IsString()
  @IsNotEmpty()
  model: string;

  @IsInt()
  year: number;

  @IsString()
  @IsNotEmpty()
  color: string;

  @IsInt()
  capacity: number;

  @IsString()
  @IsOptional()
  vehicleCategory?: string;

  @IsString()
  @IsNotEmpty()
  vehicleType: string;
}
