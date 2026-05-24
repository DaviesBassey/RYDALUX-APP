import { ConflictException } from '@nestjs/common';
import { IdempotencyService } from '../src/idempotency/idempotency.service';

describe('IdempotencyService', () => {
  const mockPrisma: any = {
    idempotencyKey: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    providerEvent: {
      upsert: jest.fn(),
    },
  };
  let service: IdempotencyService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new IdempotencyService(mockPrisma as any);
  });

  const input = {
    key: 'idem-1',
    scope: 'payments:mock:initiate',
    method: 'POST',
    endpoint: '/payments/mock/initiate',
    actorId: 'user-1',
    body: { tripId: 'trip-1' },
  };

  it('stores and returns the first successful response', async () => {
    mockPrisma.idempotencyKey.create.mockResolvedValue({ id: 'idk-1' });
    mockPrisma.idempotencyKey.update.mockResolvedValue({});

    const response = await service.run(input, async () => ({ ok: true, id: 'pay-1' }));

    expect(response).toEqual({ ok: true, id: 'pay-1' });
    expect(mockPrisma.idempotencyKey.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          key: 'idem-1',
          scope: 'payments:mock:initiate',
          status: 'IN_PROGRESS',
        }),
      })
    );
    expect(mockPrisma.idempotencyKey.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'idk-1' },
        data: expect.objectContaining({
          status: 'COMPLETED',
          responseBody: { ok: true, id: 'pay-1' },
        }),
      })
    );
  });

  it('replays a completed response for the same key and same fingerprint', async () => {
    mockPrisma.idempotencyKey.create.mockRejectedValue({ code: 'P2002' });
    mockPrisma.idempotencyKey.findUnique.mockResolvedValue({
      id: 'idk-1',
      requestHash: expect.anything(),
      status: 'COMPLETED',
      responseBody: { ok: true, id: 'pay-1' },
    });

    const firstHash = (service as any).hashRequest(input);
    mockPrisma.idempotencyKey.findUnique.mockResolvedValueOnce({
      id: 'idk-1',
      requestHash: firstHash,
      status: 'COMPLETED',
      responseBody: { ok: true, id: 'pay-1' },
    });

    const handler = jest.fn();
    const response = await service.run(input, handler);

    expect(response).toEqual({ ok: true, id: 'pay-1' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('rejects same key with a different request fingerprint', async () => {
    mockPrisma.idempotencyKey.create.mockRejectedValue({ code: 'P2002' });
    mockPrisma.idempotencyKey.findUnique.mockResolvedValue({
      id: 'idk-1',
      requestHash: 'different-hash',
      status: 'COMPLETED',
      responseBody: { ok: true },
    });

    await expect(service.run(input, async () => ({ ok: false }))).rejects.toThrow(ConflictException);
  });

  it('rejects duplicate in-flight requests', async () => {
    const requestHash = (service as any).hashRequest(input);
    mockPrisma.idempotencyKey.create.mockRejectedValue({ code: 'P2002' });
    mockPrisma.idempotencyKey.findUnique.mockResolvedValue({
      id: 'idk-1',
      requestHash,
      status: 'IN_PROGRESS',
      lockedUntil: new Date(Date.now() + 30_000),
    });

    await expect(service.run(input, async () => ({ ok: false }))).rejects.toThrow(ConflictException);
  });

  it('marks failures as retryable instead of keeping the key locked forever', async () => {
    mockPrisma.idempotencyKey.create.mockResolvedValue({ id: 'idk-1' });
    mockPrisma.idempotencyKey.update.mockResolvedValue({});

    await expect(service.run(input, async () => {
      throw new Error('boom');
    })).rejects.toThrow('boom');

    expect(mockPrisma.idempotencyKey.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'idk-1' },
        data: expect.objectContaining({
          status: 'FAILED',
          lockedUntil: null,
        }),
      })
    );
  });

  it('records provider events with provider-level dedupe', async () => {
    mockPrisma.providerEvent.upsert.mockResolvedValue({ id: 'evt-1' });

    await service.recordProviderEvent({
      provider: 'paystack',
      eventType: 'charge.success',
      providerEventId: 'evt-provider-1',
      reference: 'RYD-PAY-1',
      payload: { data: { reference: 'RYD-PAY-1' } },
    });

    expect(mockPrisma.providerEvent.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          provider_providerEventId: {
            provider: 'paystack',
            providerEventId: 'evt-provider-1',
          },
        },
      })
    );
  });
});
