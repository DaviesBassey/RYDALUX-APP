import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  live() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  async ready() {
    const checks: Record<string, { status: string; responseTimeMs: number }> = {};

    // Database connectivity check
    const dbStart = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = { status: 'ok', responseTimeMs: Date.now() - dbStart };
    } catch {
      checks.database = { status: 'error', responseTimeMs: Date.now() - dbStart };
    }

    // Redis connectivity check
    const redisStart = Date.now();
    try {
      await this.redis.ping();
      checks.redis = { status: 'ok', responseTimeMs: Date.now() - redisStart };
    } catch {
      checks.redis = { status: 'error', responseTimeMs: Date.now() - redisStart };
    }

    const allOk = Object.values(checks).every((c) => c.status === 'ok');

    return {
      status: allOk ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      checks,
    };
  }
}
