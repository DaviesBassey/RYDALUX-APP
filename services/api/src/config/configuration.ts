export default () => ({
  port: parseInt(process.env.PORT ?? '4000', 10),
  databaseUrl: process.env.DATABASE_URL ?? '',
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  paystackSecretKey: process.env.PAYSTACK_SECRET_KEY ?? '',
  paystackWebhookSecret: process.env.PAYSTACK_WEBHOOK_SECRET ?? '',
});
