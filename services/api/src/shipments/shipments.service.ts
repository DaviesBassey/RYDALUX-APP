import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { FareService } from '../fare/fare.service';
import { TripsService } from '../trips/trips.service';
import { PaymentsService } from '../payments/payments.service';
import { CreateShipmentQuoteDto } from './dto/create-shipment-quote.dto';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { SubmitProofDto } from './dto/submit-proof.dto';
import { ServiceType, TripStatus } from '@prisma/client';

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
    private readonly fareService: FareService,
    private readonly tripsService: TripsService,
    private readonly paymentsService: PaymentsService,
  ) {}

  // ── Rider ────────────────────────────────────────────────────────────────────

  async createQuote(dto: CreateShipmentQuoteDto) {
    const result = await this.fareService.calculateFare({
      pickupLatitude: dto.pickupLatitude,
      pickupLongitude: dto.pickupLongitude,
      dropoffLatitude: dto.dropoffLatitude,
      dropoffLongitude: dto.dropoffLongitude,
      rideCategory: ServiceType.SHIPMENT,
      packageSizeClass: dto.packageSizeClass,
      promoCode: dto.promoCode,
    });

    return { ...result, packageSizeClass: dto.packageSizeClass };
  }

  async createShipment(userId: string, dto: CreateShipmentDto) {
    const fareQuote = await this.fareService.getFareQuote(dto.fareQuoteId);
    if (fareQuote.serviceType !== ServiceType.SHIPMENT) {
      throw new BadRequestException('Fare quote must be for SHIPMENT service type.');
    }

    const riderProfile = await this.prisma.riderProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!riderProfile) throw new ForbiddenException('Rider profile not found. Complete profile setup first.');

    const active = await this.prisma.trip.findFirst({
      where: { riderProfileId: riderProfile.id, status: { in: NON_TERMINAL_STATUSES } },
      select: { id: true, status: true },
    });
    if (active) {
      throw new BadRequestException(`An active trip already exists (${active.id}, status: ${active.status}).`);
    }

    const reference = `RYD-${randomUUID().replace(/-/g, '').substring(0, 8).toUpperCase()}`;

    const { shipmentId, tripId } = await this.prisma.$transaction(async (tx: any) => {
      const trip = await tx.trip.create({
        data: {
          reference,
          riderProfileId: riderProfile.id,
          status: 'REQUESTED' as TripStatus,
          serviceType: ServiceType.SHIPMENT,
          pickupAddress: dto.pickupAddress,
          dropoffAddress: dto.dropoffAddress,
          pickupLatitude: fareQuote.pickupLatitude,
          pickupLongitude: fareQuote.pickupLongitude,
          dropoffLatitude: fareQuote.dropoffLatitude,
          dropoffLongitude: fareQuote.dropoffLongitude,
        },
      });

      await tx.fareQuote.update({
        where: { id: fareQuote.id },
        data: { tripId: trip.id, status: 'CONSUMED' },
      });

      const shipment = await tx.shipment.create({
        data: {
          id: randomUUID(),
          tripId: trip.id,
          status: 'REQUESTED',
          senderName: dto.senderName,
          recipientName: dto.recipientName,
          recipientPhone: dto.recipientPhone,
          packageDescription: dto.packageDescription ?? null,
          packageSizeClass: dto.packageSizeClass,
          specialInstructions: dto.specialInstructions ?? null,
        },
      });

      await tx.tripEvent.create({
        data: {
          tripId: trip.id,
          eventType: 'SHIPMENT_CREATED',
          metadata: {
            riderProfileId: riderProfile.id,
            fareQuoteId: fareQuote.id,
            packageSizeClass: dto.packageSizeClass,
          },
          occurredAt: new Date(),
        },
      });

      return { shipmentId: shipment.id, tripId: trip.id };
    });

    await this.paymentsService.initiateMockPayment(userId, tripId);

    return this.getShipmentById(shipmentId, userId, 'RIDER');
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
    if (!shipment) throw new NotFoundException('Shipment not found.');

    if (userType === 'RIDER') {
      const riderProfile = await this.prisma.riderProfile.findUnique({ where: { userId }, select: { id: true } });
      if (!riderProfile || shipment.trip.riderProfileId !== riderProfile.id) {
        throw new ForbiddenException('You do not have access to this shipment.');
      }
    } else if (userType === 'DRIVER') {
      const driverProfile = await this.prisma.driverProfile.findUnique({ where: { userId }, select: { id: true } });
      if (!driverProfile || shipment.trip.driverProfileId !== driverProfile.id) {
        throw new ForbiddenException('You are not assigned to this shipment.');
      }
    }

    return this.shapeShipment(shipment);
  }

  async getShipmentCodes(shipmentId: string, userId: string) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
      select: { tripId: true, trip: { select: { riderProfileId: true } } },
    });
    if (!shipment) throw new NotFoundException('Shipment not found.');

    const riderProfile = await this.prisma.riderProfile.findUnique({ where: { userId }, select: { id: true } });
    if (!riderProfile || shipment.trip.riderProfileId !== riderProfile.id) {
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
    if (!driverProfile) throw new ForbiddenException('Driver profile not found.');

    const shipments = await this.prisma.shipment.findMany({
      where: { trip: { serviceType: ServiceType.SHIPMENT, status: 'REQUESTED' } },
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
      shipments: shipments.map((s: any) => ({
        id: s.id,
        tripId: s.tripId,
        reference: s.trip.reference,
        status: s.status,
        packageSizeClass: s.packageSizeClass,
        packageDescription: s.packageDescription,
        recipientName: s.recipientName,
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
        fare: s.trip.fareQuote ? { totalFare: s.trip.fareQuote.totalFare } : null,
        createdAt: s.trip.createdAt,
      })),
    };
  }

  async getDriverActiveShipment(userId: string) {
    const driverProfile = await this.prisma.driverProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!driverProfile) throw new ForbiddenException('Driver profile not found.');

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
    if (!shipment) throw new NotFoundException('Shipment not found.');
    if (shipment.status !== 'REQUESTED') {
      throw new BadRequestException('Shipment is no longer available.');
    }

    await this.tripsService.driverAcceptTrip(shipment.tripId, userId);

    await this.prisma.shipment.update({
      where: { id: shipmentId },
      data: { status: 'DRIVER_ASSIGNED' },
    });

    return this.getShipmentById(shipmentId, userId, 'DRIVER');
  }

  async arriveAtPickup(shipmentId: string, userId: string) {
    const { shipment } = await this.resolveDriverShipment(shipmentId, userId);

    await this.tripsService.transition(shipment.tripId, userId, 'DRIVER_ARRIVED' as TripStatus);

    await this.prisma.shipment.update({
      where: { id: shipmentId },
      data: { status: 'PICKUP_ARRIVED' },
    });

    return { success: true, status: 'PICKUP_ARRIVED', tripStatus: 'DRIVER_ARRIVED' };
  }

  async confirmPickup(shipmentId: string, userId: string, pin: string) {
    const { shipment } = await this.resolveDriverShipment(shipmentId, userId);

    await this.tripsService.transition(shipment.tripId, userId, 'PIN_VERIFIED' as TripStatus, { pin });
    await this.tripsService.transition(shipment.tripId, userId, 'IN_PROGRESS' as TripStatus);

    await this.prisma.shipment.update({
      where: { id: shipmentId },
      data: { status: 'IN_TRANSIT' },
    });

    return { success: true, status: 'IN_TRANSIT', tripStatus: 'IN_PROGRESS' };
  }

  async submitProof(shipmentId: string, userId: string, dto: SubmitProofDto) {
    const { shipment } = await this.resolveDriverShipment(shipmentId, userId);

    const trip = await this.prisma.trip.findUnique({
      where: { id: shipment.tripId },
      select: { status: true },
    });
    if (trip?.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Proofs can only be submitted while the shipment is in transit.');
    }

    const proof = await this.prisma.shipmentProof.create({
      data: {
        id: randomUUID(),
        shipmentId,
        proofType: (dto.proofType ?? 'PHOTO_URL') as any,
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

    return {
      id: proof.id,
      proofType: proof.proofType,
      url: proof.url,
      notes: proof.notes,
      submittedBy: proof.submittedBy,
      submittedAt: proof.submittedAt,
    };
  }

  async confirmDelivery(shipmentId: string, userId: string) {
    const { shipment } = await this.resolveDriverShipment(shipmentId, userId);

    const trip = await this.prisma.trip.findUnique({
      where: { id: shipment.tripId },
      select: { status: true },
    });
    if (trip?.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Delivery can only be confirmed while the shipment is in transit.');
    }

    const proofCount = await this.prisma.shipmentProof.count({ where: { shipmentId } });
    if (proofCount === 0) {
      throw new BadRequestException('Proof of delivery must be submitted before confirming delivery.');
    }

    const now = new Date();

    await this.tripsService.transition(shipment.tripId, userId, 'COMPLETED' as TripStatus);

    await this.prisma.shipment.update({
      where: { id: shipmentId },
      data: { status: 'DELIVERED', deliveredAt: now },
    });

    await this.prisma.tripEvent.create({
      data: {
        tripId: shipment.tripId,
        eventType: 'SHIPMENT_DELIVERED',
        metadata: { shipmentId, confirmedBy: userId },
        occurredAt: now,
      },
    });

    return { success: true, status: 'DELIVERED', tripStatus: 'COMPLETED', deliveredAt: now };
  }

  // ── Admin ────────────────────────────────────────────────────────────────────

  async adminListShipments(status?: string, limit = 20, offset = 0) {
    const safeLimit = Math.min(Math.max(Math.trunc(Number(limit) || 20), 1), 100);
    const safeOffset = Math.max(Math.trunc(Number(offset) || 0), 0);

    const where: any = {};
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      this.prisma.shipment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: safeOffset,
        take: safeLimit,
        include: {
          trip: {
            select: {
              id: true,
              reference: true,
              status: true,
              pickupAddress: true,
              dropoffAddress: true,
              createdAt: true,
              fareQuote: { select: { totalFare: true } },
              payment: { select: { status: true, amount: true } },
              driverProfile: { include: { user: { select: { displayName: true } } } },
            },
          },
          proofs: { select: { id: true } },
        },
      }),
      this.prisma.shipment.count({ where }),
    ]);

    return {
      items: items.map((s: any) => ({
        id: s.id,
        tripId: s.tripId,
        reference: s.trip.reference,
        status: s.status,
        tripStatus: s.trip.status,
        senderName: s.senderName,
        recipientName: s.recipientName,
        recipientPhone: s.recipientPhone,
        packageSizeClass: s.packageSizeClass,
        totalFare: s.trip.fareQuote?.totalFare ?? null,
        paymentStatus: s.trip.payment?.status ?? null,
        proofCount: s.proofs.length,
        driverName: s.trip.driverProfile?.user?.displayName ?? null,
        deliveredAt: s.deliveredAt,
        cancelledAt: s.cancelledAt,
        createdAt: s.createdAt,
      })),
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
    if (!shipment) throw new NotFoundException('Shipment not found.');
    return this.shapeShipment(shipment);
  }

  async adminForceStatus(shipmentId: string, adminId: string, status: 'CANCELLED' | 'FAILED', reason?: string) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
      select: { id: true, tripId: true, status: true },
    });
    if (!shipment) throw new NotFoundException('Shipment not found.');
    if (shipment.status === 'DELIVERED') {
      throw new BadRequestException('Cannot change status of a delivered shipment.');
    }

    const now = new Date();
    const tripStatus = status === 'CANCELLED' ? 'CANCELLED_BY_DRIVER' : 'EXPIRED';

    await this.prisma.$transaction(async (tx: any) => {
      await tx.shipment.update({
        where: { id: shipmentId },
        data: { status, cancelledAt: now },
      });
      await tx.trip.update({
        where: { id: shipment.tripId },
        data: { status: tripStatus, cancelledAt: now, cancellationReason: reason ?? null },
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

    return { success: true };
  }

  async adminResolveShipment(shipmentId: string, adminId: string, resolution: string, notes?: string) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
      select: { id: true, tripId: true, status: true },
    });
    if (!shipment) throw new NotFoundException('Shipment not found.');
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
        data: { status: 'DELIVERED', deliveredAt: now },
      });
      await tx.trip.update({
        where: { id: shipment.tripId },
        data: { status: 'COMPLETED', completedAt: now },
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

    return { success: true, deliveredAt: now };
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private async resolveDriverShipment(shipmentId: string, userId: string) {
    const driverProfile = await this.prisma.driverProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!driverProfile) throw new ForbiddenException('Driver profile not found.');

    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
      select: {
        id: true,
        tripId: true,
        status: true,
        trip: { select: { driverProfileId: true, status: true } },
      },
    });
    if (!shipment) throw new NotFoundException('Shipment not found.');
    if (shipment.trip.driverProfileId !== driverProfile.id) {
      throw new ForbiddenException('You are not assigned to this shipment.');
    }

    return { shipment, driverProfile };
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
    };
  }

  private shapeShipment(s: any) {
    return {
      id: s.id,
      tripId: s.tripId,
      reference: s.trip.reference,
      status: s.status,
      tripStatus: s.trip.status,
      senderName: s.senderName,
      recipientName: s.recipientName,
      recipientPhone: s.recipientPhone,
      packageDescription: s.packageDescription,
      packageSizeClass: s.packageSizeClass,
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
      fare: s.trip.fareQuote ?? null,
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
      deliveredAt: s.deliveredAt,
      cancelledAt: s.cancelledAt,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    };
  }
}
