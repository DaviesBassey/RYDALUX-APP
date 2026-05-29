import { Test, TestingModule } from '@nestjs/testing';
import { TripsService } from '../src/trips/trips.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { TripsGateway } from '../src/trips/trips.gateway';
import { FareService } from '../src/fare/fare.service';
import { PaymentsService } from '../src/payments/payments.service';
import { ForbiddenException, BadRequestException } from '@nestjs/common';

describe('Trip PIN integration (module)', () => {
  let service: TripsService;
  const mockPrisma: any = {
    trip: { findUnique: jest.fn(), update: jest.fn() },
    tripEvent: { create: jest.fn() },
    riderProfile: { findUnique: jest.fn() },
    driverProfile: { findUnique: jest.fn() },
    $transaction: jest.fn()
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    // default implementations to make $transaction and update behave sensibly
    mockPrisma.$transaction.mockImplementation(async (cb: any) => await cb(mockPrisma));
    mockPrisma.trip.update.mockImplementation(async (args: any) => ({ id: args.where.id, status: args.data?.status ?? 'UPDATED' }));
    mockPrisma.auditLog = { create: jest.fn().mockResolvedValue({}) } as any;
    mockPrisma.tripEvent = { create: jest.fn().mockResolvedValue({}) } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TripsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: 'REDIS_CLIENT', useValue: { set: jest.fn(), get: jest.fn(), del: jest.fn() } },
        { provide: TripsGateway, useValue: { publishDriverLocation: jest.fn() } },
        { provide: FareService, useValue: { getFareQuote: jest.fn() } },
        { provide: PaymentsService, useValue: { initiateMockPayment: jest.fn(), capturePaymentForTrip: jest.fn(), authorizePaymentForTrip: jest.fn() } }
      ]
    }).compile();

    service = module.get(TripsService);
  });

  it('allows assigned rider to retrieve PIN and rejects other users', async () => {
    mockPrisma.riderProfile.findUnique.mockResolvedValueOnce({ id: 'rider-1' });
    mockPrisma.trip.findUnique.mockResolvedValueOnce({ id: 't1', riderProfileId: 'rider-1', pinCode: '4321', pinExpiresAt: new Date(Date.now() + 60000), status: 'DRIVER_ASSIGNED' });

    const pin = await service.getTripPin('t1', 'rider-1');
    expect(pin.pin).toBe('4321');

    mockPrisma.riderProfile.findUnique.mockResolvedValueOnce(null);
    await expect(service.getTripPin('t1', 'other-user')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('prevents driver from retrieving PIN directly', async () => {
    mockPrisma.riderProfile.findUnique.mockResolvedValueOnce(null);
    await expect(service.getTripPin('t1', 'user-driver')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('blocks PIN retrieval for expired or cancelled trips', async () => {
    mockPrisma.riderProfile.findUnique.mockResolvedValueOnce({ id: 'rider-1' });
    mockPrisma.trip.findUnique.mockResolvedValueOnce({ id: 't2', riderProfileId: 'rider-1', pinCode: '4321', pinExpiresAt: new Date(Date.now() + 60000), status: 'EXPIRED' });

    await expect(service.getTripPin('t2', 'rider-1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows driver to verify correct PIN and creates TripEvent', async () => {
    // trip.findUnique will be called twice inside transition (initial + stored select)
    mockPrisma.trip.findUnique.mockResolvedValueOnce({ id: 't2', status: 'DRIVER_ARRIVED' });
    mockPrisma.trip.findUnique.mockResolvedValueOnce({ id: 't2', pinCode: '1111', pinExpiresAt: new Date(Date.now() + 60000), failedPinAttempts: 0, safetyFlagged: false });
    mockPrisma.trip.update.mockResolvedValueOnce({ id: 't2', status: 'PIN_VERIFIED' });
    mockPrisma.tripEvent.create.mockResolvedValue({});

    const res = await service.transition('t2', 'actor-driver', 'PIN_VERIFIED' as any, { pin: '1111' });
    expect(res.status).toBe('PIN_VERIFIED');
    expect(mockPrisma.tripEvent.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ eventType: 'PIN_VERIFIED' }) }));
  });

  it('limits failed attempts and triggers safety flag and events', async () => {
    // first wrong attempt
    // first wrong attempt (two findUnique calls)
    mockPrisma.trip.findUnique.mockResolvedValueOnce({ id: 't3', status: 'DRIVER_ARRIVED' });
    mockPrisma.trip.findUnique.mockResolvedValueOnce({ id: 't3', pinCode: '2222', pinExpiresAt: new Date(Date.now() + 60000), failedPinAttempts: 0, safetyFlagged: false });
    await expect(service.transition('t3', 'actor-driver', 'PIN_VERIFIED' as any, { pin: '0000' })).rejects.toBeInstanceOf(BadRequestException);
    expect(mockPrisma.trip.update).toHaveBeenCalled();
    expect(mockPrisma.tripEvent.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ eventType: 'PIN_VERIFICATION_FAILED' }) }));

    // simulate attempts reaching threshold (two findUnique calls)
    mockPrisma.trip.findUnique.mockResolvedValueOnce({ id: 't3', status: 'DRIVER_ARRIVED' });
    mockPrisma.trip.findUnique.mockResolvedValueOnce({ id: 't3', pinCode: '2222', pinExpiresAt: new Date(Date.now() + 60000), failedPinAttempts: 2, safetyFlagged: false });
    await expect(service.transition('t3', 'actor-driver', 'PIN_VERIFIED' as any, { pin: '0000' })).rejects.toBeInstanceOf(ForbiddenException);
    expect(mockPrisma.tripEvent.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ eventType: 'SAFETY_FLAG_TRIGGERED' }) }));
  });

  it('rejects PIN verification for expired or completed trips', async () => {
    mockPrisma.trip.findUnique.mockResolvedValueOnce({ id: 't4', status: 'EXPIRED', pinCode: '3333', pinExpiresAt: new Date(Date.now() - 1000) });
    await expect(service.transition('t4', 'actor', 'PIN_VERIFIED' as any, { pin: '3333' })).rejects.toBeInstanceOf(BadRequestException);

    mockPrisma.trip.findUnique.mockResolvedValueOnce({ id: 't5', status: 'COMPLETED', pinCode: '3333', pinExpiresAt: new Date(Date.now() + 10000) });
    await expect(service.transition('t5', 'actor', 'PIN_VERIFIED' as any, { pin: '3333' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('requires PIN verification before starting the trip', async () => {
    mockPrisma.trip.findUnique.mockResolvedValueOnce({ id: 't6', status: 'DRIVER_ARRIVED' });
    await expect(service.transition('t6', 'actor-driver', 'IN_PROGRESS' as any)).rejects.toBeInstanceOf(ForbiddenException);

    mockPrisma.trip.findUnique.mockResolvedValueOnce({ id: 't6', status: 'DRIVER_ARRIVED' });
    mockPrisma.trip.findUnique.mockResolvedValueOnce({ id: 't6', pinCode: '4444', pinExpiresAt: new Date(Date.now() + 60000), failedPinAttempts: 0, safetyFlagged: false });
    mockPrisma.trip.update.mockResolvedValueOnce({ id: 't6', status: 'PIN_VERIFIED' });
    const verify = await service.transition('t6', 'actor-driver', 'PIN_VERIFIED' as any, { pin: '4444' });
    expect(verify.status).toBe('PIN_VERIFIED');

    mockPrisma.trip.findUnique.mockResolvedValueOnce({ id: 't6', status: 'PIN_VERIFIED' });
    mockPrisma.trip.update.mockResolvedValueOnce({ id: 't6', status: 'IN_PROGRESS' });
    const start = await service.transition('t6', 'actor-driver', 'IN_PROGRESS' as any);
    expect(start.status).toBe('IN_PROGRESS');
  });
});
