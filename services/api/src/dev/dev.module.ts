import { Module } from '@nestjs/common';
import { DevController } from './dev.controller';
import { DevService } from './dev.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DevController],
  providers: [DevService],
})
export class DevModule {}
