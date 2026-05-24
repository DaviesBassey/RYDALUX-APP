import { IsOptional, IsString } from 'class-validator';

export class ResolveSosEventDto {
  @IsString()
  @IsOptional()
  notes?: string;
}
