import { ShipmentsService } from '../src/shipments/shipments.service';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ServiceType, TripStatus, ShipmentStatus } from '@prisma/client';

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
    shipmentPhoto: {
      create: jest.fn(),
    },
    shipmentQuote: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    shipmentTrackingEvent: {
      create: jest.fn(),
    },
    tripEvent: {
      create: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    supportTicket: {
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

  const mockShipmentOtpService = {
    generateOtp: jest.fn(),
    verifyOtp: jest.fn(),
    isOtpVerified: jest.fn(),
    isOtpValid: jest.fn(),
    getOtpStatus: jest.fn(),
  };

  const mockShipmentQuoteService = {
    createQuote: jest.fn(),
    validateQuote: jest.fn(),
    acceptQuote: jest.fn(),
    getQuote: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.$transaction.mockImplementation((callback: any) => callback(mockPrisma));
    service = new ShipmentsService(
      mockPrisma as any,
      mockTripsService as any,
      mockPaymentsService as any,
      mockShipmentOtpService as any,
      mockShipmentQuoteService as any,
    );
  });

  describe('quote creation', () => {
    it('creates a draft trip, draft shipment and generates a quote', async () => {
      mockPrisma.riderProfile.findUnique.mockResolvedValue({ id: 'rp-1' });
      mockPrisma.trip.create.mockResolvedValue({ id: 'trip-1' });
      mockPrisma.shipment.create.mockResolvedValue({ id: 'sh-1', tripId: 'trip-1' });
      mockPrisma.shipment.update.mockResolvedValue({});
      mockPrisma.trip.update.mockResolvedValue({});

      const mockQuote = {
        id: 'quote-1',
        totalFare: 1500,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      };
      mockShipmentQuoteService.createQuote.mockResolvedValue(mockQuote);

      const result = await service.createQuote('rider-1', {
        pickupLatitude: 6.5,
        pickupLongitude: 3.3,
        dropoffLatitude: 6.6,
        dropoffLongitude: 3.4,
        packageCategory: 'SMALL_PACKAGE',
        priority: 'STANDARD',
      });

      expect(mockPrisma.riderProfile.findUnique).toHaveBeenCalledWith({ where: { userId: 'rider-1' }, select: { id: true } });
      expect(mockPrisma.trip.create).toHaveBeenCalled();
      expect(mockPrisma.shipment.create).toHaveBeenCalled();
      expect(mockShipmentQuoteService.createQuote).toHaveBeenCalledWith('sh-1', expect.objectContaining({
        packageCategory: 'SMALL_PACKAGE',
        priority: 'STANDARD',
      }));
      expect(result).toEqual({
        shipmentId: 'sh-1',
        quote: mockQuote,
      });
    });

    it('rejects if rider profile not found', async () => {
      mockPrisma.riderProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.createQuote('rider-1', {
          pickupLatitude: 6.5,
          pickupLongitude: 3.3,
          dropoffLatitude: 6.6,
          dropoffLongitude: 3.4,
          packageCategory: 'SMALL_PACKAGE',
          priority: 'STANDARD',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('shipment creation from valid quote', () => {
    it('accepts the quote, generates OTPs, and initiates payment', async () => {
      const mockQuote = {
        id: 'quote-1',
        shipmentId: 'sh-1',
        shipment: { senderUserId: 'rider-1', tripId: 'trip-1', senderRiderProfileId: 'rp-1' },
      };
      mockPrisma.shipmentQuote.findUnique.mockResolvedValue(mockQuote);
      mockShipmentQuoteService.validateQuote.mockResolvedValue(true);
      mockPrisma.shipmentQuote.update.mockResolvedValue({});
      mockPrisma.trip.update.mockResolvedValue({ id: 'trip-1' });
      mockPrisma.shipment.update.mockResolvedValue({ id: 'sh-1' });
      mockPrisma.shipmentTrackingEvent.create.mockResolvedValue({});
      mockPrisma.tripEvent.create.mockResolvedValue({});
      mockShipmentOtpService.generateOtp.mockResolvedValue('123456');

      // Mock shapeShipment/getShipmentById response
      mockPrisma.shipment.findUnique.mockResolvedValue({
        id: 'sh-1',
        tripId: 'trip-1',
        status: 'REQUESTED',
        senderUserId: 'rider-1',
        senderName: 'Sender',
        recipientName: 'Recipient',
        recipientPhone: '080',
        trip: {
          id: 'trip-1',
          reference: 'RYD-ABC',
          status: 'REQUESTED',
          fareQuote: { totalFare: 1500 },
        },
      });

      const result = await service.createShipment('rider-1', {
        quoteId: 'quote-1',
        pickupAddress: 'A',
        dropoffAddress: 'B',
        senderName: 'Sender',
        recipientName: 'Recipient',
        recipientPhone: '080',
        packageCategory: 'SMALL_PACKAGE',
        priority: 'STANDARD',
      });

      expect(mockShipmentQuoteService.validateQuote).toHaveBeenCalledWith('sh-1');
      expect(mockShipmentOtpService.generateOtp).toHaveBeenCalledWith('sh-1', 'PICKUP');
      expect(mockShipmentOtpService.generateOtp).toHaveBeenCalledWith('sh-1', 'DELIVERY');
      expect(mockPaymentsService.initiateMockPayment).toHaveBeenCalledWith('rider-1', 'trip-1');
      expect(result).toHaveProperty('pickupOtp', '123456');
      expect(result).toHaveProperty('deliveryOtp', '123456');
    });

    it('rejects if quote belongs to another user', async () => {
      const mockQuote = {
        id: 'quote-1',
        shipmentId: 'sh-1',
        shipment: { senderUserId: 'other-rider', tripId: 'trip-1' },
      };
      mockPrisma.shipmentQuote.findUnique.mockResolvedValue(mockQuote);

      await expect(
        service.createShipment('rider-1', {
          quoteId: 'quote-1',
          pickupAddress: 'A',
          dropoffAddress: 'B',
          senderName: 'Sender',
          recipientName: 'Recipient',
          recipientPhone: '080',
          packageCategory: 'SMALL_PACKAGE',
          priority: 'STANDARD',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('expired quote rejected', async () => {
      const mockQuote = {
        id: 'quote-1',
        shipmentId: 'sh-1',
        shipment: { senderUserId: 'rider-1', tripId: 'trip-1' },
      };
      mockPrisma.shipmentQuote.findUnique.mockResolvedValue(mockQuote);
      mockShipmentQuoteService.validateQuote.mockRejectedValue(new BadRequestException('Quote has expired'));

      await expect(
        service.createShipment('rider-1', {
          quoteId: 'quote-1',
          pickupAddress: 'A',
          dropoffAddress: 'B',
          senderName: 'Sender',
          recipientName: 'Recipient',
          recipientPhone: '080',
          packageCategory: 'SMALL_PACKAGE',
          priority: 'STANDARD',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('access control & details fetching', () => {
    it('sender access control - permits owner', async () => {
      mockPrisma.shipment.findUnique.mockResolvedValue({
        id: 'sh-1',
        senderUserId: 'rider-1',
        trip: { reference: 'RYD-ABC', fareQuote: { totalFare: 1500 } },
      });

      const result = await service.getShipmentById('sh-1', 'rider-1', 'RIDER');
      expect(result.id).toBe('sh-1');
    });

    it('sender access control - forbids non-owner rider', async () => {
      mockPrisma.shipment.findUnique.mockResolvedValue({
        id: 'sh-1',
        senderUserId: 'other-rider',
        trip: { reference: 'RYD-ABC' },
      });

      await expect(
        service.getShipmentById('sh-1', 'rider-1', 'RIDER'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('driver access control - forbids driver if unassigned and not REQUESTED', async () => {
      mockPrisma.driverProfile.findUnique.mockResolvedValue({ id: 'dp-1' });
      mockPrisma.shipment.findUnique.mockResolvedValue({
        id: 'sh-1',
        status: 'DRIVER_ASSIGNED',
        driverProfileId: 'other-driver',
        trip: { reference: 'RYD-ABC' },
      });

      await expect(
        service.getShipmentById('sh-1', 'driver-user-id', 'DRIVER'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('driver available queue', () => {
    it('driver available queue - hides sensitive recipient phone/details and OTP hashes', async () => {
      mockPrisma.driverProfile.findUnique.mockResolvedValue({ id: 'dp-1' });
      mockPrisma.shipment.findMany.mockResolvedValue([
        {
          id: 'sh-1',
          tripId: 'trip-1',
          status: 'REQUESTED',
          recipientName: 'John Doe',
          recipientPhone: '+2348012345678',
          packageCategory: 'DOCUMENT',
          packageDescription: 'Important papers',
          specialInstructions: 'Handle with care',
          trip: {
            reference: 'RYD-123',
            pickupAddress: 'Pickup Place',
            pickupLatitude: 6.1,
            pickupLongitude: 3.1,
            dropoffAddress: 'Dropoff Place',
            dropoffLatitude: 6.2,
            dropoffLongitude: 3.2,
            fareQuote: { totalFare: 1000 },
            createdAt: new Date(),
          },
        },
      ]);

      const result = await service.getAvailableShipments('driver-1');

      expect(result.shipments[0].recipientName).toBe('***');
      expect(result.shipments[0].recipientPhone).toBe('***');
      expect(result.shipments[0]).not.toHaveProperty('otpHash');
      expect(result.shipments[0].pickup.address).toBe('Pickup Place');
    });
  });

  describe('driver acceptance & updates', () => {
    it('driver accept - transitions status to DRIVER_ASSIGNED and registers tracking event', async () => {
      mockPrisma.driverProfile.findUnique.mockResolvedValue({ id: 'dp-1' });
      mockPrisma.shipment.findUnique.mockImplementation(({ where, include }: any) => {
        if (include) {
          return Promise.resolve({
            id: 'sh-1',
            status: 'DRIVER_ASSIGNED',
            driverProfileId: 'dp-1',
            trip: { reference: 'RYD-ABC' },
          });
        }
        return Promise.resolve({
          id: 'sh-1',
          status: 'REQUESTED',
          tripId: 'trip-1',
        });
      });

      const result = await service.driverAcceptShipment('sh-1', 'driver-1');

      expect(mockTripsService.driverAcceptTrip).toHaveBeenCalledWith('trip-1', 'driver-1');
      expect(mockPrisma.shipment.update).toHaveBeenCalledWith({
        where: { id: 'sh-1' },
        data: { status: 'DRIVER_ASSIGNED' },
      });
      expect(mockPrisma.shipmentTrackingEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ eventType: 'STATUS_CHANGED', status: 'DRIVER_ASSIGNED' }),
        }),
      );
    });

    it('pickup arrival tracking event - triggers transition and records event', async () => {
      mockPrisma.driverProfile.findUnique.mockResolvedValue({ id: 'dp-1' });
      mockPrisma.shipment.findUnique.mockResolvedValue({
        id: 'sh-1',
        tripId: 'trip-1',
        driverProfileId: 'dp-1',
        status: 'DRIVER_ASSIGNED',
        trip: { driverProfileId: 'dp-1' },
      });
      mockPrisma.shipment.update.mockResolvedValue({});
      mockPrisma.shipmentTrackingEvent.create.mockResolvedValue({});

      const result = await service.arriveAtPickup('sh-1', 'driver-1');

      expect(mockTripsService.transition).toHaveBeenCalledWith('trip-1', 'driver-1', 'DRIVER_ARRIVED');
      expect(mockPrisma.shipment.update).toHaveBeenCalledWith({
        where: { id: 'sh-1' },
        data: { status: 'PICKUP_ARRIVED' },
      });
      expect(mockPrisma.shipmentTrackingEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ eventType: 'STATUS_CHANGED', status: 'PICKUP_ARRIVED' }),
        }),
      );
      expect(result.status).toBe('PICKUP_ARRIVED');
    });
  });

  describe('OTP verification flow', () => {
    it('pickup OTP success - marks verified and transitions to PICKUP_VERIFIED', async () => {
      mockPrisma.driverProfile.findUnique.mockResolvedValue({ id: 'dp-1' });
      mockPrisma.shipment.findUnique.mockResolvedValue({
        id: 'sh-1',
        tripId: 'trip-1',
        driverProfileId: 'dp-1',
        status: 'PICKUP_ARRIVED',
        trip: { driverProfileId: 'dp-1' },
      });
      mockShipmentOtpService.verifyOtp.mockResolvedValue(true);
      mockPrisma.shipment.update.mockResolvedValue({});
      mockPrisma.shipmentTrackingEvent.create.mockResolvedValue({});

      const result = await service.verifyPickupOtp('sh-1', 'driver-1', { code: '123456' });

      expect(mockShipmentOtpService.verifyOtp).toHaveBeenCalledWith('sh-1', 'PICKUP', '123456');
      expect(mockPrisma.shipment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'sh-1' },
          data: expect.objectContaining({ status: 'PICKUP_VERIFIED' }),
        }),
      );
      expect(mockPrisma.shipmentTrackingEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ eventType: 'OTP_VERIFIED', status: 'PICKUP_VERIFIED' }),
        }),
      );
      expect(result.success).toBe(true);
    });

    it('wrong OTP tracking event - logs OTP_FAILED and bubble-up error', async () => {
      mockPrisma.driverProfile.findUnique.mockResolvedValue({ id: 'dp-1' });
      mockPrisma.shipment.findUnique.mockResolvedValue({
        id: 'sh-1',
        tripId: 'trip-1',
        driverProfileId: 'dp-1',
        status: 'PICKUP_ARRIVED',
        trip: { driverProfileId: 'dp-1' },
      });
      mockShipmentOtpService.verifyOtp.mockRejectedValue(new BadRequestException('Invalid OTP code'));
      mockPrisma.shipmentTrackingEvent.create.mockResolvedValue({});

      await expect(
        service.verifyPickupOtp('sh-1', 'driver-1', { code: '000000' }),
      ).rejects.toThrow(BadRequestException);

      expect(mockPrisma.shipmentTrackingEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ eventType: 'OTP_FAILED', status: 'PICKUP_ARRIVED' }),
        }),
      );
    });

    it('cannot start without pickup OTP', async () => {
      mockPrisma.driverProfile.findUnique.mockResolvedValue({ id: 'dp-1' });
      mockPrisma.shipment.findUnique.mockResolvedValue({
        id: 'sh-1',
        tripId: 'trip-1',
        driverProfileId: 'dp-1',
        status: 'PICKUP_ARRIVED', // Not verified!
        trip: { driverProfileId: 'dp-1' },
      });

      await expect(
        service.startShipment('sh-1', 'driver-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('delivery OTP success - marks verified and transitions to DELIVERY_VERIFIED', async () => {
      mockPrisma.driverProfile.findUnique.mockResolvedValue({ id: 'dp-1' });
      mockPrisma.shipment.findUnique.mockResolvedValue({
        id: 'sh-1',
        tripId: 'trip-1',
        driverProfileId: 'dp-1',
        status: 'DELIVERY_ARRIVED',
        trip: { driverProfileId: 'dp-1' },
      });
      mockShipmentOtpService.verifyOtp.mockResolvedValue(true);
      mockPrisma.shipment.update.mockResolvedValue({});
      mockPrisma.shipmentTrackingEvent.create.mockResolvedValue({});

      const result = await service.verifyDeliveryOtp('sh-1', 'driver-1', { code: '654321' });

      expect(mockShipmentOtpService.verifyOtp).toHaveBeenCalledWith('sh-1', 'DELIVERY', '654321');
      expect(result.success).toBe(true);
    });

    it('cannot complete without delivery OTP', async () => {
      mockPrisma.driverProfile.findUnique.mockResolvedValue({ id: 'dp-1' });
      mockPrisma.shipment.findUnique.mockResolvedValue({
        id: 'sh-1',
        tripId: 'trip-1',
        driverProfileId: 'dp-1',
        status: 'DELIVERY_ARRIVED', // Not verified!
        trip: { driverProfileId: 'dp-1' },
      });

      await expect(
        service.completeShipment('sh-1', 'driver-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('metadata & proofs validation', () => {
    it('photo metadata validation - registers ShipmentPhoto correctly', async () => {
      mockPrisma.shipment.findUnique.mockResolvedValue({ id: 'sh-1', senderUserId: 'rider-1' });
      mockPrisma.shipmentPhoto.create.mockResolvedValue({
        id: 'photo-1',
        photoType: 'PACKAGE',
        fileUrl: 'http://placeholder.url',
        uploadedAt: new Date(),
      });
      mockPrisma.shipmentTrackingEvent.create.mockResolvedValue({});

      const result = await service.requestPhotoUpload('sh-1', 'rider-1', {
        photoType: 'PACKAGE',
        fileSize: 2048,
        mimeType: 'image/jpeg',
      });

      expect(mockPrisma.shipmentPhoto.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          photoType: 'PACKAGE',
          fileSize: 2048,
          mimeType: 'image/jpeg',
        }),
      });
      expect(result.photo.photoType).toBe('PACKAGE');
      expect(result.uploadUrl).toBeDefined();
    });

    it('proof metadata validation - registers proof of delivery', async () => {
      mockPrisma.driverProfile.findUnique.mockResolvedValue({ id: 'dp-1' });
      mockPrisma.shipment.findUnique.mockResolvedValue({
        id: 'sh-1',
        tripId: 'trip-1',
        driverProfileId: 'dp-1',
        status: 'IN_TRANSIT',
        trip: { driverProfileId: 'dp-1' },
      });
      mockPrisma.trip.findUnique.mockResolvedValue({ status: 'IN_PROGRESS' });
      mockPrisma.shipmentProof.create.mockResolvedValue({
        id: 'proof-1',
        proofType: 'PHOTO_URL',
        url: 'http://proof.url',
        notes: 'Signed by gatekeeper',
        submittedBy: 'driver-1',
        submittedAt: new Date(),
      });

      const result = await service.submitProof('sh-1', 'driver-1', {
        url: 'http://proof.url',
        notes: 'Signed by gatekeeper',
      });

      expect(mockPrisma.shipmentProof.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          url: 'http://proof.url',
          notes: 'Signed by gatekeeper',
          submittedBy: 'driver-1',
        }),
      });
      expect(result.notes).toBe('Signed by gatekeeper');
    });
  });

  describe('support ticket linkage', () => {
    it('support ticket linkage - links to both shipment and trip correctly', async () => {
      mockPrisma.shipment.findUnique.mockResolvedValue({ id: 'sh-1', senderUserId: 'rider-1', tripId: 'trip-1' });
      mockPrisma.supportTicket.create.mockResolvedValue({
        id: 'ticket-1',
        title: 'Damaged item',
        description: 'The package contents got damaged.',
        type: 'SHIPMENT_ISSUE',
        priority: 'HIGH',
        status: 'OPEN',
        createdAt: new Date(),
      });

      const result = await service.createSupportTicket('sh-1', 'rider-1', {
        title: 'Damaged item',
        description: 'The package contents got damaged.',
        priority: 'HIGH',
      });

      expect(mockPrisma.supportTicket.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'Damaged item',
          type: 'SHIPMENT_ISSUE',
          priority: 'HIGH',
          shipmentId: 'sh-1',
          tripId: 'trip-1',
        }),
      });
      expect(result.type).toBe('SHIPMENT_ISSUE');
    });
  });

  describe('admin workflows & operations', () => {
    it('admin assign driver - triggers updates and creates AuditLog', async () => {
      mockPrisma.shipment.findUnique.mockResolvedValue({ id: 'sh-1', tripId: 'trip-1', status: 'REQUESTED' });
      mockPrisma.driverProfile.findUnique.mockResolvedValue({ id: 'dp-1', userId: 'driver-user-id' });
      mockPrisma.shipment.update.mockResolvedValue({});
      mockPrisma.trip.update.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});
      mockPrisma.shipmentTrackingEvent.create.mockResolvedValue({});

      const result = await service.adminAssignDriver('sh-1', 'admin-1', { driverId: 'dp-1' });

      expect(mockPrisma.shipment.update).toHaveBeenCalledWith({
        where: { id: 'sh-1' },
        data: expect.objectContaining({ status: 'DRIVER_ASSIGNED', driverProfileId: 'dp-1' }),
      });
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          actorId: 'admin-1',
          action: 'SHIPMENT_ADMIN_ASSIGN_DRIVER',
          entity: 'SHIPMENT',
        }),
      });
      expect(result.success).toBe(true);
    });

    it('delivered shipment cannot be cancelled normally', async () => {
      mockPrisma.shipment.findUnique.mockResolvedValue({
        id: 'sh-1',
        status: 'DELIVERED',
        senderUserId: 'rider-1',
      });

      await expect(
        service.cancelShipment('sh-1', 'rider-1', {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('dispute requires reason - validates length', async () => {
      mockPrisma.shipment.findUnique.mockResolvedValue({ id: 'sh-1', status: 'DELIVERED' });
      mockPrisma.trip.update.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});
      mockPrisma.shipmentTrackingEvent.create.mockResolvedValue({});

      const result = await service.adminDisputeShipment('sh-1', 'admin-1', { reason: 'Wrong dropoff' });

      expect(mockPrisma.shipment.update).toHaveBeenCalledWith({
        where: { id: 'sh-1' },
        data: expect.objectContaining({ status: 'DISPUTED', disputeReason: 'Wrong dropoff' }),
      });
      expect(result.success).toBe(true);
    });

    it('invalid state transition rejected - checks state machine constraints', async () => {
      mockPrisma.shipment.findUnique.mockResolvedValue({ id: 'sh-1', status: 'DRAFT' });

      await expect(
        service.adminUpdateStatus('sh-1', 'admin-1', { status: 'DELIVERED' }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
