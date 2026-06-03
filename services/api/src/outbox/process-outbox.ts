import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { OutboxService } from './outbox.service';

async function main() {
  process.env.OUTBOX_SCHEDULER_DISABLED = process.env.OUTBOX_SCHEDULER_DISABLED ?? 'true';

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['log', 'error', 'warn'] });

  try {
    const outboxService = app.get(OutboxService);
    const limit = Number(process.env.OUTBOX_PROCESS_LIMIT ?? 100);
    const result = await outboxService.processPendingEvents(limit);

    console.log(
      `outbox:process published=${result.published} failed=${result.failed} deadLettered=${result.deadLettered} skipped=${result.skipped}`,
    );
  } finally {
    await app.close();
  }
}

void main().catch((error) => {
  console.error(`outbox:process failed: ${(error as Error).message}`);
  process.exitCode = 1;
});
