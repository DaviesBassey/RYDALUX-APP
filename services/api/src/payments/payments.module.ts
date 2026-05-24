import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PaymentsController } from './payments.controller';
import { PaystackController } from './paystack.controller';
import { PaymentsService } from './payments.service';
import { PaystackService } from './paystack.service';
import { PrismaModule } from '../prisma/prisma.module';
import { IdempotencyModule } from '../idempotency/idempotency.module';

@Module({
  imports: [HttpModule, PrismaModule, IdempotencyModule],
  controllers: [PaymentsController, PaystackController],
  providers: [PaymentsService, PaystackService],
  exports: [PaymentsService, PaystackService],
})
export class PaymentsModule {}
