import { TripsService } from '../src/trips/trips.service';

describe('TripsService state machine', () => {
  let service: TripsService;
  const mockPrisma: any = {
    trip: { findUnique: jest.fn(), update: jest.fn(), create: jest.fn(), findFirst: jest.fn() },
    tripEvent: { create: jest.fn() },
    auditLog: { create: jest.fn() },
    driverProfile: { findUnique: jest.fn(), update: jest.fn() },
    riderProfile: { findUnique: jest.fn() },
    fareQuote: { findUnique: jest.fn(), update: jest.fn() },
    tripLocation: { findFirst: jest.fn(), create: jest.fn() },
    $transaction: jest.fn(),
    $queryRaw: jest.fn()
  };
  const mockRedis: any = {
    set: jest.fn(),
    get: jest.fn(),
    del: jest.fn()
  };

  const mockGateway: any = {
    publishDriverLocation: jest.fn()
  };

  const mockFareService: any = {
    getFareQuote: jest.fn()
  };

  const mockPaymentsService: any = {
    initiateMockPayment: jest.fn(),
    capturePaymentForTrip: jest.fn(),
    authorizePaymentForTrip: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockRedis.set.mockResolvedValue('OK');
    mockRedis.get.mockResolvedValue('any-token');
    // sensible defaults for transactional and event behaviors
    mockPrisma.$transaction.mockImplementation(async (cb: any) => await cb(mockPrisma));
    mockPrisma.trip.update.mockImplementation(async (args: any) => ({ id: args.where.id, status: args.data?.status ?? 'UPDATED' }));
    mockPrisma.auditLog.create.mockResolvedValue({});
    mockPrisma.tripEvent.create.mockResolvedValue({});

    // Setup default payment mocks
    mockPaymentsService.initiateMockPayment.mockResolvedValue({});
    mockPaymentsService.capturePaymentForTrip.mockResolvedValue({});
    mockPaymentsService.authorizePaymentForTrip.mockResolvedValue({});

    service = new TripsService(mockPrisma as any, mockRedis as any, mockGateway as any, mockFareService as any, mockPaymentsService as any);
  });

  it('allows valid transitions from draft -> quoted -> requested', async () => {
    mockPrisma.trip.findUnique.mockResolvedValueOnce({ id: 't1', status: 'DRAFT' });
    mockPrisma.$transaction.mockImplementation(async (cb: any) => { return await cb(mockPrisma); });
    mockPrisma.trip.update.mockResolvedValue({ id: 't1', status: 'QUOTED' });

    const r1 = await service.transition('t1', 'user-1', 'QUOTED' as any);
    expect(r1.status).toBe('QUOTED');

    // next
    mockPrisma.trip.findUnique.mockResolvedValueOnce({ id: 't1', status: 'QUOTED' });
    mockPrisma.trip.update.mockResolvedValue({ id: 't1', status: 'REQUESTED' });
    const r2 = await service.transition('t1', 'user-1', 'REQUESTED' as any);
    expect(r2.status).toBe('REQUESTED');
  });

  it('rejects invalid transition draft -> in_progress', async () => {
    mockPrisma.trip.findUnique.mockResolvedValueOnce({ id: 't2', status: 'DRAFT' });
    await expect(service.transition('t2', 'user-1', 'IN_PROGRESS' as any)).rejects.toThrow('Invalid transition');
  });

  it('rejects driver starting without PIN verification', async () => {
    mockPrisma.trip.findUnique.mockResolvedValueOnce({ id: 't3', status: 'DRIVER_ARRIVED' });
    await expect(service.transition('t3', 'user-1', 'IN_PROGRESS' as any)).rejects.toThrow('verify PIN');
  });

  it('requires a PIN to verify the trip before starting', async () => {
    mockPrisma.trip.findUnique.mockResolvedValueOnce({ id: 't4', status: 'DRIVER_ARRIVED', pinCode: '1234', pinExpiresAt: new Date(Date.now() + 10000), failedPinAttempts: 0, safetyFlagged: false });
    await expect(service.transition('t4', 'user-1', 'PIN_VERIFIED' as any)).rejects.toThrow('PIN is required');
  });

  it('allows PIN verification then start transition', async () => {
    // first call: basic trip read, second call: stored pin lookup
    mockPrisma.trip.findUnique.mockResolvedValueOnce({ id: 't5', status: 'DRIVER_ARRIVED' });
    mockPrisma.trip.findUnique.mockResolvedValueOnce({ id: 't5', pinCode: '1234', pinExpiresAt: new Date(Date.now() + 10000), failedPinAttempts: 0, safetyFlagged: false });
    mockPrisma.$transaction.mockImplementation(async (cb: any) => await cb(mockPrisma));
    mockPrisma.trip.update.mockResolvedValueOnce({ id: 't5', status: 'PIN_VERIFIED' });

    const verify = await service.transition('t5', 'user-1', 'PIN_VERIFIED' as any, { pin: '1234' });
    expect(verify.status).toBe('PIN_VERIFIED');

    mockPrisma.trip.findUnique.mockResolvedValueOnce({ id: 't5', status: 'PIN_VERIFIED' });
    mockPrisma.trip.update.mockResolvedValueOnce({ id: 't5', status: 'IN_PROGRESS' });
    const start = await service.transition('t5', 'user-1', 'IN_PROGRESS' as any);
    expect(start.status).toBe('IN_PROGRESS');
  });

  it('dispatches to a nearby eligible driver and completes when accepted', async () => {
    const requestedTrip = {
      id: 't10',
      status: 'REQUESTED',
      pickupLatitude: 6.5244,
      pickupLongitude: 3.3792,
      serviceType: 'REGULAR'
    };
    const assignedTrip = {
      id: 't10',
      status: 'DRIVER_ARRIVING',
      driverProfileId: 'driver-1',
      vehicleId: 'vehicle-1'
    };

    mockPrisma.trip.findUnique
      .mockResolvedValueOnce(requestedTrip)
      .mockResolvedValueOnce({ id: 't10', status: 'DRIVER_ASSIGNED', driverProfileId: 'driver-1', vehicleId: 'vehicle-1' })
      .mockResolvedValueOnce(assignedTrip);

    mockPrisma.$queryRaw
      .mockResolvedValueOnce([
        { driver_profile_id: 'driver-1', user_id: 'user-1', vehicle_id: 'vehicle-1', average_rating: 4.9, distance_meters: 1200 }
      ])
      .mockResolvedValueOnce([]);

    mockPrisma.$transaction.mockImplementation(async (cb: any) => {
      await cb(mockPrisma);
      return {};
    });
    mockPrisma.trip.update
      .mockResolvedValueOnce({ id: 't10', status: 'DRIVER_ASSIGNED' })
      .mockResolvedValueOnce({ id: 't10', status: 'DRIVER_ARRIVING' });
    mockPrisma.tripEvent.create.mockResolvedValue({});

    const dispatchPromise = service.dispatchTrip('t10');
    await new Promise((resolve) => setImmediate(resolve));
    await service.acceptDispatch('t10', 'driver-1');

    const result = await dispatchPromise;
    expect(result!.status).toBe('DRIVER_ARRIVING');
    expect(mockPrisma.tripEvent.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ eventType: 'DISPATCH_ACCEPTED' }) }));
  });

  it('allows driver location updates during active trips and stores samples', async () => {
    mockPrisma.driverProfile.findUnique.mockResolvedValueOnce({ id: 'driver-profile-1' });
    mockPrisma.trip.findUnique.mockResolvedValueOnce({ id: 't12', status: 'DRIVER_ARRIVING', driverProfileId: 'driver-profile-1' });
    mockPrisma.tripLocation.findFirst.mockResolvedValueOnce({ latitude: 6.5244, longitude: 3.3792, recordedAt: new Date(Date.now() - 10000) });
    mockPrisma.tripLocation.create.mockResolvedValueOnce({ id: 'loc-1', tripId: 't12', latitude: 6.525, longitude: 3.38, recordedAt: new Date() });
    mockPrisma.driverProfile.update.mockResolvedValueOnce({ id: 'driver-profile-1', currentLatitude: 6.525, currentLongitude: 3.38 });
    mockPrisma.tripEvent.create.mockResolvedValueOnce({});

    const result = await service.updateDriverLocation('t12', 'user-driver', { latitude: 6.525, longitude: 3.38 });
    expect(result.location).toMatchObject({ latitude: 6.525, longitude: 3.38 });
  });

  it('rejects driver location updates with impossible speed jumps', async () => {
    mockPrisma.driverProfile.findUnique.mockResolvedValueOnce({ id: 'driver-profile-1' });
    mockPrisma.trip.findUnique.mockResolvedValueOnce({ id: 't13', status: 'DRIVER_ARRIVING', driverProfileId: 'driver-profile-1' });
    mockPrisma.tripLocation.findFirst.mockResolvedValueOnce({ latitude: 6.5244, longitude: 3.3792, recordedAt: new Date(Date.now() - 1000) });

    await expect(service.updateDriverLocation('t13', 'user-driver', { latitude: 6.6, longitude: 3.8 })).rejects.toThrow('Impossible speed jump detected.');
  });

  it('allows rider to see live driver location only on active trips', async () => {
    mockPrisma.riderProfile.findUnique.mockResolvedValueOnce({ id: 'rider-profile-1' });
    mockPrisma.trip.findUnique.mockResolvedValueOnce({
      id: 't14',
      status: 'IN_PROGRESS',
      riderProfileId: 'rider-profile-1',
      driverProfileId: 'driver-profile-1',
      driverProfile: { user: { displayName: 'Driver One' } },
      vehicle: { id: 'vehicle-1', registrationNumber: 'ABC123', vehicleType: 'REGULAR' }
    });
    mockPrisma.tripLocation.findFirst.mockResolvedValueOnce({ latitude: 6.525, longitude: 3.38, recordedAt: new Date(Date.now() - 20000) });

    const result = await service.getDriverLiveLocation('t14', 'user-rider');
    expect(result.driver.name).toBe('Driver One');
    expect(result.location).toMatchObject({ latitude: 6.525, longitude: 3.38 });
    expect(result.stale).toBe(false);
  });

  it('rejects rider access to driver location when trip is not active', async () => {
    mockPrisma.riderProfile.findUnique.mockResolvedValueOnce({ id: 'rider-profile-1' });
    mockPrisma.trip.findUnique.mockResolvedValueOnce({
      id: 't15',
      status: 'COMPLETED',
      riderProfileId: 'rider-profile-1',
      driverProfileId: 'driver-profile-1',
      driverProfile: { user: { displayName: 'Driver One' } },
      vehicle: { id: 'vehicle-1', registrationNumber: 'ABC123', vehicleType: 'REGULAR' }
    });

    await expect(service.getDriverLiveLocation('t15', 'user-rider')).rejects.toThrow('Live driver location is only available during an active trip.');
  });

  it('records a driver rejection and returns the trip to REQUESTED state', async () => {
    mockPrisma.trip.findUnique.mockResolvedValueOnce({ id: 't11', status: 'DRIVER_ASSIGNED', driverProfileId: 'driver-2' });
    mockPrisma.$transaction.mockImplementation(async (cb: any) => await cb(mockPrisma));
    mockPrisma.trip.update.mockResolvedValueOnce({ id: 't11', status: 'REQUESTED' });
    mockPrisma.tripEvent.create.mockResolvedValueOnce({});

    const result = await service.rejectDispatch('t11', 'driver-2', 'Driver unable to reach pickup');
    expect(result.status).toBe('REQUESTED');
    expect(mockPrisma.tripEvent.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ eventType: 'DISPATCH_REJECTED' }) }));
  });

  it('rejects rider cancelling completed trip', async () => {
    mockPrisma.trip.findUnique.mockResolvedValueOnce({ id: 't6', status: 'COMPLETED' });
    await expect(service.transition('t6', 'user-1', 'CANCELLED_BY_RIDER' as any)).rejects.toThrow('Invalid transition');
  });

  it('prevents payment capture before trip completion', async () => {
    mockPrisma.trip.findUnique.mockResolvedValueOnce({
      id: 't7',
      status: 'IN_PROGRESS',
      payment: { id: 'p1', status: 'AUTHORIZED' }
    });

    await expect(service.capturePayment('t7')).rejects.toThrow('Payment capture is only allowed after trip completion.');
  });

  it('captures payment after trip completion and logs an audit event', async () => {
    mockPrisma.trip.findUnique.mockResolvedValueOnce({
      id: 't8',
      status: 'COMPLETED',
      payment: { id: 'p2', status: 'AUTHORIZED' }
    });
    mockPrisma.payment = { update: jest.fn().mockResolvedValue({ id: 'p2', status: 'CAPTURED' }) };
    mockPrisma.auditLog.create.mockResolvedValue({ id: 'a1' });

    const payment = await service.capturePayment('t8');
    expect(payment.status).toBe('CAPTURED');
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        action: 'PAYMENT_CAPTURED',
        entity: 'TRIP',
        entityId: 't8'
      })
    }));
  });

  // ── createTrip ─────────────────────────────────────────────────────────────

  it('createTrip: creates a trip from a valid fare quote', async () => {
    const fareQuote = {
      id: 'fq-1',
      tripId: null,
      status: 'ACTIVE',
      expiresAt: new Date(Date.now() + 60000),
      serviceType: 'REGULAR',
      pickupLatitude: 6.5244,
      pickupLongitude: 3.3792,
      dropoffLatitude: 6.6018,
      dropoffLongitude: 3.3515,
      scheduledAt: null
    };
    const createdTrip = {
      id: 'trip-new',
      reference: 'RYD-ABCD1234',
      status: 'REQUESTED',
      riderProfileId: 'rp-1',
      serviceType: 'REGULAR',
      pickupAddress: '5 Marina, Lagos',
      dropoffAddress: '10 Allen Ave, Ikeja',
      pickupLatitude: 6.5244,
      pickupLongitude: 3.3792,
      dropoffLatitude: 6.6018,
      dropoffLongitude: 3.3515,
      scheduledAt: null,
      fareQuote,
      driverProfile: null,
      riderProfile: { id: 'rp-1', user: { id: 'u-1', displayName: 'Test Rider', phone: '+2348012345678' } },
      vehicle: null,
      payment: null
    };

    mockPrisma.riderProfile.findUnique
      .mockResolvedValueOnce({ id: 'rp-1' })   // no active trip check
      .mockResolvedValueOnce({ id: 'rp-1' });   // ownership check in getTripForUser
    mockPrisma.trip.findFirst.mockResolvedValueOnce(null);  // no existing active trip
    mockFareService.getFareQuote.mockResolvedValueOnce(fareQuote);
    mockPrisma.$transaction.mockImplementation(async (cb: any) => {
      mockPrisma.trip.create.mockResolvedValueOnce(createdTrip);
      mockPrisma.fareQuote.update.mockResolvedValueOnce({});
      return await cb(mockPrisma);
    });
    mockPrisma.trip.findUnique.mockResolvedValueOnce({ ...createdTrip });

    const result = await service.createTrip('u-1', {
      fareQuoteId: 'fq-1',
      pickupAddress: '5 Marina, Lagos',
      dropoffAddress: '10 Allen Ave, Ikeja'
    });

    expect(result.status).toBe('REQUESTED');
    expect(result.pickup.address).toBe('5 Marina, Lagos');
    expect(result.dropoff.address).toBe('10 Allen Ave, Ikeja');
  });

  it('createTrip: blocks rider with an existing active trip', async () => {
    mockPrisma.riderProfile.findUnique.mockResolvedValueOnce({ id: 'rp-1' });
    mockPrisma.trip.findFirst.mockResolvedValueOnce({ id: 'trip-existing', status: 'REQUESTED' });

    await expect(
      service.createTrip('u-1', { fareQuoteId: 'fq-1', pickupAddress: 'A', dropoffAddress: 'B' })
    ).rejects.toThrow('active trip already exists');
  });

  it('createTrip: rejects when fare quote is already linked to a trip', async () => {
    mockPrisma.riderProfile.findUnique.mockResolvedValueOnce({ id: 'rp-1' });
    mockPrisma.trip.findFirst.mockResolvedValueOnce(null);
    mockFareService.getFareQuote.mockResolvedValueOnce({
      id: 'fq-used',
      tripId: 'some-existing-trip',
      status: 'CONSUMED',
      expiresAt: new Date(Date.now() + 60000),
      serviceType: 'REGULAR'
    });

    await expect(
      service.createTrip('u-1', { fareQuoteId: 'fq-used', pickupAddress: 'A', dropoffAddress: 'B' })
    ).rejects.toThrow('already been used');
  });

  it('createTrip: throws ForbiddenException when rider profile does not exist', async () => {
    mockPrisma.riderProfile.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.createTrip('u-unknown', { fareQuoteId: 'fq-1', pickupAddress: 'A', dropoffAddress: 'B' })
    ).rejects.toThrow('Rider profile not found');
  });

  // ── getTripForUser ──────────────────────────────────────────────────────────

  it('getTripForUser: returns shaped trip for rider who owns it', async () => {
    const trip = {
      id: 't-r1', reference: 'RYD-TEST0001', status: 'REQUESTED', serviceType: 'REGULAR',
      riderProfileId: 'rp-1', driverProfileId: null, vehicleId: null,
      pickupAddress: 'A', pickupLatitude: 6.5, pickupLongitude: 3.3,
      dropoffAddress: 'B', dropoffLatitude: 6.6, dropoffLongitude: 3.4,
      scheduledAt: null, acceptedAt: null, startedAt: null, arrivedAt: null,
      completedAt: null, cancelledAt: null, cancellationReason: null,
      distanceMeters: null, durationSeconds: null, notes: null,
      createdAt: new Date(), updatedAt: new Date(),
      riderProfile: { id: 'rp-1', user: { id: 'u-1', displayName: 'Rider One', phone: '+234' } },
      driverProfile: null, vehicle: null, fareQuote: null, payment: null
    };

    mockPrisma.trip.findUnique.mockResolvedValueOnce(trip);
    mockPrisma.riderProfile.findUnique.mockResolvedValueOnce({ id: 'rp-1' });

    const result = await service.getTripForUser('t-r1', 'u-1', 'RIDER');
    expect(result.id).toBe('t-r1');
    expect(result.rider?.name).toBe('Rider One');
    expect((result as any).pinCode).toBeUndefined();
  });

  it('getTripForUser: throws 403 for rider accessing another rider\'s trip', async () => {
    mockPrisma.trip.findUnique.mockResolvedValueOnce({
      id: 't-other', riderProfileId: 'rp-other', driverProfileId: null
    });
    mockPrisma.riderProfile.findUnique.mockResolvedValueOnce({ id: 'rp-1' });

    await expect(service.getTripForUser('t-other', 'u-1', 'RIDER')).rejects.toThrow('do not have access');
  });

  it('getTripForUser: allows driver to read their assigned trip', async () => {
    const trip = {
      id: 't-d1', reference: 'RYD-D001', status: 'DRIVER_ARRIVING', serviceType: 'REGULAR',
      riderProfileId: 'rp-1', driverProfileId: 'dp-1', vehicleId: 'v-1',
      pickupAddress: 'A', pickupLatitude: 6.5, pickupLongitude: 3.3,
      dropoffAddress: 'B', dropoffLatitude: 6.6, dropoffLongitude: 3.4,
      scheduledAt: null, acceptedAt: null, startedAt: null, arrivedAt: null,
      completedAt: null, cancelledAt: null, cancellationReason: null,
      distanceMeters: null, durationSeconds: null, notes: null,
      createdAt: new Date(), updatedAt: new Date(),
      riderProfile: { id: 'rp-1', user: { id: 'u-r', displayName: 'Rider', phone: '+234' } },
      driverProfile: { id: 'dp-1', user: { id: 'u-d', displayName: 'Driver', phone: '+235' } },
      vehicle: { id: 'v-1', registrationNumber: 'ABC-123', vehicleType: 'REGULAR', make: 'Toyota', model: 'Camry', color: 'Black', year: 2022 },
      fareQuote: null, payment: null
    };

    mockPrisma.trip.findUnique.mockResolvedValueOnce(trip);
    mockPrisma.driverProfile.findUnique.mockResolvedValueOnce({ id: 'dp-1' });

    const result = await service.getTripForUser('t-d1', 'u-d', 'DRIVER');
    expect(result.driver?.name).toBe('Driver');
    expect(result.vehicle?.registrationNumber).toBe('ABC-123');
  });

  it('getTripForUser: throws 403 for driver not assigned to trip', async () => {
    mockPrisma.trip.findUnique.mockResolvedValueOnce({
      id: 't-d2', riderProfileId: 'rp-1', driverProfileId: 'dp-other'
    });
    mockPrisma.driverProfile.findUnique.mockResolvedValueOnce({ id: 'dp-1' });

    await expect(service.getTripForUser('t-d2', 'u-d', 'DRIVER')).rejects.toThrow('not assigned');
  });

  it('getTripForUser: throws 404 for missing trip', async () => {
    mockPrisma.trip.findUnique.mockResolvedValueOnce(null);

    await expect(service.getTripForUser('nonexistent', 'u-1', 'RIDER')).rejects.toThrow('Trip not found');
  });

  // ── getActiveTrip ───────────────────────────────────────────────────────────

  it('getActiveTrip: returns the most recent non-terminal trip', async () => {
    mockPrisma.riderProfile.findUnique.mockResolvedValueOnce({ id: 'rp-1' });
    mockPrisma.trip.findFirst.mockResolvedValueOnce({
      id: 't-active', reference: 'RYD-ACT001', status: 'DRIVER_ARRIVING', serviceType: 'REGULAR',
      riderProfileId: 'rp-1', driverProfileId: 'dp-1', vehicleId: null,
      pickupAddress: 'A', pickupLatitude: 6.5, pickupLongitude: 3.3,
      dropoffAddress: 'B', dropoffLatitude: 6.6, dropoffLongitude: 3.4,
      scheduledAt: null, acceptedAt: null, startedAt: null, arrivedAt: null,
      completedAt: null, cancelledAt: null, cancellationReason: null,
      distanceMeters: null, durationSeconds: null, notes: null,
      createdAt: new Date(), updatedAt: new Date(),
      riderProfile: { id: 'rp-1', user: { id: 'u-1', displayName: 'Rider', phone: '+234' } },
      driverProfile: { id: 'dp-1', user: { id: 'u-d', displayName: 'Driver', phone: '+235' } },
      vehicle: null, fareQuote: null, payment: null
    });

    const result = await service.getActiveTrip('u-1');
    expect(result.trip?.id).toBe('t-active');
    expect(result.trip?.status).toBe('DRIVER_ARRIVING');
  });

  it('getActiveTrip: returns null when no active trip exists', async () => {
    mockPrisma.riderProfile.findUnique.mockResolvedValueOnce({ id: 'rp-1' });
    mockPrisma.trip.findFirst.mockResolvedValueOnce(null);

    const result = await service.getActiveTrip('u-1');
    expect(result.trip).toBeNull();
  });
});
