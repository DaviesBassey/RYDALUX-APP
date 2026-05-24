import { BadRequestException, Injectable, NotFoundException, ForbiddenException, Inject } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { TripStatus } from '@prisma/client';
import RedisClient from 'ioredis';
import { TripsGateway } from './trips.gateway';
import { FareService } from '../fare/fare.service';
import { CreateTripDto } from './dto/create-trip.dto';

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['QUOTED'],
  QUOTED: ['REQUESTED', 'EXPIRED'],
  REQUESTED: ['DRIVER_ASSIGNED', 'CANCELLED_BY_RIDER', 'EXPIRED'],
  DRIVER_ASSIGNED: ['DRIVER_ARRIVING', 'CANCELLED_BY_RIDER', 'CANCELLED_BY_DRIVER', 'EXPIRED'],
  DRIVER_ARRIVING: ['DRIVER_ARRIVED', 'CANCELLED_BY_RIDER', 'CANCELLED_BY_DRIVER', 'EXPIRED'],
  DRIVER_ARRIVED: ['PIN_VERIFIED', 'IN_PROGRESS', 'CANCELLED_BY_RIDER', 'CANCELLED_BY_DRIVER'],
  PIN_VERIFIED: ['IN_PROGRESS', 'CANCELLED_BY_RIDER', 'CANCELLED_BY_DRIVER'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED_BY_DRIVER', 'DISPUTED'],
  COMPLETED: [],
  CANCELLED_BY_RIDER: [],
  CANCELLED_BY_DRIVER: [],
  EXPIRED: [],
  DISPUTED: []
};

const HIGH_RISK_STATES = new Set([
  'DRIVER_ASSIGNED',
  'DRIVER_ARRIVING',
  'DRIVER_ARRIVED',
  'PIN_VERIFIED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED_BY_DRIVER',
  'CANCELLED_BY_RIDER',
  'DISPUTED',
  'EXPIRED'
]);

const DISPATCH_RADIUS_METERS = 3000;
const DISPATCH_TIMEOUT_MS = 15000;
const DISPATCH_LOCK_TTL_MS = 30000;
const LOCATION_RATE_LIMIT_MS = 5000;
const MAX_DRIVER_SPEED_MPS = 45;
const LOCATION_STALE_THRESHOLD_MS = 30000;
const PIN_TTL_MS = 15 * 60 * 1000; // 15 minutes
const MAX_FAILED_PIN_ATTEMPTS = 3;
const ACTIVE_TRIP_STATUSES: TripStatus[] = ['DRIVER_ARRIVING', 'DRIVER_ARRIVED', 'PIN_VERIFIED', 'IN_PROGRESS'];

const NON_TERMINAL_TRIP_STATUSES: TripStatus[] = [
  'DRAFT',
  'QUOTED',
  'REQUESTED',
  'DRIVER_ASSIGNED',
  'DRIVER_ARRIVING',
  'DRIVER_ARRIVED',
  'PIN_VERIFIED',
  'IN_PROGRESS',
];

const EARTH_RADIUS_METERS = 6371000;

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function haversineDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

type DispatchOutcome = 'ACCEPTED' | 'REJECTED' | 'TIMEOUT';

type DispatchSession = {
  driverProfileId: string;
  resolve: (result: DispatchOutcome) => void;
  timer: NodeJS.Timeout;
};

@Injectable()
export class TripsService {
  private activeDispatchSessions = new Map<string, DispatchSession>();

  constructor(
    private readonly prisma: PrismaService,
    @Inject('REDIS_CLIENT') private readonly redisClient: RedisClient,
    private readonly tripsGateway: TripsGateway,
    private readonly fareService: FareService
  ) {}

  async transition(tripId: string, actorId: string | null, nextState: TripStatus, opts: { reason?: string; pin?: string } = {}) {
    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new NotFoundException('Trip not found');

    const current = trip.status as TripStatus;
    const allowed = ALLOWED_TRANSITIONS[current] || [];
    if (!allowed.includes(nextState)) {
      throw new BadRequestException(`Invalid transition from ${current} to ${nextState}`);
    }

    if (nextState === 'PIN_VERIFIED') {
      if (!opts.pin) {
        throw new BadRequestException('PIN is required to verify the trip.');
      }

      // perform PIN validation
      const stored = await this.prisma.trip.findUnique({ where: { id: tripId }, select: { pinCode: true, pinExpiresAt: true, failedPinAttempts: true, safetyFlagged: true } });
      if (!stored || !stored.pinCode) {
        throw new BadRequestException('No PIN is set for this trip.');
      }
      if (stored.safetyFlagged) {
        throw new ForbiddenException('Trip is safety-flagged due to repeated failed PIN attempts.');
      }
      if (stored.pinExpiresAt && new Date(stored.pinExpiresAt).getTime() < Date.now()) {
        // expired
        await this.prisma.trip.update({ where: { id: tripId }, data: { pinCode: null, pinExpiresAt: new Date(), failedPinAttempts: 0 } });
        throw new BadRequestException('PIN has expired.');
      }

      if (opts.pin !== stored.pinCode) {
        // increment failed attempts
        const attempts = (stored.failedPinAttempts ?? 0) + 1;
        const updateData: any = { failedPinAttempts: attempts };
        let flagged = false;
        if (attempts >= MAX_FAILED_PIN_ATTEMPTS) {
          updateData.safetyFlagged = true;
          flagged = true;
        }
        await this.prisma.trip.update({ where: { id: tripId }, data: updateData });
        await this.prisma.tripEvent.create({ data: { tripId, eventType: 'PIN_VERIFICATION_FAILED', metadata: { attempts }, occurredAt: new Date() } });
        if (flagged) {
          await this.prisma.tripEvent.create({ data: { tripId, eventType: 'SAFETY_FLAG_TRIGGERED', metadata: { reason: 'failed_pin_attempts' }, occurredAt: new Date() } });
          throw new ForbiddenException('Too many failed PIN attempts, safety flagged.');
        }
        throw new BadRequestException('Invalid PIN');
      }

      // success: clear PIN and reset counters
      await this.prisma.trip.update({ where: { id: tripId }, data: { pinCode: null, pinExpiresAt: new Date(), failedPinAttempts: 0, safetyFlagged: false } });
      await this.prisma.tripEvent.create({ data: { tripId, eventType: 'PIN_VERIFIED', metadata: {}, occurredAt: new Date() } });
    }

    if ((nextState === 'CANCELLED_BY_RIDER' || nextState === 'CANCELLED_BY_DRIVER') && current === 'COMPLETED') {
      throw new BadRequestException('Cannot cancel a completed trip');
    }

    if (nextState === 'IN_PROGRESS' && current !== 'PIN_VERIFIED') {
      throw new ForbiddenException('Driver must verify PIN before starting the trip');
    }

    const updated = await this.prisma.$transaction(async (tx: any) => {
      const t = await tx.trip.update({ where: { id: tripId }, data: { status: nextState as any } });

      await tx.tripEvent.create({
        data: {
          tripId,
          eventType: `STATE_CHANGE:${nextState}`,
          metadata: { actorId, reason: opts.reason } as any,
          occurredAt: new Date()
        }
      });

      if (HIGH_RISK_STATES.has(nextState)) {
        await tx.auditLog.create({
          data: {
            actorId: actorId ?? undefined,
            action: `TRIP_STATE_${nextState}`,
            entity: 'TRIP',
            entityId: tripId,
            payload: { reason: opts.reason } as any
          }
        });
      }

      return t;
    });

    return updated;
  }

  async dispatchTrip(tripId: string) {
    return this.withDispatchLock(tripId, async () => {
      const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
      if (!trip) throw new NotFoundException('Trip not found');
      if (trip.status !== 'REQUESTED') {
        throw new BadRequestException('Trip must be REQUESTED before dispatching.');
      }

      const candidates = await this.findNearbyEligibleDrivers(trip);
      if (!candidates.length) {
        await this.prisma.tripEvent.create({
          data: {
            tripId,
            eventType: 'DISPATCH_NO_DRIVERS',
            metadata: { pickupLatitude: trip.pickupLatitude, pickupLongitude: trip.pickupLongitude },
            occurredAt: new Date()
          }
        });
        throw new BadRequestException('No eligible drivers available near pickup.');
      }

      for (const candidate of candidates) {
        await this.prisma.$transaction(async (tx: any) => {
          // generate a secure short PIN for rider verification when driver assigned
          const pin = Math.floor(1000 + Math.random() * 9000).toString();
          const pinExpiresAt = new Date(Date.now() + PIN_TTL_MS);

          await tx.trip.update({
            where: { id: tripId },
            data: {
              driverProfileId: candidate.driverProfileId,
              vehicleId: candidate.vehicleId,
              status: 'DRIVER_ASSIGNED' as any,
              pinCode: pin,
              pinExpiresAt
            }
          });

          await tx.tripEvent.create({
            data: {
              tripId,
              eventType: 'DISPATCH_ATTEMPT',
              metadata: {
                driverProfileId: candidate.driverProfileId,
                vehicleId: candidate.vehicleId,
                distanceMeters: candidate.distanceMeters,
                averageRating: candidate.averageRating,
                acceptanceRate: candidate.acceptanceRate
              } as any,
              occurredAt: new Date()
            }
          });
        });

        const decision = await this.waitForDriverDecision(tripId, candidate.driverProfileId, DISPATCH_TIMEOUT_MS);
        if (decision === 'ACCEPTED') {
          return this.getAssignedTrip(tripId);
        }

        if (decision === 'REJECTED') {
          continue;
        }

        if (decision === 'TIMEOUT') {
          await this.prisma.tripEvent.create({
            data: {
              tripId,
              eventType: 'DISPATCH_TIMEOUT',
              metadata: { driverProfileId: candidate.driverProfileId },
              occurredAt: new Date()
            }
          });
          continue;
        }
      }

      await this.prisma.$transaction(async (tx: any) => {
        await tx.trip.update({
            where: { id: tripId },
            data: { status: 'EXPIRED' as any, pinCode: null, pinExpiresAt: new Date(), failedPinAttempts: 0, safetyFlagged: false }
          });
        await tx.tripEvent.create({
          data: {
            tripId,
            eventType: 'DISPATCH_FAILED',
            metadata: { reason: 'no_drivers_accepted' } as any,
            occurredAt: new Date()
          }
        });
      });

      throw new BadRequestException('No drivers accepted the dispatch request.');
    });
  }

  async acceptDispatch(tripId: string, driverProfileId: string, reason?: string) {
    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new NotFoundException('Trip not found');
    if (trip.status !== 'DRIVER_ASSIGNED' || trip.driverProfileId !== driverProfileId) {
      throw new BadRequestException('No active dispatch request for this driver.');
    }

    const updated = await this.prisma.$transaction(async (tx: any) => {
      const t = await tx.trip.update({
        where: { id: tripId },
        data: { status: 'DRIVER_ARRIVING' as any }
      });

      await tx.tripEvent.create({
        data: {
          tripId,
          eventType: 'DISPATCH_ACCEPTED',
          metadata: { driverProfileId, reason } as any,
          occurredAt: new Date()
        }
      });

      return t;
    });

    this.resolveDispatchSession(tripId, driverProfileId, 'ACCEPTED');
    return updated;
  }

  async rejectDispatch(tripId: string, driverProfileId: string, reason?: string) {
    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new NotFoundException('Trip not found');
    if (trip.status !== 'DRIVER_ASSIGNED' || trip.driverProfileId !== driverProfileId) {
      throw new BadRequestException('No active dispatch request for this driver.');
    }

    const updated = await this.prisma.$transaction(async (tx: any) => {
      const t = await tx.trip.update({
        where: { id: tripId },
        data: { status: 'REQUESTED' as any, pinCode: null, pinExpiresAt: new Date(), failedPinAttempts: 0, safetyFlagged: false }
      });

      await tx.tripEvent.create({
        data: {
          tripId,
          eventType: 'DISPATCH_REJECTED',
          metadata: { driverProfileId, reason } as any,
          occurredAt: new Date()
        }
      });

      return t;
    });

    this.resolveDispatchSession(tripId, driverProfileId, 'REJECTED');
    return updated;
  }

  async getTrip(tripId: string) {
    return this.prisma.trip.findUnique({ where: { id: tripId } });
  }

  async getAssignedTrip(tripId: string) {
    return this.prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        driverProfile: { include: { user: true } },
        vehicle: true
      }
    });
  }

  async capturePayment(tripId: string, allowEarlyCapture = false) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: { payment: true }
    });
    if (!trip) throw new NotFoundException('Trip not found');
    if (!trip.payment) throw new BadRequestException('No payment record found for this trip');

    if (trip.status !== 'COMPLETED' && !allowEarlyCapture) {
      throw new BadRequestException('Payment capture is only allowed after trip completion.');
    }

    if (trip.payment.status !== 'AUTHORIZED') {
      throw new BadRequestException('Payment is not in an authorized state.');
    }

    const payment = await this.prisma.payment.update({
      where: { id: trip.payment.id },
      data: { status: 'CAPTURED' }
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: null,
        action: 'PAYMENT_CAPTURED',
        entity: 'TRIP',
        entityId: tripId,
        payload: { paymentId: payment.id, status: payment.status }
      }
    });

    return payment;
  }

  async createTrip(userId: string, dto: CreateTripDto) {
    const riderProfile = await this.prisma.riderProfile.findUnique({
      where: { userId },
      select: { id: true }
    });
    if (!riderProfile) {
      throw new ForbiddenException('Rider profile not found. Complete profile setup first.');
    }

    const existingActiveTrip = await this.prisma.trip.findFirst({
      where: { riderProfileId: riderProfile.id, status: { in: NON_TERMINAL_TRIP_STATUSES } },
      select: { id: true, status: true }
    });
    if (existingActiveTrip) {
      throw new BadRequestException(`An active trip already exists (${existingActiveTrip.id}, status: ${existingActiveTrip.status}).`);
    }

    const fareQuote = await this.fareService.getFareQuote(dto.fareQuoteId);
    if (fareQuote.tripId) {
      throw new BadRequestException('This fare quote has already been used.');
    }

    const reference = `RYD-${randomUUID().replace(/-/g, '').substring(0, 8).toUpperCase()}`;

    const trip = await this.prisma.$transaction(async (tx: any) => {
      const created = await tx.trip.create({
        data: {
          reference,
          riderProfileId: riderProfile.id,
          status: 'REQUESTED' as TripStatus,
          serviceType: fareQuote.serviceType,
          pickupAddress: dto.pickupAddress,
          dropoffAddress: dto.dropoffAddress,
          pickupLatitude: fareQuote.pickupLatitude,
          pickupLongitude: fareQuote.pickupLongitude,
          dropoffLatitude: fareQuote.dropoffLatitude,
          dropoffLongitude: fareQuote.dropoffLongitude,
          scheduledAt: fareQuote.scheduledAt ?? null
        }
      });

      await tx.fareQuote.update({
        where: { id: fareQuote.id },
        data: { tripId: created.id, status: 'CONSUMED' }
      });

      await tx.tripEvent.create({
        data: {
          tripId: created.id,
          eventType: 'TRIP_CREATED',
          metadata: { riderProfileId: riderProfile.id, fareQuoteId: fareQuote.id, serviceType: fareQuote.serviceType },
          occurredAt: new Date()
        }
      });

      return created;
    });

    return this.getTripForUser(trip.id, userId, 'RIDER');
  }

  async getTripForUser(tripId: string, userId: string, userType: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        riderProfile: { include: { user: { select: { id: true, displayName: true, phone: true } } } },
        driverProfile: { include: { user: { select: { id: true, displayName: true, phone: true } } } },
        vehicle: { select: { id: true, registrationNumber: true, vehicleType: true, make: true, model: true, color: true, year: true } },
        fareQuote: { select: { id: true, totalFare: true, baseFare: true, distanceFare: true, timeFare: true, bookingFee: true, surgeFactor: true, serviceType: true, expiresAt: true } },
        payment: { select: { id: true, amount: true, currency: true, status: true } }
      }
    });
    if (!trip) throw new NotFoundException('Trip not found.');

    if (userType === 'RIDER') {
      const riderProfile = await this.prisma.riderProfile.findUnique({ where: { userId }, select: { id: true } });
      if (!riderProfile || trip.riderProfileId !== riderProfile.id) {
        throw new ForbiddenException('You do not have access to this trip.');
      }
    } else if (userType === 'DRIVER') {
      const driverProfile = await this.prisma.driverProfile.findUnique({ where: { userId }, select: { id: true } });
      if (!driverProfile || trip.driverProfileId !== driverProfile.id) {
        throw new ForbiddenException('You are not assigned to this trip.');
      }
    }

    return this.shapeTripResponse(trip);
  }

  async getActiveTrip(userId: string) {
    const riderProfile = await this.prisma.riderProfile.findUnique({
      where: { userId },
      select: { id: true }
    });
    if (!riderProfile) throw new ForbiddenException('Rider profile not found.');

    const trip = await this.prisma.trip.findFirst({
      where: { riderProfileId: riderProfile.id, status: { in: NON_TERMINAL_TRIP_STATUSES } },
      orderBy: { createdAt: 'desc' },
      include: {
        riderProfile: { include: { user: { select: { id: true, displayName: true, phone: true } } } },
        driverProfile: { include: { user: { select: { id: true, displayName: true, phone: true } } } },
        vehicle: { select: { id: true, registrationNumber: true, vehicleType: true, make: true, model: true, color: true, year: true } },
        fareQuote: { select: { id: true, totalFare: true, baseFare: true, distanceFare: true, timeFare: true, bookingFee: true, surgeFactor: true, serviceType: true, expiresAt: true } },
        payment: { select: { id: true, amount: true, currency: true, status: true } }
      }
    });

    return { trip: trip ? this.shapeTripResponse(trip) : null };
  }

  private shapeTripResponse(trip: any) {
    return {
      id: trip.id,
      reference: trip.reference,
      status: trip.status,
      serviceType: trip.serviceType,
      pickup: {
        address: trip.pickupAddress,
        latitude: trip.pickupLatitude,
        longitude: trip.pickupLongitude
      },
      dropoff: {
        address: trip.dropoffAddress,
        latitude: trip.dropoffLatitude,
        longitude: trip.dropoffLongitude
      },
      fare: trip.fareQuote ?? null,
      payment: trip.payment ?? null,
      rider: trip.riderProfile
        ? { id: trip.riderProfile.id, name: trip.riderProfile.user?.displayName ?? null, phone: trip.riderProfile.user?.phone ?? null }
        : null,
      driver: trip.driverProfile
        ? { id: trip.driverProfile.id, name: trip.driverProfile.user?.displayName ?? null, phone: trip.driverProfile.user?.phone ?? null }
        : null,
      vehicle: trip.vehicle ?? null,
      scheduledAt: trip.scheduledAt,
      acceptedAt: trip.acceptedAt,
      startedAt: trip.startedAt,
      arrivedAt: trip.arrivedAt,
      completedAt: trip.completedAt,
      cancelledAt: trip.cancelledAt,
      cancellationReason: trip.cancellationReason,
      distanceMeters: trip.distanceMeters,
      durationSeconds: trip.durationSeconds,
      notes: trip.notes,
      createdAt: trip.createdAt,
      updatedAt: trip.updatedAt
    };
  }

  private async withDispatchLock<T>(tripId: string, callback: () => Promise<T>) {
    const lockKey = `trip_dispatch_lock:${tripId}`;
    const lockToken = await this.tryAcquireLock(lockKey);
    if (!lockToken) {
      throw new BadRequestException('Trip is already being dispatched.');
    }

    try {
      return await callback();
    } finally {
      await this.releaseLock(lockKey, lockToken);
    }
  }

  private async tryAcquireLock(key: string) {
    const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const response = await this.redisClient.set(key, token, 'PX', DISPATCH_LOCK_TTL_MS, 'NX');
    return response === 'OK' ? token : null;
  }

  private async releaseLock(key: string, token: string) {
    const current = await this.redisClient.get(key);
    if (current === token) {
      await this.redisClient.del(key);
    }
  }

  private async findNearbyEligibleDrivers(trip: any) {
    if (typeof trip.pickupLatitude !== 'number' || typeof trip.pickupLongitude !== 'number') {
      throw new BadRequestException('Trip pickup coordinates are required for dispatch.');
    }

    const rawCandidates = await this.prisma.$queryRaw<
      Array<{
        driver_profile_id: string;
        user_id: string;
        vehicle_id: string;
        average_rating: number | null;
        distance_meters: number;
      }>
    >`
      SELECT
        dp.id AS driver_profile_id,
        dp.user_id,
        v.id AS vehicle_id,
        COALESCE(dp.average_rating::double precision, 0) AS average_rating,
        ST_DistanceSphere(dp.current_location, ST_MakePoint(${trip.pickupLongitude}, ${trip.pickupLatitude})::geography) AS distance_meters
      FROM driver_profile dp
      JOIN vehicle v ON v.id = dp.active_vehicle_id
      WHERE dp.is_online = true
        AND dp.current_status = 'AVAILABLE'
        AND dp.current_location IS NOT NULL
        AND v.status = 'ACTIVE'
        AND v.vehicle_type = ${trip.serviceType}
        AND ST_DWithin(dp.current_location, ST_MakePoint(${trip.pickupLongitude}, ${trip.pickupLatitude})::geography, ${DISPATCH_RADIUS_METERS})
    `;

    const performanceRows = await this.prisma.$queryRaw<
      Array<{ driver_profile_id: string; accepted: number; rejected: number }>
    >`
      SELECT
        metadata->>'driverProfileId' AS driver_profile_id,
        SUM((event_type = 'DISPATCH_ACCEPTED')::int) AS accepted,
        SUM((event_type = 'DISPATCH_REJECTED')::int) AS rejected
      FROM trip_event
      WHERE event_type IN ('DISPATCH_ACCEPTED', 'DISPATCH_REJECTED')
      GROUP BY metadata->>'driverProfileId'
    `;

    const performanceMap = new Map<string, { accepted: number; rejected: number }>();
    for (const row of performanceRows) {
      performanceMap.set(row.driver_profile_id, { accepted: Number(row.accepted), rejected: Number(row.rejected) });
    }

    const candidates = rawCandidates.map((row: typeof rawCandidates[0]) => {
      const performance = performanceMap.get(row.driver_profile_id) ?? { accepted: 0, rejected: 0 };
      const total = performance.accepted + performance.rejected;
      const acceptanceRate = total > 0 ? performance.accepted / total : 0;

      return {
        driverProfileId: row.driver_profile_id,
        userId: row.user_id,
        vehicleId: row.vehicle_id,
        averageRating: row.average_rating,
        distanceMeters: Number(row.distance_meters || 0),
        acceptanceRate
      };
    });

    return candidates.sort((a: typeof candidates[0], b: typeof candidates[0]) => {
      if (a.distanceMeters !== b.distanceMeters) return a.distanceMeters - b.distanceMeters;
      if (a.averageRating !== b.averageRating) return (b.averageRating ?? 0) - (a.averageRating ?? 0);
      return b.acceptanceRate - a.acceptanceRate;
    });
  }

  private waitForDriverDecision(tripId: string, driverProfileId: string, timeoutMs: number) {
    if (this.activeDispatchSessions.has(tripId)) {
      throw new BadRequestException('Another dispatch attempt is already waiting for a response.');
    }

    return new Promise<DispatchOutcome>((resolve) => {
      const timer = setTimeout(() => {
        this.activeDispatchSessions.delete(tripId);
        resolve('TIMEOUT');
      }, timeoutMs);

      this.activeDispatchSessions.set(tripId, {
        driverProfileId,
        timer,
        resolve: (outcome: DispatchOutcome) => {
          clearTimeout(timer);
          this.activeDispatchSessions.delete(tripId);
          resolve(outcome);
        }
      });
    });
  }

  async updateDriverLocation(tripId: string, userId: string, payload: { latitude: number; longitude: number }) {
    const driverProfile = await this.prisma.driverProfile.findUnique({
      where: { userId },
      select: { id: true }
    });
    if (!driverProfile) throw new ForbiddenException('Driver profile not found.');

    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      select: { id: true, status: true, driverProfileId: true }
    });
    if (!trip) throw new NotFoundException('Trip not found');
    if (trip.driverProfileId !== driverProfile.id) {
      throw new ForbiddenException('Driver not assigned to this trip.');
    }
    if (!this.isActiveTripStatus(trip.status as TripStatus)) {
      throw new BadRequestException('Location updates are only allowed while the trip is active.');
    }

    const rateKey = `trip_location_rate:${driverProfile.id}`;
    const rateResponse = await this.redisClient.set(rateKey, '1', 'PX', LOCATION_RATE_LIMIT_MS, 'NX');
    if (rateResponse !== 'OK') {
      throw new BadRequestException('Location updates are too frequent.');
    }

    const lastLocation = await this.prisma.tripLocation.findFirst({
      where: { tripId },
      orderBy: { recordedAt: 'desc' }
    });

    if (lastLocation) {
      const elapsedMs = Date.now() - lastLocation.recordedAt.getTime();
      const distanceMeters = haversineDistanceMeters(
        lastLocation.latitude,
        lastLocation.longitude,
        payload.latitude,
        payload.longitude
      );
      const speedMps = elapsedMs > 0 ? distanceMeters / (elapsedMs / 1000) : Infinity;
      if (speedMps > MAX_DRIVER_SPEED_MPS) {
        throw new BadRequestException('Impossible speed jump detected.');
      }
    }

    const location = await this.prisma.tripLocation.create({
      data: {
        tripId,
        latitude: payload.latitude,
        longitude: payload.longitude,
        recordedAt: new Date()
      }
    });

    await this.prisma.driverProfile.update({
      where: { id: driverProfile.id },
      data: {
        currentLatitude: payload.latitude,
        currentLongitude: payload.longitude,
        lastLocationUpdatedAt: new Date()
      }
    });

    await this.prisma.tripEvent.create({
      data: {
        tripId,
        eventType: 'LOCATION_UPDATED',
        metadata: { driverProfileId: driverProfile.id, latitude: payload.latitude, longitude: payload.longitude },
        occurredAt: new Date()
      }
    });

    this.tripsGateway.publishDriverLocation(tripId, {
      driverProfileId: driverProfile.id,
      latitude: payload.latitude,
      longitude: payload.longitude,
      recordedAt: location.recordedAt
    });

    return { location };
  }

  async getDriverLiveLocation(tripId: string, userId: string) {
    const riderProfile = await this.prisma.riderProfile.findUnique({
      where: { userId },
      select: { id: true }
    });
    if (!riderProfile) throw new ForbiddenException('Rider profile not found.');

    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        driverProfile: { include: { user: true } },
        vehicle: true
      }
    });
    if (!trip) throw new NotFoundException('Trip not found');
    if (trip.riderProfileId !== riderProfile.id) {
      throw new ForbiddenException('Rider not assigned to this trip.');
    }
    if (!this.isActiveTripStatus(trip.status)) {
      throw new BadRequestException('Live driver location is only available during an active trip.');
    }
    if (!trip.driverProfileId) {
      throw new BadRequestException('No driver assigned yet.');
    }

    const lastLocation = await this.prisma.tripLocation.findFirst({
      where: { tripId },
      orderBy: { recordedAt: 'desc' }
    });

    const stale = !lastLocation || Date.now() - lastLocation.recordedAt.getTime() > LOCATION_STALE_THRESHOLD_MS;

    return {
      driver: {
        id: trip.driverProfileId,
        name: trip.driverProfile?.user?.displayName ?? null,
        vehicle: trip.vehicle
          ? {
              id: trip.vehicle.id,
              registrationNumber: trip.vehicle.registrationNumber,
              vehicleType: trip.vehicle.vehicleType
            }
          : null
      },
      location: lastLocation
        ? {
            latitude: lastLocation.latitude,
            longitude: lastLocation.longitude,
            recordedAt: lastLocation.recordedAt
          }
        : null,
      stale
    };
  }

  async getTripPin(tripId: string, userId: string) {
    const riderProfile = await this.prisma.riderProfile.findUnique({ where: { userId }, select: { id: true } });
    if (!riderProfile) throw new ForbiddenException('Rider profile not found.');

    const trip = await this.prisma.trip.findUnique({ where: { id: tripId }, select: { riderProfileId: true, pinCode: true, pinExpiresAt: true, status: true } });
    if (!trip) throw new NotFoundException('Trip not found');
    if (trip.riderProfileId !== riderProfile.id) throw new ForbiddenException('Rider not assigned to this trip.');
    if (!trip.pinCode) throw new BadRequestException('No PIN available for this trip.');
    if (['EXPIRED', 'COMPLETED', 'CANCELLED_BY_DRIVER', 'CANCELLED_BY_RIDER', 'DISPUTED'].includes(trip.status as string)) {
      throw new BadRequestException('PIN is not available for this trip.');
    }
    if (trip.pinExpiresAt && new Date(trip.pinExpiresAt).getTime() < Date.now()) throw new BadRequestException('PIN has expired.');

    // only show PIN to rider
    return { pin: trip.pinCode, expiresAt: trip.pinExpiresAt };
  }

  private isActiveTripStatus(status: TripStatus) {
    return ACTIVE_TRIP_STATUSES.includes(status);
  }



  private resolveDispatchSession(tripId: string, driverProfileId: string, outcome: DispatchOutcome) {
    const session = this.activeDispatchSessions.get(tripId);
    if (!session || session.driverProfileId !== driverProfileId) {
      return false;
    }

    session.resolve(outcome);
    return true;
  }
}
