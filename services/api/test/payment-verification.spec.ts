import { PaystackService } from '../src/payments/paystack.service';

describe('Payment Verification & Webhook Idempotency (Section 15)', () => {
  let service: PaystackService;

  const mockHttpService: any = {
    post: jest.fn(),
    get: jest.fn(),
  };

  const mockConfigService: any = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        paystackSecretKey: 'sk_test_123',
        paystackWebhookSecret: 'whsec_test_456',
        paystackCallbackUrl: 'http://localhost:3000/callback',
      };
      return config[key];
    }),
  };

  const mockPaymentsService: any = {
    recordAccountEvent: jest.fn(),
    recordWalletEvent: jest.fn(),
  };

  const mockIdempotencyService: any = {
    recordProviderEvent: jest.fn(),
    hashProviderPayload: jest.fn((payload) => `hash:${JSON.stringify(payload).slice(0, 20)}`),
  };

  const mockPrisma: any = {
    payment: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    providerEvent: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    trip: {
      findUnique: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrisma)),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.$transaction.mockImplementation((callback: any) => callback(mockPrisma));
    service = new PaystackService(
      mockHttpService,
      mockConfigService,
      mockPaymentsService,
      mockIdempotencyService,
      mockPrisma,
    );
  });

  describe('verifyWebhookSignature', () => {
    it('returns true for valid webhook signature', () => {
      const crypto = require('crypto');
      const body = Buffer.from(JSON.stringify({ event: 'charge.success', data: {} }));
      const hash = crypto
        .createHmac('sha512', 'whsec_test_456')
        .update(body)
        .digest('hex');

      const result = service.verifyWebhookSignature(body, hash);
      expect(result).toBe(true);
    });

    it('returns false for invalid webhook signature', () => {
      const body = Buffer.from(JSON.stringify({ event: 'charge.success' }));
      const result = service.verifyWebhookSignature(body, 'invalid_signature_1234567890');

      expect(result).toBe(false);
    });

    it('rejects webhook when secret is not configured', () => {
      mockConfigService.get.mockReturnValueOnce(undefined);
      const newService = new PaystackService(
        mockHttpService,
        mockConfigService,
        mockPaymentsService,
        mockIdempotencyService,
        mockPrisma,
      );

      const result = newService.verifyWebhookSignature('test_body', 'any_signature');
      expect(result).toBe(false);
    });

    it('safely compares signatures using timing-safe comparison', () => {
      const crypto = require('crypto');
      const body = Buffer.from(JSON.stringify({ event: 'charge.success' }));
      const correctHash = crypto
        .createHmac('sha512', 'whsec_test_456')
        .update(body)
        .digest('hex');
      const wrongHash = correctHash.slice(0, -1) + '0';

      expect(service.verifyWebhookSignature(body, correctHash)).toBe(true);
      expect(service.verifyWebhookSignature(body, wrongHash)).toBe(false);
    });
  });

  describe('Webhook Idempotency', () => {
    it('records provider event with idempotency key based on event and data.id', async () => {
      mockIdempotencyService.recordProviderEvent.mockResolvedValue({
        id: 'charge.success:12345',
        status: 'PENDING',
        processedAt: null,
        payload: { event: 'charge.success', data: { id: 12345, reference: 'RYD-PAY-123' } },
      });

      const payload = {
        event: 'charge.success',
        data: { id: 12345, reference: 'RYD-PAY-123', status: 'success', amount: 500000 },
      };

      mockPrisma.payment.findUnique.mockResolvedValue(null);
      mockPrisma.providerEvent.update.mockResolvedValue({});

      await service.handleWebhookEvent(payload);

      expect(mockIdempotencyService.recordProviderEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'paystack',
          eventType: 'charge.success',
          providerEventId: 'charge.success:12345',
          reference: 'RYD-PAY-123',
        }),
      );
    });

    it('skips processing when providerEvent already has processedAt', async () => {
      mockIdempotencyService.recordProviderEvent.mockResolvedValue({
        id: 'event-processed',
        status: 'PROCESSED',
        processedAt: new Date(),
        payload: null,
      });

      const payload = {
        event: 'charge.success',
        data: { id: 111, reference: 'RYD-PAY-123', status: 'success', amount: 500000 },
      };

      await service.handleWebhookEvent(payload as any);

      expect(mockPrisma.payment.update).not.toHaveBeenCalled();
      expect(mockPrisma.auditLog.create).not.toHaveBeenCalled();
    });

    it('skips processing when providerEvent is DEAD_LETTER', async () => {
      mockIdempotencyService.recordProviderEvent.mockResolvedValue({
        id: 'event-dead',
        status: 'DEAD_LETTER',
        processedAt: null,
        payload: null,
      });

      const payload = {
        event: 'charge.success',
        data: { id: 111, reference: 'RYD-PAY-123', status: 'success', amount: 500000 },
      };

      await service.handleWebhookEvent(payload as any);

      expect(mockPrisma.payment.update).not.toHaveBeenCalled();
    });

    it('uses reference as fallback when data.id is missing', async () => {
      mockIdempotencyService.recordProviderEvent.mockResolvedValue({
        id: 'charge.success:RYD-PAY-FALLBACK',
        status: 'PENDING',
        processedAt: null,
      });

      const payload = {
        event: 'charge.success',
        data: { reference: 'RYD-PAY-FALLBACK', status: 'success', amount: 500000 },
      };

      mockPrisma.payment.findUnique.mockResolvedValue(null);
      mockPrisma.providerEvent.update.mockResolvedValue({});

      await service.handleWebhookEvent(payload as any);

      expect(mockIdempotencyService.recordProviderEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          reference: 'RYD-PAY-FALLBACK',
        }),
      );
    });

    it('uses payload hash when no id or reference available', async () => {
      mockIdempotencyService.recordProviderEvent.mockResolvedValue({
        id: 'charge.success:hash:transfer',
        status: 'PENDING',
        processedAt: null,
      });

      const payload = {
        event: 'charge.success',
        data: { status: 'success', amount: 500000 },
      };

      mockPrisma.payment.findUnique.mockResolvedValue(null);
      mockPrisma.providerEvent.update.mockResolvedValue({});

      await service.handleWebhookEvent(payload as any);

      expect(mockIdempotencyService.hashProviderPayload).toHaveBeenCalledWith(payload);
    });

    it('marks providerEvent as PROCESSED after successful handling', async () => {
      mockIdempotencyService.recordProviderEvent.mockResolvedValue({
        id: 'event-1',
        status: 'PENDING',
        processedAt: null,
      });

      mockPrisma.payment.findUnique.mockResolvedValue(null);
      mockPrisma.providerEvent.update.mockResolvedValue({ id: 'event-1', status: 'PROCESSED' });

      const payload = {
        event: 'charge.failed',
        data: { id: 111, reference: 'RYD-PAY-123', status: 'failed', amount: 500000 },
      };

      await service.handleWebhookEvent(payload as any);

      expect(mockPrisma.providerEvent.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'event-1' },
          data: expect.objectContaining({
            status: 'PROCESSED',
            processedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('marks providerEvent as FAILED with retry time on processing error', async () => {
      mockIdempotencyService.recordProviderEvent.mockResolvedValue({
        id: 'event-fail',
        status: 'PENDING',
        processedAt: null,
        payload: { event: 'charge.success', data: { reference: 'RYD-PAY-FAIL' } },
      });

      mockPrisma.payment.findUnique.mockResolvedValue(null);

      const payload = { event: 'charge.success', data: { id: 111, reference: 'RYD-PAY-FAIL' } };

      await service.handleWebhookEvent(payload);

      expect(mockPrisma.providerEvent.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'FAILED',
            lastError: expect.stringContaining('not processed'),
            nextRetryAt: expect.any(Date),
          }),
        }),
      );
    });
  });

  describe('handleChargeFailed', () => {
    it('updates payment to FAILED status and logs audit', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue({
        id: 'pay-fail',
        reference: 'RYD-PAY-FAIL',
        status: 'PENDING',
        gatewayMeta: null,
      });

      mockPrisma.payment.update.mockResolvedValue({ id: 'pay-fail', status: 'FAILED' });
      mockPrisma.auditLog.create.mockResolvedValue({});

      const data = {
        reference: 'RYD-PAY-FAIL',
        gateway_response: 'Card expired',
        id: 456,
      };

      const result = await (service as any).handleChargeFailed(data);

      expect(result).toBe(true);
      expect(mockPrisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'FAILED' }),
        }),
      );
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });

    it('returns true when payment not found (idempotent)', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(null);

      const data = { reference: 'RYD-PAY-MISSING', id: 456 };

      const result = await (service as any).handleChargeFailed(data);

      expect(result).toBe(true);
      expect(mockPrisma.payment.update).not.toHaveBeenCalled();
    });
  });
});
