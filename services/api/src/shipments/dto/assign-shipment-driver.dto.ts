import { IsUUID } from 'class-validator';

export class AssignShipmentDriverDto {
  @IsUUID()
  driverId: string;
}
