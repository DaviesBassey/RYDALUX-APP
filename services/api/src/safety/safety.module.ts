import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SafetyService } from './safety.service';
import { SafetyController } from './safety.controller';
import { AdminSafetyController } from './admin-safety.controller';

@Module({
  imports: [PrismaModule],
  controllers: [SafetyController, AdminSafetyController],
  providers: [SafetyService],
  exports: [SafetyService],
})
export class SafetyModule {}
