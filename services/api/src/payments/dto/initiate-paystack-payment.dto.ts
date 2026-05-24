import { IsUUID } from 'class-validator';

export class InitiatePaystackPaymentDto {
  @IsUUID()
  tripId: string;
}
