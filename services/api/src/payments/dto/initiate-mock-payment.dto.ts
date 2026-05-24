import { IsUUID } from 'class-validator';

export class InitiateMockPaymentDto {
  @IsUUID()
  tripId: string;
}
