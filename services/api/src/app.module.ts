import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RequestLoggingMiddleware } from './core/request-logging.middleware';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DriversModule } from './drivers/drivers.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { TripsModule } from './trips/trips.module';
import { PaymentsModule } from './payments/payments.module';
import { SafetyModule } from './safety/safety.module';
import { AdminModule } from './admin/admin.module';
import { DevModule } from './dev/dev.module';

const devModules = process.env.NODE_ENV === 'development' ? [DevModule] : [];

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env'], expandVariables: true }),
    ThrottlerModule.forRoot({ ttl: 60, limit: 20 }),
    PrismaModule,
    AuthModule,
    UsersModule,
    DriversModule,
    VehiclesModule,
    TripsModule,
    PaymentsModule,
    SafetyModule,
    AdminModule,
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
