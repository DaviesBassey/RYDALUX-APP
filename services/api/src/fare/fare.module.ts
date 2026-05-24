import { Module } from '@nestjs/common';
import { FareService } from './fare.service';
import { FareController } from './fare.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [FareService],
  controllers: [FareController],
  exports: [FareService]
})
export class FareModule {}
