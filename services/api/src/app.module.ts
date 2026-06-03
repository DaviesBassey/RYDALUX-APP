import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RequestLoggingMiddleware } from './core/request-logging.middleware';
import { SmsModule } from './sms/sms.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DriversModule } from './drivers/drivers.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { TripsModule } from './trips/trips.module';
import { PaymentsModule } from './payments/payments.module';
import { SafetyModule } from './safety/safety.module';
import { AdminModule } from './admin/admin.module';
import { SupportModule } from './support/support.module';
import { DevModule } from './dev/dev.module';
import { IdempotencyModule } from './idempotency/idempotency.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { ShipmentsModule } from './shipments/shipments.module';
import { OutboxModule } from './outbox/outbox.module';
import configuration from './config/configuration';

const devModules = process.env.NODE_ENV === 'development' ? [DevModule] : [];

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env'], expandVariables: true, load: [configuration] }),
    ThrottlerModule.forRoot({ ttl: 60, limit: 20 }),
    SmsModule,
    PrismaModule,
    AuthModule,
    UsersModule,
    DriversModule,
    VehiclesModule,
    TripsModule,
    IdempotencyModule,
    PaymentsModule,
    SchedulerModule,
    SafetyModule,
    AdminModule,
    SupportModule,
    ShipmentsModule,
    OutboxModule,
    ...devModules,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggingMiddleware).forRoutes('*');
  }
}
