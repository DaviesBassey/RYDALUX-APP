import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSosEventDto } from './dto/create-sos-event.dto';
import { CreateIncidentReportDto } from './dto/create-incident-report.dto';
import { AddTrustedContactDto } from './dto/add-trusted-contact.dto';
import { GenerateShareLinkDto } from './dto/generate-share-link.dto';
import { FlagUserDto } from './dto/flag-user.dto';
import { randomBytes } from 'crypto';

@Injectable()
export class SafetyService {
  constructor(private prisma: PrismaService) {}

  // SOS Operations
  async createSosEvent(userId: string, dto: CreateSosEventDto) {
    return this.prisma.sosEvent.create({
      data: {
        userId,
        type: dto.type as any,
        latitude: dto.latitude || 0,
        longitude: dto.longitude || 0,
        tripId: dto.tripId,
        status: 'OPEN' as any,
      },
    });
  }

  async acknowledgeSosEvent(adminId: string, sosEventId: string) {
    const sosEvent = await this.prisma.sosEvent.findUnique({
      where: { id: sosEventId },
    });

    if (!sosEvent) {
      throw new NotFoundException('SOS event not found');
    }

    const updated = await this.prisma.sosEvent.update({
      where: { id: sosEventId },
      data: { status: 'ACKNOWLEDGED' },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: adminId,
        action: 'SOS_ACKNOWLEDGED',
        entity: 'SOS_EVENT',
        entityId: sosEventId,
        payload: { previousStatus: sosEvent.status, newStatus: 'ACKNOWLEDGED' },
      },
    });

    return updated;
  }

  async escalateSosEvent(adminId: string, sosEventId: string, reason?: string) {
    const sosEvent = await this.prisma.sosEvent.findUnique({
      where: { id: sosEventId },
    });

    if (!sosEvent) {
      throw new NotFoundException('SOS event not found');
    }

    const updated = await this.prisma.sosEvent.update({
      where: { id: sosEventId },
      data: { status: 'ESCALATED' },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: adminId,
        action: 'SOS_ESCALATED',
        entity: 'SOS_EVENT',
        entityId: sosEventId,
        payload: { reason, previousStatus: sosEvent.status, newStatus: 'ESCALATED' },
      },
    });

    return updated;
  }

  async resolveSosEvent(adminId: string, sosEventId: string, resolution: string) {
    const sosEvent = await this.prisma.sosEvent.findUnique({
      where: { id: sosEventId },
    });

    if (!sosEvent) {
      throw new NotFoundException('SOS event not found');
    }

    const updated = await this.prisma.sosEvent.update({
      where: { id: sosEventId },
      data: { status: 'RESOLVED', resolvedAt: new Date() },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: adminId,
        action: 'SOS_RESOLVED',
        entity: 'SOS_EVENT',
        entityId: sosEventId,
        payload: { resolution, previousStatus: sosEvent.status, newStatus: 'RESOLVED' },
      },
    });

    return updated;
  }

  async getSosEvent(sosEventId: string, userId: string) {
    const sosEvent = await this.prisma.sosEvent.findUnique({
      where: { id: sosEventId },
      include: { user: { select: { id: true, displayName: true } } },
    });

    if (!sosEvent) {
      throw new NotFoundException('SOS event not found');
    }

    if (sosEvent.userId !== userId) {
      throw new ForbiddenException('Not authorized to view this SOS event');
    }

    return sosEvent;
  }

  async listSosEvents(filters?: { status?: string; userId?: string; driverId?: string }) {
    return this.prisma.sosEvent.findMany({
      where: {
        ...(filters?.status && { status: filters.status as any }),
        ...(filters?.userId && { userId: filters.userId }),
      },
      include: { user: { select: { id: true, displayName: true } } },
      orderBy: { triggeredAt: 'desc' },
    });
  }

  // Incident Report Operations
  async createIncidentReport(reporterId: string, dto: CreateIncidentReportDto) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: dto.tripId },
      include: { riderProfile: { select: { userId: true } }, driverProfile: { select: { userId: true } } },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    if (trip.riderProfile?.userId !== reporterId && trip.driverProfile?.userId !== reporterId) {
      throw new ForbiddenException('Can only report incidents for your own trips');
    }

    const incident = await this.prisma.incidentReport.create({
      data: {
        tripId: dto.tripId,
        reportedById: reporterId,
        description: `${dto.type}: ${dto.description}`,
        severity: (dto.severity || 'MEDIUM') as any,
        status: 'OPEN' as any,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: reporterId,
        action: 'INCIDENT_REPORTED',
        entity: 'INCIDENT_REPORT',
        entityId: incident.id,
        payload: { type: dto.type, severity: dto.severity, tripId: dto.tripId },
      },
    });

    return incident;
  }

  async getIncidentReport(reportId: string, userId: string) {
    const incident = await this.prisma.incidentReport.findUnique({
      where: { id: reportId },
      include: {
        trip: {
          include: { riderProfile: { select: { userId: true } }, driverProfile: { select: { userId: true } } },
        },
        reportedBy: { select: { id: true, displayName: true } },
      },
    });

    if (!incident) {
      throw new NotFoundException('Incident report not found');
    }

    if (incident.reportedById !== userId && incident.trip.riderProfile?.userId !== userId && incident.trip.driverProfile?.userId !== userId) {
      throw new ForbiddenException('Not authorized to view this incident');
    }

    return incident;
  }

  async updateIncidentStatus(adminId: string, reportId: string, status: string, notes?: string) {
    const incident = await this.prisma.incidentReport.findUnique({
      where: { id: reportId },
    });

    if (!incident) {
      throw new NotFoundException('Incident report not found');
    }

    const updated = await this.prisma.incidentReport.update({
      where: { id: reportId },
      data: { status: status as any, resolvedAt: status === 'RESOLVED' || status === 'DISMISSED' ? new Date() : null },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: adminId,
        action: 'INCIDENT_STATUS_UPDATED',
        entity: 'INCIDENT_REPORT',
        entityId: reportId,
        payload: { previousStatus: incident.status, newStatus: status, notes },
      },
    });

    return updated;
  }

  async listIncidentReports(filters?: { status?: string; tripId?: string; reporterId?: string }) {
    return this.prisma.incidentReport.findMany({
      where: {
        ...(filters?.status && { status: filters.status as any }),
        ...(filters?.tripId && { tripId: filters.tripId }),
        ...(filters?.reporterId && { reportedById: filters.reporterId }),
      },
      include: {
        reportedBy: { select: { id: true, displayName: true } },
        trip: { select: { id: true, riderProfileId: true, driverProfileId: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Trusted Contact Operations
  async addTrustedContact(userId: string, dto: AddTrustedContactDto) {
    return this.prisma.trustedContact.create({
      data: {
        userId,
        name: dto.name,
        phone: dto.phone,
        relationship: dto.relationship,
      },
    });
  }

  async removeTrustedContact(userId: string, contactId: string) {
    const contact = await this.prisma.trustedContact.findUnique({
      where: { id: contactId },
    });

    if (!contact) {
      throw new NotFoundException('Trusted contact not found');
    }

    if (contact.userId !== userId) {
      throw new ForbiddenException('Not authorized to remove this contact');
    }

    return this.prisma.trustedContact.delete({
      where: { id: contactId },
    });
  }

  async listTrustedContacts(userId: string) {
    return this.prisma.trustedContact.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async notifyTrustedContacts(userId: string, event: 'SOS' | 'LONG_STOP') {
    const contacts = await this.prisma.trustedContact.findMany({
      where: { userId, isVerified: true },
    });

    console.log(`Notifying ${contacts.length} trusted contacts for ${event} event`);

    return {
      event,
      notificationsSent: contacts.length,
      timestamp: new Date(),
    };
  }

  // Share Trip Link Operations
  async generateShareLink(userId: string, dto: GenerateShareLinkDto, expirationMinutes = 60) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: dto.tripId },
      include: { riderProfile: { select: { userId: true } } },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    if (trip.riderProfile?.userId !== userId) {
      throw new ForbiddenException('Can only share your own trips');
    }

    const shareToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);

    const link = await this.prisma.shareTripLink.create({
      data: {
        tripId: dto.tripId,
        createdByUserId: userId,
        shareToken,
        expiresAt,
        allowedData: ['location', 'driver', 'eta'],
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: userId,
        action: 'SHARE_TRIP_LINK_GENERATED',
        entity: 'SHARE_TRIP_LINK',
        entityId: link.id,
        payload: { tripId: dto.tripId, expiresAt },
      },
    });

    return { id: link.id, shareToken, expiresAt };
  }

  async getSharedTrip(shareToken: string) {
    const link = await this.prisma.shareTripLink.findUnique({
      where: { shareToken },
      include: {
        trip: {
          select: {
            id: true,
            status: true,
            dropoffAddress: true,
            createdAt: true,
            driverProfile: {
              select: {
                currentLatitude: true,
                currentLongitude: true,
                user: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
      },
    });

    if (!link) {
      throw new NotFoundException('Share link not found');
    }

    if (link.isExpired || new Date() > link.expiresAt) {
      throw new BadRequestException('Share link has expired');
    }

    const driverName = link.trip.driverProfile
      ? `${link.trip.driverProfile.user.firstName} ${link.trip.driverProfile.user.lastName}`.trim()
      : 'Unknown';

    return {
      trip: {
        id: link.trip.id,
        status: link.trip.status,
        driverName: driverName.substring(0, driverName.length - 3) + '...',
        currentLatitude: link.trip.driverProfile?.currentLatitude,
        currentLongitude: link.trip.driverProfile?.currentLongitude,
        createdAt: link.trip.createdAt,
        dropoffAddress: link.trip.dropoffAddress,
      },
    };
  }

  async expireShareLink(userId: string, linkId: string) {
    const link = await this.prisma.shareTripLink.findUnique({
      where: { id: linkId },
    });

    if (!link) {
      throw new NotFoundException('Share link not found');
    }

    if (link.createdByUserId !== userId) {
      throw new ForbiddenException('Not authorized to expire this link');
    }

    return this.prisma.shareTripLink.update({
      where: { id: linkId },
      data: { isExpired: true },
    });
  }

  async validateShareToken(token: string) {
    const link = await this.prisma.shareTripLink.findUnique({
      where: { shareToken: token },
    });

    if (!link) {
      return { valid: false, reason: 'Link not found' };
    }

    if (link.isExpired) {
      return { valid: false, reason: 'Link is expired' };
    }

    if (new Date() > link.expiresAt) {
      return { valid: false, reason: 'Link has expired' };
    }

    return { valid: true, tripId: link.tripId };
  }

  // Safety Flag Operations
  async flagUser(adminId: string, dto: FlagUserDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const flag = await this.prisma.safetyFlag.create({
      data: {
        userId: dto.userId,
        flagType: dto.flagType as any,
        severity: (dto.severity || 'MEDIUM') as any,
        reason: dto.reason,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: adminId,
        action: 'USER_FLAGGED',
        entity: 'SAFETY_FLAG',
        entityId: flag.id,
        payload: { userId: dto.userId, flagType: dto.flagType, reason: dto.reason },
      },
    });

    return flag;
  }

  async unflagUser(adminId: string, flagId: string) {
    const flag = await this.prisma.safetyFlag.findUnique({
      where: { id: flagId },
    });

    if (!flag) {
      throw new NotFoundException('Safety flag not found');
    }

    const updated = await this.prisma.safetyFlag.update({
      where: { id: flagId },
      data: { isActive: false, resolvedAt: new Date() },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: adminId,
        action: 'USER_UNFLAGGED',
        entity: 'SAFETY_FLAG',
        entityId: flagId,
        payload: { userId: flag.userId },
      },
    });

    return updated;
  }

  async getUserFlags(userId: string) {
    return this.prisma.safetyFlag.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async checkUserRiskLevel(userId: string): Promise<'LOW' | 'MEDIUM' | 'HIGH'> {
    const flags = await this.prisma.safetyFlag.findMany({
      where: { userId, isActive: true },
    });

    if (flags.length === 0) return 'LOW';
    if (flags.length === 1) return 'MEDIUM';
    return 'HIGH';
  }

  // Safety Check-in Operations
  async createSafetyCheckIn(tripId: string, userId: string, type: string, latitude: number, longitude: number) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: { riderProfile: { select: { userId: true } }, driverProfile: { select: { userId: true } } },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    if (trip.riderProfile?.userId !== userId && trip.driverProfile?.userId !== userId) {
      throw new ForbiddenException('Can only create check-in for own trips');
    }

    return this.prisma.safetyCheckIn.create({
      data: {
        tripId,
        userId,
        type,
        latitude,
        longitude,
      },
    });
  }

  async acknowledgeCheckIn(adminId: string, checkInId: string) {
    const checkIn = await this.prisma.safetyCheckIn.findUnique({
      where: { id: checkInId },
    });

    if (!checkIn) {
      throw new NotFoundException('Check-in not found');
    }

    return this.prisma.safetyCheckIn.update({
      where: { id: checkInId },
      data: { acknowledgedAt: new Date(), acknowledgedByUserId: adminId },
    });
  }

  async detectLongStop(tripId: string) {
    console.log(`[PLACEHOLDER] Detecting long stop for trip ${tripId}`);
    return { detected: false, reason: 'Detection not implemented' };
  }

  async detectRouteDeviation(tripId: string) {
    console.log(`[PLACEHOLDER] Detecting route deviation for trip ${tripId}`);
    return { detected: false, reason: 'Detection not implemented' };
  }

  // Admin Dashboard
  async getDashboardSummary() {
    const [openSos, pendingIncidents, flaggedUsers] = await Promise.all([
      this.prisma.sosEvent.count({ where: { status: 'OPEN' } }),
      this.prisma.incidentReport.count({ where: { status: 'OPEN' } }),
      this.prisma.safetyFlag.count({ where: { isActive: true } }),
    ]);

    return {
      openSosEvents: openSos,
      pendingIncidents,
      activelyFlaggedUsers: flaggedUsers,
      timestamp: new Date(),
    };
  }

  async getRecentSafetyEvents(limit = 20) {
    const [sosEvents, incidents] = await Promise.all([
      this.prisma.sosEvent.findMany({
        take: Math.floor(limit / 2),
        orderBy: { triggeredAt: 'desc' },
        include: { user: { select: { displayName: true } } },
      }),
      this.prisma.incidentReport.findMany({
        take: Math.floor(limit / 2),
        orderBy: { createdAt: 'desc' },
        include: { reportedBy: { select: { displayName: true } } },
      }),
    ]);

    return {
      sosEvents: sosEvents.map((e) => ({ ...e, type: 'SOS' })),
      incidents: incidents.map((i) => ({ ...i, type: 'INCIDENT' })),
    };
  }
}
