import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { OutboxService } from './outbox.service';
import { OutboxSubscriberService } from './outbox-subscriber.service';

@Global()
@Module({
  imports: [PrismaModule, RedisModule],
  providers: [OutboxService, OutboxSubscriberService],
  exports: [OutboxService, OutboxSubscriberService],
})
export class OutboxModule {}
