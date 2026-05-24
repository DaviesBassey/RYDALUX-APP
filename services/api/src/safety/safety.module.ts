import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SafetyService } from './safety.service';
import { SafetyController } from './safety.controller';

@Module({
  imports: [PrismaModule],
  providers: [SafetyService],
  controllers: [SafetyController],
})
export class SafetyModule {}
