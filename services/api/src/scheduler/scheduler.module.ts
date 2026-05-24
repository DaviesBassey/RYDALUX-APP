import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PaymentsModule } from '../payments/payments.module';
import { FinanceSchedulerService } from './finance-scheduler.service';

@Module({
  imports: [PrismaModule, PaymentsModule],
  providers: [FinanceSchedulerService],
  exports: [FinanceSchedulerService],
})
export class SchedulerModule {}
