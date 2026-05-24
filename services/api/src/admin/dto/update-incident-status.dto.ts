import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class UpdateIncidentStatusDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED'])
  status: string;
}
