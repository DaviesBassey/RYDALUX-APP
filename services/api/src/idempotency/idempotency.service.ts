import { ConflictException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { createHash } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;
const DEFAULT_LOCK_MS = 60 * 1000;

export interface IdempotencyRequestInput {
  key?: string | string[];
  scope: string;
  method: string;
  endpoint: string;
  actorId?: string | null;
  body?: unknown;
  ttlMs?: number;
  lockMs?: number;
}

interface ReservedIdempotency {
  id: string;
  requestHash: string;
}

@Injectable()
export class IdempotencyService {
  constructor(private readonly prisma: PrismaService) {}

  getHeaderValue(value: string | string[] | undefined): string | undefined {
    if (Array.isArray(value)) return value[0];
    return value;
  }

  async run<T>(input: IdempotencyRequestInput, handler: () => Promise<T>): Promise<T> {
    const key = this.getHeaderValue(input.key);
    if (!key) {
      return handler();
    }

    const requestHash = this.hashRequest(input);
    const reserved = await this.reserveKey(input, key, requestHash);
    if ('replay' in reserved) {
      return reserved.replay as T;
    }

    try {
      const response = await handler();
      await this.markCompleted(reserved.id, response);
      return response;
    } catch (error) {
      await this.markFailed(reserved.id, error);
      throw error;
    }
  }

  hashProviderPayload(payload: unknown): string {
    return createHash('sha256').update(this.stableStringify(payload)).digest('hex');
  }

  async recordProviderEvent(input: {
    provider: string;
    eventType: string;
    providerEventId: string;
    reference?: string | null;
    payload?: unknown;
  }) {
    const payloadHash = this.hashProviderPayload(input.payload ?? {});
    return this.prisma.providerEvent.upsert({
      where: {
        provider_providerEventId: {
          provider: input.provider,
          providerEventId: input.providerEventId,
        },
      },
      update: {},
      create: {
        provider: input.provider,
        eventType: input.eventType,
        providerEventId: input.providerEventId,
        reference: input.reference ?? null,
        payloadHash,
        payload: input.payload as any,
      },
    });
  }

  private hashRequest(input: IdempotencyRequestInput): string {
    return createHash('sha256')
      .update(this.stableStringify({
        actorId: input.actorId ?? null,
        body: input.body ?? null,
        endpoint: input.endpoint,
        method: input.method.toUpperCase(),
        scope: input.scope,
      }))
      .digest('hex');
  }

  private async reserveKey(
    input: IdempotencyRequestInput,
    key: string,
    requestHash: string
  ): Promise<ReservedIdempotency | { replay: unknown }> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (input.ttlMs ?? DEFAULT_TTL_MS));
    const lockedUntil = new Date(now.getTime() + (input.lockMs ?? DEFAULT_LOCK_MS));

    try {
      const created = await this.prisma.idempotencyKey.create({
        data: {
          key,
          scope: input.scope,
          method: input.method.toUpperCase(),
          endpoint: input.endpoint,
          actorId: input.actorId ?? null,
          requestHash,
          status: 'IN_PROGRESS',
          lockedUntil,
          expiresAt,
        },
      });
      return { id: created.id, requestHash };
    } catch (error) {
      if (!this.isUniqueConflict(error)) throw error;
    }

    const existing = await this.prisma.idempotencyKey.findUnique({
      where: { scope_key: { scope: input.scope, key } },
    });
    if (!existing) {
      throw new InternalServerErrorException('Could not reserve idempotency key.');
    }
    if (existing.requestHash !== requestHash) {
      throw new ConflictException('Idempotency key was already used with a different request.');
    }
    if (existing.status === 'COMPLETED') {
      return { replay: existing.responseBody };
    }
    if (existing.status === 'IN_PROGRESS' && existing.lockedUntil && existing.lockedUntil > now) {
      throw new ConflictException('Request with this idempotency key is already in progress.');
    }

    const updated = await this.prisma.idempotencyKey.update({
      where: { id: existing.id },
      data: {
        status: 'IN_PROGRESS',
        responseStatus: null,
        responseBody: Prisma.JsonNull,
        errorBody: Prisma.JsonNull,
        lockedUntil,
        expiresAt,
      },
    });

    return { id: updated.id, requestHash };
  }

  private async markCompleted(id: string, response: unknown) {
    await this.prisma.idempotencyKey.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        responseStatus: 200,
        responseBody: this.toJsonValue(response) as any,
        errorBody: Prisma.JsonNull,
        lockedUntil: null,
      },
    });
  }

  private async markFailed(id: string, error: unknown) {
    await this.prisma.idempotencyKey.update({
      where: { id },
      data: {
        status: 'FAILED',
        responseStatus: this.errorStatus(error),
        responseBody: Prisma.JsonNull,
        errorBody: this.toJsonValue(this.serializeError(error)) as any,
        lockedUntil: null,
        expiresAt: new Date(),
      },
    });
  }

  private errorStatus(error: any): number {
    return typeof error?.getStatus === 'function' ? error.getStatus() : 500;
  }

  private serializeError(error: any) {
    return {
      message: error?.message ?? 'Unknown error',
      statusCode: this.errorStatus(error),
    };
  }

  private isUniqueConflict(error: any): boolean {
    return error?.code === 'P2002';
  }

  private stableStringify(value: unknown): string {
    return JSON.stringify(this.sortValue(value));
  }

  private toJsonValue(value: unknown): unknown {
    return JSON.parse(JSON.stringify(value));
  }

  private sortValue(value: any): any {
    if (Array.isArray(value)) {
      return value.map((item) => this.sortValue(item));
    }
    if (value && typeof value === 'object' && !(value instanceof Date)) {
      return Object.keys(value).sort().reduce((acc: Record<string, unknown>, key) => {
        acc[key] = this.sortValue(value[key]);
        return acc;
      }, {});
    }
    return value;
  }
}
