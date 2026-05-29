import { ShipmentsService } from '../src/shipments/shipments.service';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ServiceType } from '@prisma/client';

describe('ShipmentsService', () => {
  let service: ShipmentsService;

  const mockPrisma: any = {
    $transaction: jest.fn((callback) => callback(mockPrisma)),
    riderProfile: {
      findUnique: jest.fn(),
    },
    driverProfile: {
      findUnique: jest.fn(),
    },
    trip: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    fareQuote: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    shipment: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
    shipmentProof: {
      create: jest.fn(),
      count: jest.fn(),
    },
    tripEvent: {
      create: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  };

  const mockFareService = {
    calculateFare: jest.fn(),
    getFareQuote: jest.fn(),
  };

  const mockTripsService = {
    driverAcceptTrip: jest.fn(),
    transition: jest.fn(),
    getTripPin: jest.fn(),
  };

  const mockPaymentsService = {
    initiateMockPayment: jest.fn(),
    capturePaymentForTrip: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.$transaction.mockImplementation((callback: any) => callback(mockPrisma));
    service = new ShipmentsService(
      mockPrisma as any,
      mockFareService as any,
      mockTripsService as any,
      mockPaymentsService as any,
    );
  });

  describe('createQuote', () => {
    it('delegates to fareService with SHIPMENT category and package size', async () => {
      mockFareService.calculateFare.mockResolvedValue({ totalFare: 1200, baseFare: 800 });

      const result = await service.createQuote({
        pickupLatitude: 6.5,
        pickupLongitude: 3.3,
        dropoffLatitude: 6.6,
        dropoffLongitude: 3.4,
        packageSizeClass: 'MEDIUM',
      });

      expect(mockFareService.calculateFare).toHaveBeenCalledWith(
        expect.objectContaining({
          rideCategory: ServiceType.SHIPMENT,
          packageSizeClass: 'MEDIUM',
        }),
      );
      expect(result).toMatchObject({ totalFare: 1200, packageSizeClass: 'MEDIUM' });
    });
  });

  describe('createShipment', () => {
    it('rejects if fare quote is not for SHIPMENT', async () => {
      mockFareService.getFareQuote.mockResolvedValue({ id: 'fq-1', serviceType: ServiceType.REGULAR });

      await expect(
        service.createShipment('rider-1', {
          fareQuoteId: 'fq-1',
          pickupAddress: 'A',
          dropoffAddress: 'B',
          senderName: 'S',
          recipientName: 'R',
          recipientPhone: '080',
          packageSizeClass: 'SMALL',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects if rider already has an active non-terminal trip', async () => {
      mockFareService.getFareQuote.mockResolvedValue({
        id: 'fq-1',
        serviceType: ServiceType.SHIPMENT,
        pickupLatitude: 6.5,
        pickupLongitude: 3.3,
        dropoffLatitude: 6.6,
        dropoffLongitude: 3.4,
      });
      mockPrisma.riderProfile.findUnique.mockResolvedValue({ id: 'rp-1' });
      mockPrisma.trip.findFirst.mockResolvedValue({ id: 'trip-active', status: 'IN_PROGRESS' });

      await expect(
        service.createShipment('rider-1', {
          fareQuoteId: 'fq-1',
          pickupAddress: 'A',
          dropoffAddress: 'B',
          senderName: 'S',
          recipientName: 'R',
          recipientPhone: '080',
          packageSizeClass: 'SMALL',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates trip, shipment, trip event and initiates payment when valid', async () => {
      mockFareService.getFareQuote.mockResolvedValue({
        id: 'fq-1',
        serviceType: ServiceType.SHIPMENT,
        pickupLatitude: 6.5,
        pickupLongitude: 3.3,
        dropoffLatitude: 6.6,
        dropoffLongitude: 3.4,
      });
      mockPrisma.riderProfile.findUnique.mockResolvedValue({ id: 'rp-1' });
      mockPrisma.trip.findFirst.mockResolvedValue(null);
      mockPrisma.trip.create.mockResolvedValue({ id: 'trip-1' });
      mockPrisma.fareQuote.update.mockResolvedValue({});
      mockPrisma.shipment.create.mockResolvedValue({ id: 'sh-1', tripId: 'trip-1' });
      mockPrisma.tripEvent.create.mockResolvedValue({});
      mockPrisma.shipment.findUnique.mockResolvedValue({
        id: 'sh-1',
        tripId: 'trip-1',
        status: 'REQUESTED',
        senderName: 'S',
        recipientName: 'R',
        recipientPhone: '080',
        packageSizeClass: 'SMALL',
        trip: {
          id: 'trip-1',
          reference: 'RYD-ABC',
          status: 'REQUESTED',
          serviceType: ServiceType.SHIPMENT,
          riderProfileId: 'rp-1',
          driverProfileId: null,
          pickupAddress: 'A',
          pickupLatitude: 6.5,
          pickupLongitude: 3.3,
          dropoffAddress: 'B',
          dropoffLatitude: 6.6,
          dropoffLongitude: 3.4,
          fareQuote: { id: 'fq-1', totalFare: 1200, baseFare: 800, distanceFare: 300, timeFare: 100, extraFees: 0, serviceType: ServiceType.SHIPMENT },
          payment: null,
          driverProfile: null,
          vehicle: null,
          riderProfile: { id: 'rp-1', user: { id: 'rider-1', displayName: 'Rider', phone: '080' } },
          createdAt: new Date(),
          updatedAt: new Date(),
          scheduledAt: null,
          acceptedAt: null,
          startedAt: null,
          arrivedAt: null,
          completedAt: null,
          cancelledAt: null,
          cancellationReason: null,
        },
        proofs: [],
        deliveredAt: null,
        cancelledAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.createShipment('rider-1', {
        fareQuoteId: 'fq-1',
        pickupAddress: 'A',
        dropoffAddress: 'B',
        senderName: 'S',
        recipientName: 'R',
        recipientPhone: '080',
        packageSizeClass: 'SMALL',
      });

      expect(mockPrisma.trip.create).toHaveBeenCalled();
      expect(mockPrisma.shipment.create).toHaveBeenCalled();
      expect(mockPrisma.tripEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ eventType: 'SHIPMENT_CREATED' }),
        }),
      );
      expect(mockPaymentsService.initiateMockPayment).toHaveBeenCalledWith('rider-1', 'trip-1');
    });
  });

  describe('driverAcceptShipment', () => {
    it('rejects if shipment is not in REQUESTED status', async () => {
      mockPrisma.shipment.findUnique.mockResolvedValue({ id: 'sh-1', tripId: 'trip-1', status: 'DRIVER_ASSIGNED' });

      await expect(service.driverAcceptShipment('sh-1', 'driver-1')).rejects.toThrow(BadRequestException);
    });

    it('accepts trip and updates shipment to DRIVER_ASSIGNED', async () => {
      mockPrisma.driverProfile.findUnique.mockResolvedValue({ id: 'dp-1' });
      mockPrisma.shipment.findUnique
        .mockResolvedValueOnce({ id: 'sh-1', tripId: 'trip-1', status: 'REQUESTED' })
        .mockResolvedValueOnce({
        id: 'sh-1',
        tripId: 'trip-1',
        status: 'DRIVER_ASSIGNED',
        senderName: 'S',
        recipientName: 'R',
        recipientPhone: '080',
        packageSizeClass: 'SMALL',
        trip: {
          id: 'trip-1',
          reference: 'RYD-ABC',
          status: 'DRIVER_ASSIGNED',
          serviceType: ServiceType.SHIPMENT,
          riderProfileId: 'rp-1',
          driverProfileId: 'dp-1',
          pickupAddress: 'A',
          pickupLatitude: 6.5,
          pickupLongitude: 3.3,
          dropoffAddress: 'B',
          dropoffLatitude: 6.6,
          dropoffLongitude: 3.4,
          fareQuote: { id: 'fq-1', totalFare: 1200, baseFare: 800, distanceFare: 300, timeFare: 100, extraFees: 0, serviceType: ServiceType.SHIPMENT },
          payment: null,
          driverProfile: { id: 'dp-1', user: { id: 'driver-1', displayName: 'Driver', phone: '080' } },
          vehicle: null,
          riderProfile: { id: 'rp-1', user: { id: 'rider-1', displayName: 'Rider', phone: '080' } },
          createdAt: new Date(),
          updatedAt: new Date(),
          scheduledAt: null,
          acceptedAt: new Date(),
          startedAt: null,
          arrivedAt: null,
          completedAt: null,
          cancelledAt: null,
          cancellationReason: null,
        },
        proofs: [],
        deliveredAt: null,
        cancelledAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.driverAcceptShipment('sh-1', 'driver-1');

      expect(mockTripsService.driverAcceptTrip).toHaveBeenCalledWith('trip-1', 'driver-1');
      expect(mockPrisma.shipment.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'DRIVER_ASSIGNED' }) }),
      );
    });
  });

  describe('confirmPickup', () => {
    it('transitions trip to PIN_VERIFIED then IN_PROGRESS and updates shipment to IN_TRANSIT', async () => {
      mockPrisma.driverProfile.findUnique.mockResolvedValue({ id: 'dp-1' });
      mockPrisma.shipment.findUnique.mockResolvedValue({
        id: 'sh-1',
        tripId: 'trip-1',
        status: 'PICKUP_ARRIVED',
        trip: { driverProfileId: 'dp-1', status: 'DRIVER_ARRIVED' },
      });

      const result = await service.confirmPickup('sh-1', 'driver-1', '1234');

      expect(mockTripsService.transition).toHaveBeenCalledWith('trip-1', 'driver-1', 'PIN_VERIFIED', { pin: '1234' });
      expect(mockTripsService.transition).toHaveBeenCalledWith('trip-1', 'driver-1', 'IN_PROGRESS');
      expect(mockPrisma.shipment.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'IN_TRANSIT' }) }),
      );
      expect(result.status).toBe('IN_TRANSIT');
    });
  });

  describe('submitProof', () => {
    it('rejects if trip is not IN_PROGRESS', async () => {
      mockPrisma.driverProfile.findUnique.mockResolvedValue({ id: 'dp-1' });
      mockPrisma.shipment.findUnique.mockResolvedValue({
        id: 'sh-1',
        tripId: 'trip-1',
        status: 'REQUESTED',
        trip: { driverProfileId: 'dp-1', status: 'REQUESTED' },
      });

      await expect(
        service.submitProof('sh-1', 'driver-1', { url: 'https://example.com/proof.jpg' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates proof and trip event when in transit', async () => {
      mockPrisma.driverProfile.findUnique.mockResolvedValue({ id: 'dp-1' });
      mockPrisma.shipment.findUnique.mockResolvedValue({
        id: 'sh-1',
        tripId: 'trip-1',
        status: 'IN_TRANSIT',
        trip: { driverProfileId: 'dp-1', status: 'IN_PROGRESS' },
      });
      mockPrisma.trip.findUnique.mockResolvedValue({ status: 'IN_PROGRESS' });
      mockPrisma.shipmentProof.create.mockResolvedValue({
        id: 'proof-1',
        proofType: 'PHOTO_URL',
        url: 'https://example.com/proof.jpg',
        notes: null,
        submittedBy: 'driver-1',
        submittedAt: new Date(),
      });

      const result = await service.submitProof('sh-1', 'driver-1', { url: 'https://example.com/proof.jpg' });

      expect(mockPrisma.shipmentProof.create).toHaveBeenCalled();
      expect(mockPrisma.tripEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ eventType: 'SHIPMENT_PROOF_SUBMITTED' }),
        }),
      );
      expect(result.url).toBe('https://example.com/proof.jpg');
    });
  });

  describe('confirmDelivery', () => {
    it('rejects if no proof has been submitted', async () => {
      mockPrisma.driverProfile.findUnique.mockResolvedValue({ id: 'dp-1' });
      mockPrisma.shipment.findUnique.mockResolvedValue({
        id: 'sh-1',
        tripId: 'trip-1',
        status: 'IN_TRANSIT',
        trip: { driverProfileId: 'dp-1', status: 'IN_PROGRESS' },
      });
      mockPrisma.trip.findUnique.mockResolvedValue({ status: 'IN_PROGRESS' });
      mockPrisma.shipmentProof.count.mockResolvedValue(0);

      await expect(service.confirmDelivery('sh-1', 'driver-1')).rejects.toThrow(
        'Proof of delivery must be submitted before confirming delivery.',
      );
    });

    it('completes trip and marks shipment DELIVERED when proof exists', async () => {
      mockPrisma.driverProfile.findUnique.mockResolvedValue({ id: 'dp-1' });
      mockPrisma.shipment.findUnique.mockResolvedValue({
        id: 'sh-1',
        tripId: 'trip-1',
        status: 'IN_TRANSIT',
        trip: { driverProfileId: 'dp-1', status: 'IN_PROGRESS' },
      });
      mockPrisma.trip.findUnique.mockResolvedValue({ status: 'IN_PROGRESS' });
      mockPrisma.shipmentProof.count.mockResolvedValue(1);
      mockPrisma.shipment.update.mockResolvedValue({});
      mockPrisma.tripEvent.create.mockResolvedValue({});

      const result = await service.confirmDelivery('sh-1', 'driver-1');

      expect(mockTripsService.transition).toHaveBeenCalledWith('trip-1', 'driver-1', 'COMPLETED');
      expect(mockPrisma.shipment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'DELIVERED', deliveredAt: expect.any(Date) }),
        }),
      );
      expect(mockPrisma.tripEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ eventType: 'SHIPMENT_DELIVERED' }),
        }),
      );
      expect(result.status).toBe('DELIVERED');
      expect(result.tripStatus).toBe('COMPLETED');
    });
  });

  describe('adminResolveShipment', () => {
    it('resolves undelivered shipment, completes trip, and captures payment', async () => {
      mockPrisma.shipment.findUnique.mockResolvedValue({
        id: 'sh-1',
        tripId: 'trip-1',
        status: 'IN_TRANSIT',
      });
      mockPrisma.shipmentProof.create.mockResolvedValue({});
      mockPrisma.shipment.update.mockResolvedValue({});
      mockPrisma.trip.update.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});
      mockPrisma.trip.findUnique.mockResolvedValue({ driverProfileId: 'dp-1' });
      mockPaymentsService.capturePaymentForTrip.mockResolvedValue(undefined);

      const result = await service.adminResolveShipment('sh-1', 'admin-1', 'Force delivered', 'Customer complaint');

      expect(mockPrisma.shipmentProof.create).toHaveBeenCalled();
      expect(mockPrisma.shipment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'DELIVERED', deliveredAt: expect.any(Date) }),
        }),
      );
      expect(mockPrisma.trip.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'COMPLETED', completedAt: expect.any(Date) }),
        }),
      );
      expect(mockPaymentsService.capturePaymentForTrip).toHaveBeenCalledWith('trip-1', 'dp-1');
      expect(result.success).toBe(true);
    });

    it('rejects if shipment is already delivered', async () => {
      mockPrisma.shipment.findUnique.mockResolvedValue({
        id: 'sh-1',
        tripId: 'trip-1',
        status: 'DELIVERED',
      });

      await expect(
        service.adminResolveShipment('sh-1', 'admin-1', 'Force delivered'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('adminForceStatus', () => {
    it('forces shipment to CANCELLED and trip to CANCELLED_BY_DRIVER', async () => {
      mockPrisma.shipment.findUnique.mockResolvedValue({
        id: 'sh-1',
        tripId: 'trip-1',
        status: 'REQUESTED',
      });
      mockPrisma.$transaction.mockImplementation((callback: any) => callback(mockPrisma));

      const result = await service.adminForceStatus('sh-1', 'admin-1', 'CANCELLED', 'Rider request');

      expect(mockPrisma.shipment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'CANCELLED', cancelledAt: expect.any(Date) }),
        }),
      );
      expect(mockPrisma.trip.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'CANCELLED_BY_DRIVER' }),
        }),
      );
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('rejects forcing a delivered shipment', async () => {
      mockPrisma.shipment.findUnique.mockResolvedValue({
        id: 'sh-1',
        tripId: 'trip-1',
        status: 'DELIVERED',
      });

      await expect(
        service.adminForceStatus('sh-1', 'admin-1', 'CANCELLED'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
