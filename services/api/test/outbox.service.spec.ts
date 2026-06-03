import { OUTBOX_STATUS, OutboxEventRecord, OutboxService } from '../src/outbox/outbox.service';

describe('OutboxService', () => {
  let prisma: any;
  let service: OutboxService;

  const pendingEvent = (overrides: Partial<OutboxEventRecord> = {}): OutboxEventRecord => ({
    id: 'event-1',
    aggregateType: 'SUPPORT_TICKET',
    aggregateId: 'ticket-1',
    eventType: 'support.updated',
    payload: { action: 'STATUS_CHANGED' },
    status: OUTBOX_STATUS.PENDING,
    attemptCount: 0,
    lastError: null,
    createdAt: new Date('2026-06-03T00:00:00.000Z'),
    publishedAt: null,
    nextAttemptAt: null,
    ...overrides,
  });

  beforeEach(() => {
    prisma = {
      outboxEvent: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    service = new OutboxService(prisma);
    service.publishedEvents = [];
  });

  it('enqueue creates a pending event inside the provided transaction', async () => {
    const tx = {
      outboxEvent: {
        create: jest.fn().mockResolvedValue({ id: 'event-1' }),
      },
    };

    await service.enqueue(tx as any, {
      aggregateType: 'SUPPORT_TICKET',
      aggregateId: 'ticket-1',
      eventType: 'support.updated',
      payload: { action: 'STATUS_CHANGED' },
    });

    expect(tx.outboxEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        aggregateType: 'SUPPORT_TICKET',
        aggregateId: 'ticket-1',
        eventType: 'support.updated',
        status: OUTBOX_STATUS.PENDING,
        attemptCount: 0,
      }),
    });
  });

  it('process publishes a pending event and marks it published after mock publish succeeds', async () => {
    prisma.outboxEvent.findMany.mockResolvedValue([pendingEvent()]);
    prisma.outboxEvent.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.processPendingEvents();

    expect(result.published).toBe(1);
    expect(service.publishedEvents).toHaveLength(1);
    expect(prisma.outboxEvent.updateMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: { id: 'event-1', status: OUTBOX_STATUS.PROCESSING },
        data: expect.objectContaining({
          status: OUTBOX_STATUS.PUBLISHED,
          publishedAt: expect.any(Date),
          nextAttemptAt: null,
          lastError: null,
        }),
      }),
    );
  });

  it('failed event retries with incremented attempt count and backoff', async () => {
    prisma.outboxEvent.findMany.mockResolvedValue([pendingEvent({ payload: { failPublish: true } })]);
    prisma.outboxEvent.updateMany.mockResolvedValue({ count: 1 });
    prisma.outboxEvent.update.mockResolvedValue({});

    const result = await service.processPendingEvents();

    expect(result.failed).toBe(1);
    expect(prisma.outboxEvent.update).toHaveBeenCalledWith({
      where: { id: 'event-1' },
      data: expect.objectContaining({
        status: OUTBOX_STATUS.FAILED,
        attemptCount: 1,
        lastError: 'Simulated publishing failure',
        nextAttemptAt: expect.any(Date),
        publishedAt: null,
      }),
    });
  });

  it('max attempts becomes dead-letter', async () => {
    prisma.outboxEvent.findMany.mockResolvedValue([
      pendingEvent({ attemptCount: 4, payload: { failPublish: true } }),
    ]);
    prisma.outboxEvent.updateMany.mockResolvedValue({ count: 1 });
    prisma.outboxEvent.update.mockResolvedValue({});

    const result = await service.processPendingEvents();

    expect(result.deadLettered).toBe(1);
    expect(prisma.outboxEvent.update).toHaveBeenCalledWith({
      where: { id: 'event-1' },
      data: expect.objectContaining({
        status: OUTBOX_STATUS.DEAD_LETTER,
        attemptCount: 5,
        lastError: 'Simulated publishing failure',
        nextAttemptAt: null,
        publishedAt: null,
      }),
    });
  });

  it('already published event is not republished', async () => {
    prisma.outboxEvent.findMany.mockResolvedValue([
      pendingEvent({ status: OUTBOX_STATUS.PUBLISHED, publishedAt: new Date('2026-06-03T00:01:00.000Z') }),
    ]);

    const result = await service.processPendingEvents();

    expect(result.skipped).toBe(1);
    expect(service.publishedEvents).toHaveLength(0);
    expect(prisma.outboxEvent.updateMany).not.toHaveBeenCalled();
  });
});
