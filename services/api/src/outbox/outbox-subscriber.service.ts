import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class OutboxSubscriberService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxSubscriberService.name);
  private subClient: Redis;

  constructor(private readonly configService: ConfigService) {
    const redisUrl = this.configService.get<string>('redisUrl') ?? 'redis://localhost:6379';
    this.subClient = new Redis(redisUrl);
  }

  async onModuleInit() {
    if (process.env.NODE_ENV === 'test') {
      // Avoid starting real subscriptions during local testing
      return;
    }

    try {
      await this.subClient.subscribe('rydalux-domain-events');
      this.logger.log('Subscribed to Redis channel: rydalux-domain-events');

      this.subClient.on('message', (channel, message) => {
        if (channel === 'rydalux-domain-events') {
          this.handleEvent(message);
        }
      });
    } catch (error) {
      this.logger.error(`Failed to subscribe to Redis channel: ${(error as Error).message}`, (error as Error).stack);
    }
  }

  async onModuleDestroy() {
    try {
      await this.subClient.quit();
      this.logger.log('Disconnected subscriber Redis client');
    } catch (error) {
      this.logger.error(`Failed to disconnect subscriber Redis client: ${(error as Error).message}`);
    }
  }

  private handleEvent(message: string) {
    try {
      const event = JSON.parse(message);
      this.logger.log(
        `Received event [${event.eventType}] for [${event.aggregateType}:${event.aggregateId}] from outbox pub/sub`
      );
      // In the future, this can dispatch to dynamic local EventEmitters or other downstream logic.
    } catch (error) {
      this.logger.error(`Failed to parse event message: ${(error as Error).message}`);
    }
  }
}
