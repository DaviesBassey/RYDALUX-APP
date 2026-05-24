import { Global, Module, Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisClientService extends Redis implements OnModuleDestroy {
  constructor(config: ConfigService) {
    super(config.get<string>('redisUrl') ?? 'redis://localhost:6379');
  }

  async onModuleDestroy() {
    await this.quit();
  }
}

@Global()
@Module({
  providers: [
    RedisClientService,
    {
      provide: 'REDIS_CLIENT',
      useExisting: RedisClientService
    }
  ],
  exports: ['REDIS_CLIENT']
})
export class RedisModule {}
