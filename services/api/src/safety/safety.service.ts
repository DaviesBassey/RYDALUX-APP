import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const RIDER_ACTIVE_STATUSES = [
  'DRAFT',
  'QUOTED',
  'REQUESTED',
  'DRIVER_ASSIGNED',
  'DRIVER_ARRIVING',
  'DRIVER_ARRIVED',
  'PIN_VERIFIED',
  'IN_PROGRESS',
] as const;

const DRIVER_ACTIVE_STATUSES = [
  'DRIVER_ASSIGNED',
  'DRIVER_ARRIVING',
  'DRIVER_ARRIVED',
  'PIN_VERIFIED',
  'IN_PROGRESS',
] as const;

@Injectable()
export class SafetyService {
  constructor(private readonly prisma: PrismaService) {}

  async triggerSos(
    userId: string,
    userType: 'RIDER' | 'DRIVER',
    type: string,
    latitude: number,
    longitude: number,
    notes?: string,
  ) {
    // Find the user's active trip, if any
    let tripId: string | null = null;

    if (userType === 'RIDER') {
      const riderProfile = await this.prisma.riderProfile.findUnique({
        where: { userId },
        select: { id: true },
      });
      if (riderProfile) {
        const trip = await this.prisma.trip.findFirst({
          where: {
            riderProfileId: riderProfile.id,
            status: { in: RIDER_ACTIVE_STATUSES as any },
          },
          orderBy: { createdAt: 'desc' },
          select: { id: true },
        });
        if (trip) tripId = trip.id;
      }
    } else if (userType === 'DRIVER') {
      const driverProfile = await this.prisma.driverProfile.findUnique({
        where: { userId },
        select: { id: true },
      });
      if (driverProfile) {
        const trip = await this.prisma.trip.findFirst({
          where: {
            driverProfileId: driverProfile.id,
            status: { in: DRIVER_ACTIVE_STATUSES as any },
          },
          orderBy: { createdAt: 'desc' },
          select: { id: true },
        });
        if (trip) tripId = trip.id;
      }
    }

    // Create SOS event
    const sos = await this.prisma.sosEvent.create({
      data: {
        userId,
        tripId,
        type: type as any,
        status: 'TRIGGERED',
        latitude,
        longitude,
        notes: notes ?? null,
      },
    });

    // If linked to a trip, flag it
    if (tripId) {
      await this.prisma.trip.update({
        where: { id: tripId },
        data: { safetyFlagged: true },
      });
    }

    return {
      id: sos.id,
      tripId: sos.tripId,
      type: sos.type,
      status: sos.status,
      latitude: sos.latitude,
      longitude: sos.longitude,
      notes: sos.notes,
      triggeredAt: sos.triggeredAt,
    };
  }

  async getActiveSosForUser(userId: string) {
    const sos = await this.prisma.sosEvent.findFirst({
      where: { userId, status: { in: ['TRIGGERED', 'ACKNOWLEDGED'] } },
      orderBy: { triggeredAt: 'desc' },
      include: {
        trip: { select: { id: true, reference: true, status: true } },
      },
    });

    if (!sos) return { sos: null };

    return {
      sos: {
        id: sos.id,
        tripId: sos.tripId,
        type: sos.type,
        status: sos.status,
        latitude: sos.latitude,
        longitude: sos.longitude,
        notes: sos.notes,
        triggeredAt: sos.triggeredAt,
        resolvedAt: sos.resolvedAt,
        trip: sos.trip,
      },
    };
  }
}
