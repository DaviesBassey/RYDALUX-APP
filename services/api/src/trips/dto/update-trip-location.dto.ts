import { IsLatitude, IsLongitude } from 'class-validator';

export class UpdateTripLocationDto {
  @IsLatitude()
  latitude: number;

  @IsLongitude()
  longitude: number;
}
