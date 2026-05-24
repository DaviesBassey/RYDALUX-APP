import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export enum SosType {
  PANIC = 'PANIC',
  SAFETY_CHECK = 'SAFETY_CHECK',
  MEDICAL = 'MEDICAL',
}

export class TriggerSosDto {
  @IsEnum(SosType)
  @IsNotEmpty()
  type: SosType;

  @IsNumber()
  @IsNotEmpty()
  latitude: number;

  @IsNumber()
  @IsNotEmpty()
  longitude: number;

  @IsString()
  @IsOptional()
  notes?: string;
}
