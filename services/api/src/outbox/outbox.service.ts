import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';

export const OUTBOX_STATUS = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  PUBLISHED: 'PUBLISHED',
  FAILED: 'FAILED',
  DEAD_LETTER: 'DEAD_LETTER',
} as const;

export interface OutboxEventRecord {
  id: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: Prisma.JsonValue;
  status: string;
  attemptCount: number;
  lastError: string | null;
  createdAt: Date;
  publishedAt: Date | null;
  nextAttemptAt: Date | null;
}

export interface EnqueueOutboxEventInput {
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: Prisma.InputJsonValue;
}

type OutboxWriter = Prisma.TransactionClient | PrismaService;

interface ProcessResult {
  published: number;
  failed: number;
  deadLettered: number;
  skipped: number;
}

@Injectable()
export class OutboxService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxService.name);
  private readonly maxAttempts = Number(process.env.OUTBOX_MAX_ATTEMPTS ?? 5);
  private readonly baseBackoffMs = Number(process.env.OUTBOX_BASE_BACKOFF_MS ?? 1_000);
  private readonly maxBackoffMs = Number(process.env.OUTBOX_MAX_BACKOFF_MS ?? 60_000);
  private readonly processingLeaseMs = Number(process.env.OUTBOX_PROCESSING_LEASE_MS ?? 300_000);
  private timer: NodeJS.Timeout | null = null;
  private mockPublishFailure = false;

  public publishedEvents: OutboxEventRecord[] = [];

  constructor(
    private readonly prisma: PrismaService,
    @Inject('REDIS_CLIENT') private readonly redisClient: Redis
  ) {}

  onModuleInit() {
    if (process.env.NODE_ENV === 'test' || process.env.OUTBOX_SCHEDULER_DISABLED === 'true') {
      return;
    }

    this.timer = setInterval(() => {
      void this.processPendingEvents().catch((error) => {
        this.logger.error(`Outbox scheduler failed: ${(error as Error).message}`, (error as Error).stack);
      });
    }, 5_000);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async enqueue(tx: OutboxWriter, data: EnqueueOutboxEventInput) {
    return tx.outboxEvent.create({
      data: {
        aggregateType: data.aggregateType,
        aggregateId: data.aggregateId,
        eventType: data.eventType,
        payload: data.payload,
        status: OUTBOX_STATUS.PENDING,
        attemptCount: 0,
      },
    });
  }

  async create(tx: OutboxWriter, data: EnqueueOutboxEventInput) {
    return this.enqueue(tx, data);
  }

  async listPendingEvents(limit = 100): Promise<OutboxEventRecord[]> {
    const now = new Date();

    return this.prisma.outboxEvent.findMany({
      where: {
        OR: [
          { status: OUTBOX_STATUS.PENDING, nextAttemptAt: null },
          { status: OUTBOX_STATUS.PENDING, nextAttemptAt: { lte: now } },
          { status: OUTBOX_STATUS.FAILED, nextAttemptAt: null },
          { status: OUTBOX_STATUS.FAILED, nextAttemptAt: { lte: now } },
          { status: OUTBOX_STATUS.PROCESSING, nextAttemptAt: { lte: now } },
        ],
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }

  async markPublished(eventId: string) {
    return this.prisma.outboxEvent.updateMany({
      where: { id: eventId, status: OUTBOX_STATUS.PROCESSING },
      data: {
        status: OUTBOX_STATUS.PUBLISHED,
        publishedAt: new Date(),
        nextAttemptAt: null,
        lastError: null,
      },
    });
  }

  async markFailed(eventId: string, error: unknown, attemptCount?: number) {
    const message = this.errorMessage(error);
    const currentAttemptCount = attemptCount ?? (await this.getAttemptCount(eventId)) + 1;

    if (currentAttemptCount >= this.maxAttempts) {
      return this.markDeadLetter(eventId, message, currentAttemptCount);
    }

    return this.prisma.outboxEvent.update({
      where: { id: eventId },
      data: {
        status: OUTBOX_STATUS.FAILED,
        attemptCount: currentAttemptCount,
        lastError: message,
        nextAttemptAt: this.calculateNextAttemptAt(currentAttemptCount),
        publishedAt: null,
      },
    });
  }

  async markDeadLetter(eventId: string, error: unknown, attemptCount?: number) {
    return this.prisma.outboxEvent.update({
      where: { id: eventId },
      data: {
        status: OUTBOX_STATUS.DEAD_LETTER,
        attemptCount,
        lastError: this.errorMessage(error),
        nextAttemptAt: null,
        publishedAt: null,
      },
    });
  }

  setMockPublishFailure(fail: boolean) {
    this.mockPublishFailure = fail;
  }

  async publishEvent(event: OutboxEventRecord): Promise<void> {
    if (this.mockPublishFailure) {
      throw new Error('Simulated publishing failure');
    }

    if (!event.payload || typeof event.payload !== 'object' || Array.isArray(event.payload)) {
      throw new Error('Outbox event payload must be a JSON object');
    }

    if ('failPublish' in event.payload && event.payload.failPublish === true) {
      throw new Error('Simulated publishing failure');
    }

    this.publishedEvents.push(event);
    this.logger.log(`Publishing outbox event ${event.eventType} for ${event.aggregateType}:${event.aggregateId}`);
    
    if (this.redisClient && typeof this.redisClient.publish === 'function') {
      await this.redisClient.publish('rydalux-domain-events', JSON.stringify(event));
    }
  }

  async processPendingEvents(limit = 100): Promise<ProcessResult> {
    const result: ProcessResult = { published: 0, failed: 0, deadLettered: 0, skipped: 0 };
    const events = await this.listPendingEvents(limit);

    for (const event of events) {
      const status = await this.processEvent(event);
      result[status] += 1;
    }

    return result;
  }

  private async processEvent(event: OutboxEventRecord): Promise<keyof ProcessResult> {
    if (event.status === OUTBOX_STATUS.PUBLISHED || event.status === OUTBOX_STATUS.DEAD_LETTER) {
      return 'skipped';
    }

    const attemptCount = event.attemptCount + 1;
    const claimed = await this.prisma.outboxEvent.updateMany({
      where: {
        id: event.id,
        status: event.status,
        attemptCount: event.attemptCount,
      },
      data: {
        status: OUTBOX_STATUS.PROCESSING,
        attemptCount,
        lastError: null,
        nextAttemptAt: new Date(Date.now() + this.processingLeaseMs),
      },
    });

    if (claimed.count === 0) {
      return 'skipped';
    }

    try {
      await this.publishEvent({ ...event, status: OUTBOX_STATUS.PROCESSING, attemptCount });
      await this.markPublished(event.id);
      return 'published';
    } catch (error) {
      await this.markFailed(event.id, error, attemptCount);
      return attemptCount >= this.maxAttempts ? 'deadLettered' : 'failed';
    }
  }

  private async getAttemptCount(eventId: string): Promise<number> {
    const event = await this.prisma.outboxEvent.findUnique({
      where: { id: eventId },
      select: { attemptCount: true },
    });

    return event?.attemptCount ?? 0;
  }

  private calculateNextAttemptAt(attemptCount: number): Date {
    const delay = Math.min(this.baseBackoffMs * 2 ** Math.max(attemptCount - 1, 0), this.maxBackoffMs);
    return new Date(Date.now() + delay);
  }

  private errorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }
    return String(error || 'Unknown outbox publishing error');
  }
}
