import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { FareModule } from '../fare/fare.module';
import { PaymentsModule } from '../payments/payments.module';
import { TripsController } from './trips.controller';
import { TripsGateway } from './trips.gateway';
import { TripsService } from './trips.service';

@Module({
  imports: [PrismaModule, RedisModule, FareModule, PaymentsModule],
  controllers: [TripsController],
  providers: [TripsService, TripsGateway]
})
export class TripsModule {}
