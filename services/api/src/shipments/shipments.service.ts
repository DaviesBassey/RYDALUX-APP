import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { TripsService } from '../trips/trips.service';
import { PaymentsService } from '../payments/payments.service';
import { ShipmentOtpService } from './shipment-otp.service';
import { ShipmentQuoteService } from './shipment-quote.service';
import { ShipmentStateMachine } from './shipment-state-machine';
import { CreateShipmentQuoteDto } from './dto/create-shipment-quote.dto';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { CancelShipmentDto } from './dto/cancel-shipment.dto';
import { DisputeShipmentDto } from './dto/dispute-shipment.dto';
import { AssignShipmentDriverDto } from './dto/assign-shipment-driver.dto';
import { VerifyShipmentOtpDto } from './dto/verify-shipment-otp.dto';
import { ShipmentProofDto } from './dto/shipment-proof.dto';
import { ShipmentPhotoUploadRequestDto } from './dto/shipment-photo-upload-request.dto';
import { ShipmentListQueryDto } from './dto/shipment-list-query.dto';
import { AdminShipmentListQueryDto } from './dto/admin-shipment-list-query.dto';
import { UpdateShipmentStatusDto } from './dto/update-shipment-status.dto';
import { CreateShipmentSupportTicketDto } from './dto/create-shipment-support-ticket.dto';
import { ServiceType, TripStatus, ShipmentStatus } from '@prisma/client';

const NON_TERMINAL_STATUSES: TripStatus[] = [
  'DRAFT', 'QUOTED', 'REQUESTED', 'DRIVER_ASSIGNED',
  'DRIVER_ARRIVING', 'DRIVER_ARRIVED', 'PIN_VERIFIED', 'IN_PROGRESS',
];

const DRIVER_ACTIVE_STATUSES: TripStatus[] = [
  'DRIVER_ARRIVING', 'DRIVER_ARRIVED', 'PIN_VERIFIED', 'IN_PROGRESS',
];

@Injectable()
export class ShipmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tripsService: TripsService,
    private readonly paymentsService: PaymentsService,
    private readonly shipmentOtpService: ShipmentOtpService,
    private readonly shipmentQuoteService: ShipmentQuoteService,
  ) {}

  // ── Rider/Customer ──────────────────────────────────────────────────────────

  async createQuote(userId: string, dto: CreateShipmentQuoteDto) {
    const riderProfile = await this.prisma.riderProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!riderProfile) {
      throw new ForbiddenException('Rider profile not found. Complete profile setup first.');
    }

    const reference = `RYD-${randomUUID().replace(/-/g, '').substring(0, 8).toUpperCase()}`;

    // Create DRAFT Trip & Shipment in transaction
    const { shipment } = await this.prisma.$transaction(async (tx: any) => {
      const trip = await tx.trip.create({
        data: {
          reference,
          riderProfileId: riderProfile.id,
          status: 'DRAFT' as TripStatus,
          serviceType: ServiceType.SHIPMENT,
          pickupAddress: 'Draft Pickup Address',
          dropoffAddress: 'Draft Dropoff Address',
          pickupLatitude: dto.pickupLatitude,
          pickupLongitude: dto.pickupLongitude,
          dropoffLatitude: dto.dropoffLatitude,
          dropoffLongitude: dto.dropoffLongitude,
        },
      });

      const shipment = await tx.shipment.create({
        data: {
          id: randomUUID(),
          tripId: trip.id,
          senderUserId: userId,
          senderRiderProfileId: riderProfile.id,
          status: 'DRAFT' as ShipmentStatus,
          pickupAddress: 'Draft Pickup Address',
          pickupLatitude: dto.pickupLatitude,
          pickupLongitude: dto.pickupLongitude,
          dropoffAddress: 'Draft Dropoff Address',
          dropoffLatitude: dto.dropoffLatitude,
          dropoffLongitude: dto.dropoffLongitude,
          recipientName: 'Draft Recipient',
          recipientPhone: '0000000000',
          packageCategory: dto.packageCategory,
          priority: dto.priority,
          declaredValue: dto.declaredValue ?? null,
        },
      });

      return { shipment };
    });

    // Create quote using ShipmentQuoteService
    const quote = await this.shipmentQuoteService.createQuote(shipment.id, {
      pickupLatitude: dto.pickupLatitude,
      pickupLongitude: dto.pickupLongitude,
      dropoffLatitude: dto.dropoffLatitude,
      dropoffLongitude: dto.dropoffLongitude,
      packageCategory: dto.packageCategory,
      priority: dto.priority,
      declaredValue: dto.declaredValue,
      weight: dto.weight,
    });

    // Update status to QUOTED
    await this.prisma.$transaction(async (tx: any) => {
      await tx.shipment.update({
        where: { id: shipment.id },
        data: { status: 'QUOTED' as ShipmentStatus },
      });
      await tx.trip.update({
        where: { id: shipment.tripId },
        data: { status: 'QUOTED' as TripStatus },
      });
    });

    return {
      shipmentId: shipment.id,
      quote,
    };
  }

  async createShipment(userId: string, dto: CreateShipmentDto) {
    const quote = await this.prisma.shipmentQuote.findUnique({
      where: { id: dto.quoteId },
      include: { shipment: true },
    });
    if (!quote || !quote.shipment) {
      throw new NotFoundException('Quote or shipment not found.');
    }

    const shipmentId = quote.shipmentId;

    // Validate access
    if (quote.shipment.senderUserId !== userId) {
      throw new ForbiddenException('You do not have access to this shipment.');
    }

    // Validate quote status & expiry
    await this.shipmentQuoteService.validateQuote(shipmentId);

    // Transition shipment/trip and accept quote
    const { updatedShipment, updatedTrip } = await this.prisma.$transaction(async (tx: any) => {
      await tx.shipmentQuote.update({
        where: { id: quote.id },
        data: { acceptedAt: new Date() },
      });

      const updatedTrip = await tx.trip.update({
        where: { id: quote.shipment.tripId },
        data: {
          status: 'REQUESTED' as TripStatus,
          pickupAddress: dto.pickupAddress,
          dropoffAddress: dto.dropoffAddress,
        },
      });

      const updatedShipment = await tx.shipment.update({
        where: { id: shipmentId },
        data: {
          status: 'REQUESTED' as ShipmentStatus,
          pickupAddress: dto.pickupAddress,
          dropoffAddress: dto.dropoffAddress,
          senderName: dto.senderName,
          recipientName: dto.recipientName,
          recipientPhone: dto.recipientPhone,
          packageDescription: dto.packageDescription ?? null,
          packageCategory: dto.packageCategory,
          priority: dto.priority,
          specialInstructions: dto.specialInstructions ?? null,
        },
      });

      return { updatedShipment, updatedTrip };
    });

    // Record tracking & trip events
    await this.recordTrackingEvent(shipmentId, 'STATUS_CHANGED', 'REQUESTED' as ShipmentStatus, {
      description: 'Shipment created from valid quote.',
    });

    await this.prisma.tripEvent.create({
      data: {
        tripId: updatedTrip.id,
        eventType: 'SHIPMENT_CREATED',
        metadata: {
          riderProfileId: updatedShipment.senderRiderProfileId,
          quoteId: quote.id,
          packageCategory: dto.packageCategory,
        },
        occurredAt: new Date(),
      },
    });

    // Generate secure pickup/delivery OTPs (only hashes stored in DB)
    const pickupOtp = await this.shipmentOtpService.generateOtp(shipmentId, 'PICKUP');
    const deliveryOtp = await this.shipmentOtpService.generateOtp(shipmentId, 'DELIVERY');

    // Initiate payment
    await this.paymentsService.initiateMockPayment(userId, updatedTrip.id);

    const safeShipment = await this.getShipmentById(shipmentId, userId, 'RIDER');

    // Return the safe shipment payload along with the OTP codes ONLY ONCE (secure creation response)
    return {
      ...safeShipment,
      pickupOtp,
      deliveryOtp,
    };
  }

  async listRiderShipments(userId: string, query: ShipmentListQueryDto) {
    const limit = Math.min(Math.max(query.limit ?? 20, 1), 100);
    const offset = Math.max(query.offset ?? 0, 0);

    const where: any = { senderUserId: userId };
    if (query.status) {
      where.status = query.status;
    }

    const [items, total] = await Promise.all([
      this.prisma.shipment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: this.shipmentIncludes(),
      }),
      this.prisma.shipment.count({ where }),
    ]);

    return {
      items: items.map((s: any) => this.shapeShipment(s)),
      total,
      limit,
      offset,
    };
  }

  async getActiveShipment(userId: string) {
    const riderProfile = await this.prisma.riderProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!riderProfile) throw new ForbiddenException('Rider profile not found.');

    const shipment = await this.prisma.shipment.findFirst({
      where: { trip: { riderProfileId: riderProfile.id, status: { in: NON_TERMINAL_STATUSES } } },
      orderBy: { createdAt: 'desc' },
      include: this.shipmentIncludes(),
    });

    return { shipment: shipment ? this.shapeShipment(shipment) : null };
  }

  async getShipmentById(shipmentId: string, userId: string, userType: string) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: this.shipmentIncludes(),
    });
    if (!shipment) {
      throw new NotFoundException('Shipment not found.');
    }

    // Access control
    if (userType === 'RIDER') {
      if (shipment.senderUserId !== userId) {
        throw new ForbiddenException('You do not have access to this shipment.');
      }
    } else if (userType === 'DRIVER') {
      const driverProfile = await this.prisma.driverProfile.findUnique({
        where: { userId },
        select: { id: true },
      });
      // Driver can see detail if assigned or if status is REQUESTED (available queue details check)
      if (!driverProfile) {
        throw new ForbiddenException('Driver profile not found.');
      }
      if (shipment.status !== 'REQUESTED' && shipment.driverProfileId !== driverProfile.id) {
        throw new ForbiddenException('You do not have access to this shipment.');
      }
    }

    return this.shapeShipment(shipment);
  }

  async cancelShipment(shipmentId: string, userId: string, dto: CancelShipmentDto) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
      select: { senderUserId: true, status: true, tripId: true },
    });
    if (!shipment) {
      throw new NotFoundException('Shipment not found.');
    }

    if (shipment.senderUserId !== userId) {
      throw new ForbiddenException('You do not have access to this shipment.');
    }

    if (!ShipmentStateMachine.canBeCancelled(shipment.status)) {
      throw new BadRequestException(`Shipment in status ${shipment.status} cannot be cancelled.`);
    }

    const now = new Date();

    await this.prisma.$transaction(async (tx: any) => {
      await tx.shipment.update({
        where: { id: shipmentId },
        data: { status: 'CANCELLED' as ShipmentStatus, cancelledAt: now },
      });
      await tx.trip.update({
        where: { id: shipment.tripId },
        data: {
          status: 'CANCELLED_BY_RIDER' as TripStatus,
          cancelledAt: now,
          cancellationReason: dto.reason ?? null,
        },
      });
    });

    await this.recordTrackingEvent(shipmentId, 'STATUS_CHANGED', 'CANCELLED' as ShipmentStatus, {
      reason: dto.reason,
      cancelledBy: userId,
    });

    return { success: true, status: 'CANCELLED' };
  }

  async requestPhotoUpload(shipmentId: string, userId: string, dto: ShipmentPhotoUploadRequestDto) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
      select: { senderUserId: true },
    });
    if (!shipment) {
      throw new NotFoundException('Shipment not found.');
    }

    if (shipment.senderUserId !== userId) {
      throw new ForbiddenException('You do not have access to this shipment.');
    }

    const photoId = randomUUID();
    const mockUploadUrl = `https://rydalux-storage.local/upload/shipment-${shipmentId}/photo-${photoId}`;

    const photo = await this.prisma.shipmentPhoto.create({
      data: {
        id: photoId,
        shipmentId,
        photoType: dto.photoType,
        fileUrl: `https://rydalux-storage.local/files/shipment-${shipmentId}/${photoId}`,
        fileSize: dto.fileSize ?? null,
        mimeType: dto.mimeType ?? null,
      },
    });

    await this.recordTrackingEvent(shipmentId, 'PHOTO_UPLOAD_REQUESTED', 'REQUESTED' as ShipmentStatus, {
      photoId,
      photoType: dto.photoType,
    });

    return {
      photo: {
        id: photo.id,
        photoType: photo.photoType,
        fileUrl: photo.fileUrl,
        uploadedAt: photo.uploadedAt,
      },
      uploadUrl: mockUploadUrl,
    };
  }

  async createSupportTicket(shipmentId: string, userId: string, dto: CreateShipmentSupportTicketDto) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
      select: { senderUserId: true, tripId: true },
    });
    if (!shipment) {
      throw new NotFoundException('Shipment not found.');
    }

    if (shipment.senderUserId !== userId) {
      throw new ForbiddenException('You do not have access to this shipment.');
    }

    const ticket = await this.prisma.supportTicket.create({
      data: {
        id: randomUUID(),
        createdById: userId,
        title: dto.title,
        description: dto.description,
        type: 'SHIPMENT_ISSUE',
        priority: dto.priority ?? 'MEDIUM',
        status: 'OPEN',
        shipmentId,
        tripId: shipment.tripId,
      },
    });

    return {
      id: ticket.id,
      title: ticket.title,
      description: ticket.description,
      type: ticket.type,
      priority: ticket.priority,
      status: ticket.status,
      createdAt: ticket.createdAt,
    };
  }

  async getShipmentCodes(shipmentId: string, userId: string) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
      select: { senderUserId: true, tripId: true },
    });
    if (!shipment) {
      throw new NotFoundException('Shipment not found.');
    }

    if (shipment.senderUserId !== userId) {
      throw new ForbiddenException('You do not have access to this shipment.');
    }

    return this.tripsService.getTripPin(shipment.tripId, userId);
  }

  // ── Driver ───────────────────────────────────────────────────────────────────

  async getAvailableShipments(userId: string) {
    const driverProfile = await this.prisma.driverProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!driverProfile) {
      throw new ForbiddenException('Driver profile not found.');
    }

    const shipments = await this.prisma.shipment.findMany({
      where: { status: 'REQUESTED' as ShipmentStatus },
      orderBy: { createdAt: 'asc' },
      include: {
        trip: {
          select: {
            id: true,
            reference: true,
            status: true,
            pickupAddress: true,
            pickupLatitude: true,
            pickupLongitude: true,
            dropoffAddress: true,
            dropoffLatitude: true,
            dropoffLongitude: true,
            fareQuote: { select: { totalFare: true } },
            createdAt: true,
          },
        },
      },
    });

    return {
      // Sensitive recipient information is carefully scrubbed out for available queue decision-making!
      shipments: shipments.map((s: any) => ({
        id: s.id,
        tripId: s.tripId,
        reference: s.trip.reference,
        status: s.status,
        packageCategory: s.packageCategory,
        packageDescription: s.packageDescription,
        specialInstructions: s.specialInstructions,
        pickup: {
          address: s.trip.pickupAddress,
          latitude: s.trip.pickupLatitude,
          longitude: s.trip.pickupLongitude,
        },
        dropoff: {
          address: s.trip.dropoffAddress,
          latitude: s.trip.dropoffLatitude,
          longitude: s.trip.dropoffLongitude,
        },
        fare: s.trip.fareQuote ? { totalFare: Number(s.trip.fareQuote.totalFare) } : null,
        createdAt: s.trip.createdAt,
        recipientName: '***',
        recipientPhone: '***',
      })),
    };
  }

  async getDriverActiveShipment(userId: string) {
    const driverProfile = await this.prisma.driverProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!driverProfile) {
      throw new ForbiddenException('Driver profile not found.');
    }

    const shipment = await this.prisma.shipment.findFirst({
      where: {
        trip: {
          driverProfileId: driverProfile.id,
          serviceType: ServiceType.SHIPMENT,
          status: { in: DRIVER_ACTIVE_STATUSES },
        },
      },
      orderBy: { createdAt: 'desc' },
      include: this.shipmentIncludes(),
    });

    return { shipment: shipment ? this.shapeShipment(shipment) : null };
  }

  async driverAcceptShipment(shipmentId: string, userId: string) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
      select: { id: true, tripId: true, status: true },
    });
    if (!shipment) {
      throw new NotFoundException('Shipment not found.');
    }
    if (shipment.status !== 'REQUESTED') {
      throw new BadRequestException('Shipment is no longer available.');
    }

    await this.tripsService.driverAcceptTrip(shipment.tripId, userId);

    await this.prisma.shipment.update({
      where: { id: shipmentId },
      data: { status: 'DRIVER_ASSIGNED' as ShipmentStatus },
    });

    await this.recordTrackingEvent(shipmentId, 'STATUS_CHANGED', 'DRIVER_ASSIGNED' as ShipmentStatus, {
      driverId: userId,
    });

    return this.getShipmentById(shipmentId, userId, 'DRIVER');
  }

  async arriveAtPickup(shipmentId: string, userId: string) {
    const { shipment } = await this.resolveDriverShipment(shipmentId, userId);

    await this.tripsService.transition(shipment.tripId, userId, 'DRIVER_ARRIVED' as TripStatus);

    await this.prisma.shipment.update({
      where: { id: shipmentId },
      data: { status: 'PICKUP_ARRIVED' as ShipmentStatus },
    });

    await this.recordTrackingEvent(shipmentId, 'STATUS_CHANGED', 'PICKUP_ARRIVED' as ShipmentStatus, {
      driverId: userId,
    });

    return { success: true, status: 'PICKUP_ARRIVED', tripStatus: 'DRIVER_ARRIVED' };
  }

  async verifyPickupOtp(shipmentId: string, userId: string, dto: VerifyShipmentOtpDto) {
    const { shipment } = await this.resolveDriverShipment(shipmentId, userId);

    try {
      await this.shipmentOtpService.verifyOtp(shipmentId, 'PICKUP', dto.code);

      await this.prisma.shipment.update({
        where: { id: shipmentId },
        data: {
          status: 'PICKUP_VERIFIED' as ShipmentStatus,
          pickupVerifiedAt: new Date(),
        },
      });

      await this.recordTrackingEvent(shipmentId, 'OTP_VERIFIED', 'PICKUP_VERIFIED' as ShipmentStatus, {
        otpType: 'PICKUP',
        verifiedBy: userId,
      });

      return { success: true, status: 'PICKUP_VERIFIED' };
    } catch (error: any) {
      await this.recordTrackingEvent(shipmentId, 'OTP_FAILED', shipment.status as ShipmentStatus, {
        otpType: 'PICKUP',
        failedCode: dto.code,
        error: error.message,
      });
      throw error;
    }
  }

  async startShipment(shipmentId: string, userId: string) {
    const { shipment } = await this.resolveDriverShipment(shipmentId, userId);

    if (shipment.status !== 'PICKUP_VERIFIED') {
      throw new BadRequestException('Cannot start shipment until pickup OTP is verified.');
    }

    await this.tripsService.transition(shipment.tripId, userId, 'PIN_VERIFIED' as TripStatus);
    await this.tripsService.transition(shipment.tripId, userId, 'IN_PROGRESS' as TripStatus);

    await this.prisma.shipment.update({
      where: { id: shipmentId },
      data: { status: 'IN_TRANSIT' as ShipmentStatus },
    });

    await this.recordTrackingEvent(shipmentId, 'STATUS_CHANGED', 'IN_TRANSIT' as ShipmentStatus, {
      driverId: userId,
    });

    return { success: true, status: 'IN_TRANSIT', tripStatus: 'IN_PROGRESS' };
  }

  async arriveAtDelivery(shipmentId: string, userId: string) {
    const { shipment } = await this.resolveDriverShipment(shipmentId, userId);

    if (shipment.status !== 'IN_TRANSIT') {
      throw new BadRequestException('Cannot mark delivery arrival unless shipment is in transit.');
    }

    await this.prisma.shipment.update({
      where: { id: shipmentId },
      data: { status: 'DELIVERY_ARRIVED' as ShipmentStatus },
    });

    await this.recordTrackingEvent(shipmentId, 'STATUS_CHANGED', 'DELIVERY_ARRIVED' as ShipmentStatus, {
      driverId: userId,
    });

    return { success: true, status: 'DELIVERY_ARRIVED' };
  }

  async verifyDeliveryOtp(shipmentId: string, userId: string, dto: VerifyShipmentOtpDto) {
    const { shipment } = await this.resolveDriverShipment(shipmentId, userId);

    try {
      await this.shipmentOtpService.verifyOtp(shipmentId, 'DELIVERY', dto.code);

      await this.prisma.shipment.update({
        where: { id: shipmentId },
        data: {
          status: 'DELIVERY_VERIFIED' as ShipmentStatus,
          deliveryVerifiedAt: new Date(),
        },
      });

      await this.recordTrackingEvent(shipmentId, 'OTP_VERIFIED', 'DELIVERY_VERIFIED' as ShipmentStatus, {
        otpType: 'DELIVERY',
        verifiedBy: userId,
      });

      return { success: true, status: 'DELIVERY_VERIFIED' };
    } catch (error: any) {
      await this.recordTrackingEvent(shipmentId, 'OTP_FAILED', shipment.status as ShipmentStatus, {
        otpType: 'DELIVERY',
        failedCode: dto.code,
        error: error.message,
      });
      throw error;
    }
  }

  async completeShipment(shipmentId: string, userId: string) {
    const { shipment } = await this.resolveDriverShipment(shipmentId, userId);

    if (shipment.status !== 'DELIVERY_VERIFIED') {
      throw new BadRequestException('Cannot complete shipment until delivery OTP is verified.');
    }

    const proofCount = await this.prisma.shipmentProof.count({ where: { shipmentId } });
    if (proofCount === 0) {
      throw new BadRequestException('Proof of delivery must be submitted before confirming delivery.');
    }

    const now = new Date();

    await this.tripsService.transition(shipment.tripId, userId, 'COMPLETED' as TripStatus);

    await this.prisma.shipment.update({
      where: { id: shipmentId },
      data: { status: 'DELIVERED' as ShipmentStatus, deliveredAt: now },
    });

    await this.recordTrackingEvent(shipmentId, 'STATUS_CHANGED', 'DELIVERED' as ShipmentStatus, {
      completedBy: userId,
    });

    await this.prisma.tripEvent.create({
      data: {
        tripId: shipment.tripId,
        eventType: 'SHIPMENT_DELIVERED',
        metadata: { shipmentId, confirmedBy: userId },
        occurredAt: now,
      },
    });

    await this.paymentsService.capturePaymentForTrip(shipment.tripId, shipment.trip.driverProfileId);

    return { success: true, status: 'DELIVERED', tripStatus: 'COMPLETED', deliveredAt: now };
  }

  async submitProof(shipmentId: string, userId: string, dto: ShipmentProofDto) {
    const { shipment } = await this.resolveDriverShipment(shipmentId, userId);

    // Enforce that proofs can only be submitted in active delivery phase
    if (!ShipmentStateMachine.isInDeliveryPhase(shipment.status as ShipmentStatus)) {
      throw new BadRequestException('Proofs can only be submitted while delivery is active.');
    }

    const proof = await this.prisma.shipmentProof.create({
      data: {
        id: randomUUID(),
        shipmentId,
        proofType: 'PHOTO_URL',
        url: dto.url,
        notes: dto.notes ?? null,
        submittedBy: userId,
      },
    });

    await this.prisma.tripEvent.create({
      data: {
        tripId: shipment.tripId,
        eventType: 'SHIPMENT_PROOF_SUBMITTED',
        metadata: { proofId: proof.id, proofType: proof.proofType, submittedBy: userId },
        occurredAt: new Date(),
      },
    });

    await this.recordTrackingEvent(shipmentId, 'PROOF_UPLOADED', shipment.status as ShipmentStatus, {
      proofId: proof.id,
      submittedBy: userId,
    });

    return {
      id: proof.id,
      proofType: proof.proofType,
      url: proof.url,
      notes: proof.notes,
      submittedBy: proof.submittedBy,
      submittedAt: proof.submittedAt,
    };
  }

  // ── Admin ────────────────────────────────────────────────────────────────────

  // Backward compatible & flexible signature supporting query object or string status
  async adminListShipments(queryOrStatus?: AdminShipmentListQueryDto | string, limit?: number, offset?: number) {
    let status: string | undefined;
    let safeLimit = 20;
    let safeOffset = 0;

    if (queryOrStatus && typeof queryOrStatus === 'object') {
      status = queryOrStatus.status;
      safeLimit = Math.min(Math.max(queryOrStatus.limit ?? 20, 1), 100);
      safeOffset = Math.max(queryOrStatus.offset ?? 0, 0);
    } else {
      status = queryOrStatus as string | undefined;
      safeLimit = Math.min(Math.max(limit ?? 20, 1), 100);
      safeOffset = Math.max(offset ?? 0, 0);
    }

    const where: any = {};
    if (status) {
      where.status = status;
    }

    const [items, total] = await Promise.all([
      this.prisma.shipment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: safeLimit,
        skip: safeOffset,
        include: this.shipmentIncludes(),
      }),
      this.prisma.shipment.count({ where }),
    ]);

    return {
      items: items.map((s: any) => this.shapeShipment(s)),
      total,
      limit: safeLimit,
      offset: safeOffset,
    };
  }

  async adminGetShipment(shipmentId: string) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: this.shipmentIncludes(),
    });
    if (!shipment) {
      throw new NotFoundException('Shipment not found.');
    }
    return this.shapeShipment(shipment);
  }

  async adminAssignDriver(shipmentId: string, adminId: string, dto: AssignShipmentDriverDto) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
      select: { id: true, tripId: true, status: true },
    });
    if (!shipment) {
      throw new NotFoundException('Shipment not found.');
    }

    const driverProfile = await this.prisma.driverProfile.findUnique({
      where: { id: dto.driverId },
      select: { id: true, userId: true },
    });
    if (!driverProfile) {
      throw new BadRequestException('Invalid driver specified.');
    }

    await this.prisma.$transaction(async (tx: any) => {
      await tx.shipment.update({
        where: { id: shipmentId },
        data: {
          status: 'DRIVER_ASSIGNED' as ShipmentStatus,
          driverProfileId: driverProfile.id,
        },
      });
      await tx.trip.update({
        where: { id: shipment.tripId },
        data: {
          status: 'DRIVER_ASSIGNED' as TripStatus,
          driverProfileId: driverProfile.id,
          acceptedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: adminId,
          action: 'SHIPMENT_ADMIN_ASSIGN_DRIVER',
          entity: 'SHIPMENT',
          entityId: shipmentId,
          payload: { driverId: dto.driverId, previousStatus: shipment.status },
        },
      });
    });

    await this.recordTrackingEvent(shipmentId, 'STATUS_CHANGED', 'DRIVER_ASSIGNED' as ShipmentStatus, {
      driverId: driverProfile.userId,
      assignedByAdmin: adminId,
    });

    return { success: true, status: 'DRIVER_ASSIGNED' };
  }

  async adminCancelShipment(shipmentId: string, adminId: string, dto: CancelShipmentDto) {
    return this.adminForceStatus(shipmentId, adminId, 'CANCELLED', dto.reason);
  }

  async adminDisputeShipment(shipmentId: string, adminId: string, dto: DisputeShipmentDto) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
      select: { id: true, tripId: true, status: true },
    });
    if (!shipment) {
      throw new NotFoundException('Shipment not found.');
    }

    await this.prisma.$transaction(async (tx: any) => {
      await tx.shipment.update({
        where: { id: shipmentId },
        data: {
          status: 'DISPUTED' as ShipmentStatus,
          disputeReason: dto.reason,
        },
      });
      await tx.trip.update({
        where: { id: shipment.tripId },
        data: { status: 'DISPUTED' as TripStatus },
      });

      await tx.auditLog.create({
        data: {
          actorId: adminId,
          action: 'SHIPMENT_ADMIN_DISPUTE',
          entity: 'SHIPMENT',
          entityId: shipmentId,
          payload: { reason: dto.reason, previousStatus: shipment.status },
        },
      });
    });

    await this.recordTrackingEvent(shipmentId, 'STATUS_CHANGED', 'DISPUTED' as ShipmentStatus, {
      reason: dto.reason,
      disputedByAdmin: adminId,
    });

    return { success: true, status: 'DISPUTED' };
  }

  async adminUpdateStatus(shipmentId: string, adminId: string, dto: UpdateShipmentStatusDto) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
      select: { id: true, tripId: true, status: true },
    });
    if (!shipment) {
      throw new NotFoundException('Shipment not found.');
    }

    // Validate state transition using the state machine
    try {
      ShipmentStateMachine.assertTransition(shipment.status as ShipmentStatus, dto.status);
    } catch (err: any) {
      throw new BadRequestException(err.message);
    }

    await this.prisma.$transaction(async (tx: any) => {
      await tx.shipment.update({
        where: { id: shipmentId },
        data: { status: dto.status },
      });

      // Synchronize standard trip statuses where appropriate
      let targetTripStatus: TripStatus | null = null;
      if (dto.status === 'REQUESTED') targetTripStatus = 'REQUESTED';
      else if (dto.status === 'DRIVER_ASSIGNED') targetTripStatus = 'DRIVER_ASSIGNED';
      else if (dto.status === 'PICKUP_ARRIVED') targetTripStatus = 'DRIVER_ARRIVED';
      else if (dto.status === 'IN_TRANSIT') targetTripStatus = 'IN_PROGRESS';
      else if (dto.status === 'DELIVERED') targetTripStatus = 'COMPLETED';
      else if (dto.status === 'CANCELLED') targetTripStatus = 'CANCELLED_BY_DRIVER';
      else if (dto.status === 'DISPUTED') targetTripStatus = 'DISPUTED';

      if (targetTripStatus) {
        await tx.trip.update({
          where: { id: shipment.tripId },
          data: { status: targetTripStatus },
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: adminId,
          action: `SHIPMENT_ADMIN_STATUS_${dto.status}`,
          entity: 'SHIPMENT',
          entityId: shipmentId,
          payload: { reason: dto.reason, previousStatus: shipment.status },
        },
      });
    });

    await this.recordTrackingEvent(shipmentId, 'STATUS_CHANGED', dto.status, {
      reason: dto.reason,
      updatedByAdmin: adminId,
    });

    return { success: true, status: dto.status };
  }

  // Backward compatible forced status method used by AdminController
  async adminForceStatus(shipmentId: string, adminId: string, status: 'CANCELLED' | 'FAILED', reason?: string) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
      select: { id: true, tripId: true, status: true },
    });
    if (!shipment) {
      throw new NotFoundException('Shipment not found.');
    }
    if (shipment.status === 'DELIVERED') {
      throw new BadRequestException('Cannot change status of a delivered shipment.');
    }

    const now = new Date();
    const tripStatus = status === 'CANCELLED' ? 'CANCELLED_BY_DRIVER' : 'EXPIRED';

    await this.prisma.$transaction(async (tx: any) => {
      await tx.shipment.update({
        where: { id: shipmentId },
        data: { status: status as ShipmentStatus, cancelledAt: now },
      });
      await tx.trip.update({
        where: { id: shipment.tripId },
        data: { status: tripStatus as TripStatus, cancelledAt: now, cancellationReason: reason ?? null },
      });
      await tx.auditLog.create({
        data: {
          actorId: adminId,
          action: `SHIPMENT_FORCE_${status}`,
          entity: 'SHIPMENT',
          entityId: shipmentId,
          payload: { reason, previousStatus: shipment.status },
        },
      });
    });

    await this.recordTrackingEvent(shipmentId, 'STATUS_CHANGED', status as ShipmentStatus, {
      reason,
      forcedByAdmin: adminId,
    });

    return { success: true };
  }

  // Backward compatible resolution method used by AdminController
  async adminResolveShipment(shipmentId: string, adminId: string, resolution: string, notes?: string) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
      select: { id: true, tripId: true, status: true },
    });
    if (!shipment) {
      throw new NotFoundException('Shipment not found.');
    }
    if (shipment.status === 'DELIVERED') {
      throw new BadRequestException('Shipment is already delivered.');
    }

    const now = new Date();

    await this.prisma.$transaction(async (tx: any) => {
      await tx.shipmentProof.create({
        data: {
          id: randomUUID(),
          shipmentId,
          proofType: 'PHOTO_URL',
          url: 'admin:resolved',
          notes: notes ? `${resolution} — ${notes}` : resolution,
          submittedBy: adminId,
          metadata: { adminResolved: true, adminId, resolution, notes },
        },
      });
      await tx.shipment.update({
        where: { id: shipmentId },
        data: { status: 'DELIVERED' as ShipmentStatus, deliveredAt: now },
      });
      await tx.trip.update({
        where: { id: shipment.tripId },
        data: { status: 'COMPLETED' as TripStatus, completedAt: now },
      });
      await tx.auditLog.create({
        data: {
          actorId: adminId,
          action: 'SHIPMENT_ADMIN_RESOLVED',
          entity: 'SHIPMENT',
          entityId: shipmentId,
          payload: { resolution, notes },
        },
      });
    });

    const trip = await this.prisma.trip.findUnique({
      where: { id: shipment.tripId },
      select: { driverProfileId: true },
    });
    await this.paymentsService.capturePaymentForTrip(shipment.tripId, trip?.driverProfileId ?? null);

    await this.recordTrackingEvent(shipmentId, 'STATUS_CHANGED', 'DELIVERED' as ShipmentStatus, {
      resolvedByAdmin: adminId,
      resolution,
    });

    return { success: true, deliveredAt: now };
  }

  // ── Private Helpers ──────────────────────────────────────────────────────────

  private async resolveDriverShipment(shipmentId: string, userId: string) {
    const driverProfile = await this.prisma.driverProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!driverProfile) {
      throw new ForbiddenException('Driver profile not found.');
    }

    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
      select: {
        id: true,
        tripId: true,
        status: true,
        driverProfileId: true,
        trip: { select: { driverProfileId: true, status: true } },
      },
    });
    if (!shipment) {
      throw new NotFoundException('Shipment not found.');
    }
    if (shipment.driverProfileId !== driverProfile.id) {
      throw new ForbiddenException('You are not assigned to this shipment.');
    }

    if (shipment.status === 'CANCELLED' || shipment.status === 'DELIVERED' || shipment.status === 'DISPUTED' || shipment.status === 'EXPIRED') {
      throw new BadRequestException(`Cannot perform driver actions on shipment in terminal status ${shipment.status}.`);
    }

    return { shipment, driverProfile };
  }

  private async recordTrackingEvent(shipmentId: string, eventType: string, status: ShipmentStatus, metadata?: any) {
    return this.prisma.shipmentTrackingEvent.create({
      data: {
        id: randomUUID(),
        shipmentId,
        eventType,
        status,
        metadata: metadata ?? {},
      },
    });
  }

  private shipmentIncludes() {
    return {
      trip: {
        select: {
          id: true,
          reference: true,
          status: true,
          serviceType: true,
          riderProfileId: true,
          driverProfileId: true,
          pickupAddress: true,
          pickupLatitude: true,
          pickupLongitude: true,
          dropoffAddress: true,
          dropoffLatitude: true,
          dropoffLongitude: true,
          scheduledAt: true,
          acceptedAt: true,
          startedAt: true,
          arrivedAt: true,
          completedAt: true,
          cancelledAt: true,
          cancellationReason: true,
          createdAt: true,
          updatedAt: true,
          fareQuote: {
            select: {
              id: true,
              totalFare: true,
              baseFare: true,
              distanceFare: true,
              timeFare: true,
              extraFees: true,
              serviceType: true,
            },
          },
          payment: { select: { id: true, amount: true, currency: true, status: true } },
          driverProfile: { include: { user: { select: { id: true, displayName: true, phone: true } } } },
          vehicle: {
            select: {
              id: true,
              registrationNumber: true,
              vehicleType: true,
              make: true,
              model: true,
              color: true,
            },
          },
          riderProfile: { include: { user: { select: { id: true, displayName: true, phone: true } } } },
        },
      },
      proofs: { orderBy: { submittedAt: 'asc' as const } },
      otps: true,
    };
  }

  private shapeShipment(s: any) {
    return {
      id: s.id,
      tripId: s.tripId,
      reference: s.trip.reference,
      status: s.status,
      tripStatus: s.trip.status,
      senderUserId: s.senderUserId,
      senderName: s.senderName,
      recipientName: s.recipientName,
      recipientPhone: s.recipientPhone,
      packageDescription: s.packageDescription,
      packageCategory: s.packageCategory,
      priority: s.priority,
      specialInstructions: s.specialInstructions,
      pickup: {
        address: s.trip.pickupAddress,
        latitude: s.trip.pickupLatitude,
        longitude: s.trip.pickupLongitude,
      },
      dropoff: {
        address: s.trip.dropoffAddress,
        latitude: s.trip.dropoffLatitude,
        longitude: s.trip.dropoffLongitude,
      },
      fare: s.trip.fareQuote ? {
        id: s.trip.fareQuote.id,
        totalFare: Number(s.trip.fareQuote.totalFare),
        baseFare: Number(s.trip.fareQuote.baseFare),
        distanceFare: Number(s.trip.fareQuote.distanceFare),
        timeFare: Number(s.trip.fareQuote.timeFare),
      } : null,
      payment: s.trip.payment ?? null,
      rider: s.trip.riderProfile
        ? {
            id: s.trip.riderProfile.id,
            name: s.trip.riderProfile.user?.displayName ?? null,
            phone: s.trip.riderProfile.user?.phone ?? null,
          }
        : null,
      driver: s.trip.driverProfile
        ? {
            id: s.trip.driverProfile.id,
            name: s.trip.driverProfile.user?.displayName ?? null,
            phone: s.trip.driverProfile.user?.phone ?? null,
          }
        : null,
      vehicle: s.trip.vehicle ?? null,
      proofs: (s.proofs ?? []).map((p: any) => ({
        id: p.id,
        proofType: p.proofType,
        url: p.url,
        notes: p.notes,
        submittedBy: p.submittedBy,
        submittedAt: p.submittedAt,
      })),
      otps: (s.otps ?? []).map((o: any) => ({
        otpType: o.otpType,
        isVerified: o.usedAt !== null,
        isExpired: o.expiresAt < new Date(),
        attempts: o.attempts,
        maxAttempts: o.maxAttempts,
        expiresAt: o.expiresAt,
      })),
      deliveredAt: s.deliveredAt,
      cancelledAt: s.cancelledAt,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    };
  }
}
