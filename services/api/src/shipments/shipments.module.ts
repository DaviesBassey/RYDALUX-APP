import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { FareModule } from '../fare/fare.module';
import { TripsModule } from '../trips/trips.module';
import { PaymentsModule } from '../payments/payments.module';
import { ShipmentsController } from './shipments.controller';
import { ShipmentsService } from './shipments.service';
import { ShipmentOtpService } from './shipment-otp.service';
import { ShipmentQuoteService } from './shipment-quote.service';

@Module({
  imports: [PrismaModule, FareModule, TripsModule, PaymentsModule],
  controllers: [ShipmentsController],
  providers: [ShipmentsService, ShipmentOtpService, ShipmentQuoteService],
  exports: [ShipmentsService, ShipmentOtpService, ShipmentQuoteService],
})
export class ShipmentsModule {}
