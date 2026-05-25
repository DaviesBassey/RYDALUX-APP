import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './core/http-exception.filter';
import { validateEnv, parseCorsOrigins } from './core/env-validation';

async function bootstrap() {
  // Fail fast if required secrets are missing/weak
  validateEnv();

  const app = await NestFactory.create(AppModule, { rawBody: true });

  // Trust proxy when behind a reverse proxy (required for rate limiting and logging)
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  // CORS: strict origin allowlist in production, localhost defaults in dev
  const allowedOrigins = parseCorsOrigins();
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Idempotency-Key', 'X-Paystack-Signature'],
  });

  // Security headers
  app.use(helmet({
    contentSecurityPolicy: false, // API only — no HTML responses
    crossOriginEmbedderPolicy: false, // Allow embedded resources
  }));

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());

  const port = process.env.PORT ? Number(process.env.PORT) : 4000;
  await app.listen(port);
  console.log(`API listening on http://localhost:${port}`);
}

bootstrap();
