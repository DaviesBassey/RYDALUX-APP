import { Logger } from '@nestjs/common';

const REQUIRED_PROD_SECRETS = [
  { key: 'JWT_ACCESS_SECRET', minLength: 32 },
  { key: 'JWT_REFRESH_SECRET', minLength: 32 },
  { key: 'DATABASE_URL', minLength: 1 },
];

const RECOMMENDED_PROD_SECRETS = [
  { key: 'PAYSTACK_SECRET_KEY', minLength: 1 },
  { key: 'PAYSTACK_WEBHOOK_SECRET', minLength: 1 },
];

const logger = new Logger('EnvValidation');

export function validateEnv(): void {
  const isDev = process.env.NODE_ENV === 'development';
  const isProd = process.env.NODE_ENV === 'production';

  // In any environment, warn if JWT secrets look weak
  for (const { key, minLength } of REQUIRED_PROD_SECRETS) {
    const value = process.env[key];
    if (!value || value.length < minLength) {
      const msg = `${key} is missing or shorter than ${minLength} characters.`;
      if (isProd) {
        logger.error(`FATAL: ${msg}`);
        throw new Error(msg);
      }
      if (!isDev) {
        // Staging / preview — still warn loudly
        logger.warn(`SECURITY: ${msg}`);
      }
    }
  }

  // In production, required secrets must be present
  if (isProd) {
    for (const { key, minLength } of RECOMMENDED_PROD_SECRETS) {
      const value = process.env[key];
      if (!value || value.length < minLength) {
        const msg = `${key} is missing or empty. Payment webhooks and processing will not work securely.`;
        logger.error(`FATAL: ${msg}`);
        throw new Error(msg);
      }
    }

    const corsOrigin = process.env.CORS_ORIGIN;
    if (!corsOrigin) {
      const msg = 'CORS_ORIGIN is not set. Production API cannot accept cross-origin requests safely.';
      logger.error(`FATAL: ${msg}`);
      throw new Error(msg);
    }
    if (corsOrigin.includes('*')) {
      const msg = 'CORS_ORIGIN must not contain wildcard "*" in production.';
      logger.error(`FATAL: ${msg}`);
      throw new Error(msg);
    }
  }

  // Dev module safety: if NODE_ENV is unset, default to safe mode
  if (!process.env.NODE_ENV) {
    logger.warn('NODE_ENV is not set. Defaulting to safe behavior (no dev endpoints).');
    process.env.NODE_ENV = 'production';
  }
}

export function parseCorsOrigins(): string[] | true {
  const raw = process.env.CORS_ORIGIN;
  if (!raw) {
    // Development fallback: allow common localhost origins
    if (process.env.NODE_ENV === 'development') {
      return ['http://localhost:3000', 'http://localhost:8081', 'http://127.0.0.1:3000', 'http://127.0.0.1:8081'];
    }
    return true; // Allow all (emergency fallback, warned above)
  }
  return raw.split(',').map((o) => o.trim()).filter(Boolean);
}
