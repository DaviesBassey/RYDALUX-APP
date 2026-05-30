import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { FareModule } from '../fare/fare.module';
import { TripsModule } from '../trips/trips.module';
import { PaymentsModule } from '../payments/payments.module';
import { RiderShipmentsController } from './shipments.rider.controller';
import { DriverShipmentsController } from './shipments.driver.controller';
import { AdminShipmentsController } from './shipments.admin.controller';
import { ShipmentsService } from './shipments.service';
import { ShipmentOtpService } from './shipment-otp.service';
import { ShipmentQuoteService } from './shipment-quote.service';

@Module({
  imports: [PrismaModule, FareModule, TripsModule, PaymentsModule],
  controllers: [
    RiderShipmentsController,
    DriverShipmentsController,
    AdminShipmentsController,
  ],
  providers: [ShipmentsService, ShipmentOtpService, ShipmentQuoteService],
  exports: [ShipmentsService, ShipmentOtpService, ShipmentQuoteService],
})
export class ShipmentsModule {}
