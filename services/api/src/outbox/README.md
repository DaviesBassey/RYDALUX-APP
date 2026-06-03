# Transactional Outbox

`OutboxService.enqueue(tx, event)` writes domain events using the same Prisma transaction as the state change. The local processor currently uses mock publishing only; Kafka or another broker can be added behind `publishEvent` later.

Run database migrations before processing events:

```bash
corepack pnpm --filter @rydulux/prisma run migrate:deploy
```

Process pending events locally or in staging:

```bash
corepack pnpm outbox:process
```

The processor is safe to rerun: only due `PENDING`/`FAILED` events are claimed, events become `PUBLISHED` only after mock publishing succeeds, and failures schedule retries with `nextAttemptAt` until `DEAD_LETTER`.
