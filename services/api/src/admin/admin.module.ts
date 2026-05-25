import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PaymentsModule } from '../payments/payments.module';
import { IdempotencyModule } from '../idempotency/idempotency.module';
import { SchedulerModule } from '../scheduler/scheduler.module';
import { ShipmentsModule } from '../shipments/shipments.module';

@Module({
  imports: [PrismaModule, PaymentsModule, IdempotencyModule, SchedulerModule, ShipmentsModule],
  providers: [AdminService],
  controllers: [AdminController]
})
export class AdminModule {}
