import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SupportService } from './support.service';
import { SupportController } from './support.controller';
import { SupportAdminController } from './support-admin.controller';

@Module({
  imports: [PrismaModule],
  controllers: [SupportController, SupportAdminController],
  providers: [SupportService],
  exports: [SupportService],
})
export class SupportModule {}
