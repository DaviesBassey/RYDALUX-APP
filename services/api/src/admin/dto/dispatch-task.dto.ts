import { IsNotEmpty, IsString } from 'class-validator';

export class DispatchTaskDto {
  @IsString()
  @IsNotEmpty()
  tripId: string;

  @IsString()
  @IsNotEmpty()
  driverId: string;
}
