import { FareService } from '../src/fare/fare.service';

describe('FareService', () => {
  let service: FareService;
  const mockPrisma: any = {
    fareQuote: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    promoCode: { findUnique: jest.fn() },
    cityZone: { findMany: jest.fn() }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.cityZone.findMany.mockResolvedValue([]);
    service = new FareService(mockPrisma as any);
  });

  it('calculates fare for short distance', async () => {
    mockPrisma.promoCode.findUnique.mockResolvedValue(null);
    mockPrisma.fareQuote.create.mockResolvedValue({ id: 'q1', totalFare: 500, expiresAt: new Date(Date.now() + 300000) });

    const dto: any = { pickupLatitude: 6.5244, pickupLongitude: 3.3792, dropoffLatitude: 6.525, dropoffLongitude: 3.38, rideCategory: 'REGULAR' };
    const result = await service.calculateFare(dto);

    expect(result.breakdown.total).toBeGreaterThanOrEqual(400);
    expect(result.expiresAt).toBeTruthy();
  });

  it('rejects invalid coordinates', async () => {
    await expect(service.calculateFare({ pickupLatitude: 100, pickupLongitude: 3.4, dropoffLatitude: 6.5, dropoffLongitude: 3.38, rideCategory: 'REGULAR' } as any)).rejects.toThrow('Invalid coordinates');
  });

  it('consumes a quote and prevents reuse', async () => {
    const quote = { id: 'q-consume', status: 'ACTIVE', expiresAt: new Date(Date.now() + 300000) };
    mockPrisma.fareQuote.findUnique.mockResolvedValue(quote);
    mockPrisma.fareQuote.update.mockResolvedValue({ ...quote, status: 'CONSUMED' });

    const result = await service.consumeQuote('q-consume');

    expect(result).toEqual({ success: true });
    expect(mockPrisma.fareQuote.update).toHaveBeenCalledWith({ where: { id: 'q-consume' }, data: { status: 'CONSUMED' } });
  });

  it('supports promo discounts and scheduled time for Lagos zone', async () => {
    mockPrisma.cityZone.findMany.mockResolvedValue([{ id: 'zone-1', name: 'Lagos Central', city: 'LAGOS', centerLatitude: 6.5244, centerLongitude: 3.3792, isActive: true }]);
    mockPrisma.promoCode.findUnique.mockResolvedValue({ id: 'promo-1', isActive: true, startsAt: new Date(Date.now() - 100000), endsAt: new Date(Date.now() + 100000), promoType: 'PERCENTAGE', discountValue: 10 });
    mockPrisma.fareQuote.create.mockResolvedValue({ id: 'q2', totalFare: 450, expiresAt: new Date(Date.now() + 300000) });

    const dto: any = {
      pickupLatitude: 6.5244,
      pickupLongitude: 3.3792,
      dropoffLatitude: 6.535,
      dropoffLongitude: 3.39,
      rideCategory: 'REGULAR',
      scheduledTime: new Date(Date.now() + 3600000).toISOString(),
      promoCode: 'SAVE10'
    };

    const result = await service.calculateFare(dto);

    expect(result.breakdown.promoDiscount).toBeGreaterThan(0);
    expect(result.breakdown.total).toBeGreaterThanOrEqual(400);
    expect(result.breakdown.pickupZone).toBe('Lagos Central');
    expect(result.breakdown.dropoffZone).toBe('Lagos Central');
  });

  it('rejects quotes outside Lagos city zones when zones exist', async () => {
    mockPrisma.cityZone.findMany.mockResolvedValue([{ id: 'zone-1', city: 'LAGOS', centerLatitude: 6.5244, centerLongitude: 3.3792, isActive: true }]);

    await expect(service.calculateFare({ pickupLatitude: 0, pickupLongitude: 0, dropoffLatitude: 6.525, dropoffLongitude: 3.38, rideCategory: 'REGULAR' } as any)).rejects.toThrow('Pickup and dropoff must be within supported Lagos city zones.');
  });

  it('expires quote after TTL and cannot get after expiry', async () => {
    const expired = new Date(Date.now() - 1000);
    mockPrisma.fareQuote.findUnique.mockResolvedValue({ id: 'q-exp', status: 'ACTIVE', expiresAt: expired });

    await expect(service.getFareQuote('q-exp')).rejects.toThrow('Quote expired');
  });
});
