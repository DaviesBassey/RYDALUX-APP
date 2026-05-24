import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReviewDriverDocumentDto } from '../drivers/dto/review-driver-document.dto';
import { ReviewVehicleDto } from './dto/review-vehicle.dto';

const INCIDENT_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const INCIDENT_STATUSES = ['OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED'];

function clampPagination(limit = 20, offset = 0) {
  const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(Math.trunc(limit), 1), 100) : 20;
  const safeOffset = Number.isFinite(offset) ? Math.max(Math.trunc(offset), 0) : 0;
  return { limit: safeLimit, offset: safeOffset };
}

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async approveKyc(reviewerId: string, userId: string, comment?: string) {
    await this.prisma.kycCheck.updateMany({
      where: { userId, status: 'SUBMITTED' },
      data: {
        status: 'APPROVED',
        reviewedAt: new Date(),
        reviewedById: reviewerId,
        notes: comment
      }
    });

    await this.logAdminAction(reviewerId, 'KYC_APPROVE', userId, { comment });
    return { success: true };
  }

  async approvePayout(approverId: string, payoutId: string, comment?: string) {
    const payout = await this.prisma.payout.findUnique({ where: { id: payoutId } });
    if (!payout) throw new NotFoundException('Payout not found.');
    if (payout.status === 'PAID') throw new BadRequestException('Payout has already been paid.');
    if (payout.status === 'FAILED') throw new BadRequestException('Payout has failed and cannot be approved.');

    await this.prisma.payout.update({
      where: { id: payoutId },
      data: {
        status: 'PAID',
        processedAt: new Date(),
        notes: comment
      }
    });

    await this.logAdminAction(approverId, 'PAYOUT_APPROVE', payoutId, { comment, previousStatus: payout.status });
    return { success: true };
  }

  async dispatchTask(adminId: string, tripId: string, driverId: string) {
    await this.prisma.trip.update({
      where: { id: tripId },
      data: {
        driverProfileId: driverId,
        status: 'DRIVER_ASSIGNED' as any
      }
    });

    await this.logAdminAction(adminId, 'DISPATCH_TASK', tripId, { driverId });
    return { success: true };
  }

  async reportIncident(adminId: string, tripId: string, description: string, severity?: string) {
    const trip = await this.prisma.trip.findUnique({ where: { id: tripId }, select: { id: true } });
    if (!trip) throw new NotFoundException('Trip not found.');

    const incidentSeverity = severity ?? 'MEDIUM';
    if (!INCIDENT_SEVERITIES.includes(incidentSeverity)) {
      throw new BadRequestException(`Severity must be one of: ${INCIDENT_SEVERITIES.join(', ')}`);
    }

    const existingIncident = await this.prisma.incidentReport.findUnique({ where: { tripId }, select: { id: true } });
    if (existingIncident) throw new BadRequestException('An incident has already been reported for this trip.');

    const incident = await this.prisma.incidentReport.create({
      data: {
        tripId,
        reportedById: adminId,
        severity: incidentSeverity as any,
        status: 'OPEN',
        description,
      },
    });

    await this.logAdminAction(adminId, 'REPORT_INCIDENT', tripId, { incidentId: incident.id, description, severity });
    return { success: true, incidentId: incident.id };
  }

  async reviewDriverDocument(adminId: string, documentId: string, payload: ReviewDriverDocumentDto) {
    if (payload.action === 'reject' && !payload.rejectionReason) {
      throw new BadRequestException('Rejection reason is required when rejecting a document.');
    }

    const driverDocument = await this.prisma.driverDocument.findUnique({ where: { id: documentId } });
    const vehicleDocument = driverDocument
      ? null
      : await this.prisma.vehicleDocument.findUnique({ where: { id: documentId } });

    if (!driverDocument && !vehicleDocument) {
      throw new NotFoundException('Driver document not found.');
    }

    const documentType = driverDocument ? driverDocument.documentType : vehicleDocument!.documentType;
    const entityId = driverDocument ? driverDocument.userId : vehicleDocument!.vehicleId;
    const status = payload.action === 'approve' ? 'APPROVED' : 'REJECTED';
    const baseMeta = (driverDocument?.metadata ?? vehicleDocument?.metadata ?? {}) as Record<string, unknown>;
    const commonData: any = {
      status,
      verifiedAt: payload.action === 'approve' ? new Date() : undefined,
      metadata: payload.action === 'reject' ? { ...baseMeta, rejectionReason: payload.rejectionReason } : payload.action === 'approve' ? { ...baseMeta, reviewedAt: new Date().toISOString() } : undefined,
      expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : undefined
    };

    if (driverDocument) {
      await this.prisma.driverDocument.update({ where: { id: documentId }, data: commonData });
    } else {
      await this.prisma.vehicleDocument.update({ where: { id: documentId }, data: commonData });
    }

    await this.logAdminAction(adminId, `DRIVER_DOCUMENT_${status}`, entityId, {
      documentId,
      documentType,
      rejectionReason: payload.rejectionReason
    });

    return { success: true };
  }

  async reviewVehicle(adminId: string, vehicleId: string, payload: ReviewVehicleDto) {
    if (payload.action === 'reject' && !payload.rejectionReason) {
      throw new BadRequestException('Rejection reason is required when rejecting a vehicle.');
    }

    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) throw new NotFoundException('Vehicle not found.');

    const driverProfile = await this.prisma.driverProfile.findUnique({ where: { id: vehicle.driverProfileId } });
    const driverId = driverProfile?.userId ?? null;

    if (payload.action === 'approve') {
      // set other vehicles inactive, approve this one
      await this.prisma.vehicle.updateMany({ where: { driverProfileId: vehicle.driverProfileId, id: { not: vehicleId } }, data: { status: 'INACTIVE' } });
      await this.prisma.vehicle.update({ where: { id: vehicleId }, data: { status: 'ACTIVE', approvedAt: new Date(), verifiedAt: new Date() } });
      await this.logAdminAction(adminId, 'VEHICLE_APPROVED', vehicleId, { vehicleId, driverId });
    } else if (payload.action === 'reject') {
      await this.prisma.vehicle.update({ where: { id: vehicleId }, data: { status: 'INACTIVE' } });
      await this.logAdminAction(adminId, 'VEHICLE_REJECTED', vehicleId, { reason: payload.rejectionReason, vehicleId, driverId });
    } else if (payload.action === 'suspend') {
      await this.prisma.vehicle.update({ where: { id: vehicleId }, data: { status: 'SUSPENDED' } });
      await this.logAdminAction(adminId, 'VEHICLE_SUSPENDED', vehicleId, { vehicleId, driverId });
    } else if (payload.action === 'reactivate') {
      // reactivate: set others inactive
      await this.prisma.vehicle.updateMany({ where: { driverProfileId: vehicle.driverProfileId, id: { not: vehicleId } }, data: { status: 'INACTIVE' } });
      await this.prisma.vehicle.update({ where: { id: vehicleId }, data: { status: 'ACTIVE' } });
      await this.logAdminAction(adminId, 'VEHICLE_REACTIVATED', vehicleId, { vehicleId, driverId });
    }

    return { success: true };
  }

  async getPendingKyc(limit = 20, offset = 0) {
    const [items, total] = await Promise.all([
      this.prisma.kycCheck.findMany({
        where: { status: 'SUBMITTED' },
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } }
        },
        orderBy: { submittedAt: 'desc' },
        skip: offset,
        take: limit
      }),
      this.prisma.kycCheck.count({ where: { status: 'SUBMITTED' } })
    ]);
    return { items, total, limit, offset };
  }

  async getPendingDriverDocuments(limit = 20, offset = 0) {
    const [driverDocs, vehicleDocs, driverTotal, vehicleTotal] = await Promise.all([
      this.prisma.driverDocument.findMany({
        where: { status: 'PENDING', deletedAt: null },
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit
      }),
      this.prisma.vehicleDocument.findMany({
        where: { status: 'PENDING', deletedAt: null },
        include: {
          vehicle: { select: { id: true, registrationNumber: true, make: true, model: true, driverProfileId: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit
      }),
      this.prisma.driverDocument.count({ where: { status: 'PENDING', deletedAt: null } }),
      this.prisma.vehicleDocument.count({ where: { status: 'PENDING', deletedAt: null } })
    ]);
    return {
      driverDocuments: { items: driverDocs, total: driverTotal },
      vehicleDocuments: { items: vehicleDocs, total: vehicleTotal },
      limit,
      offset
    };
  }

  async getPendingVehicles(limit = 20, offset = 0) {
    const [items, total] = await Promise.all([
      this.prisma.vehicle.findMany({
        where: { status: 'INACTIVE', deletedAt: null },
        include: {
          driverProfile: {
            include: {
              user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit
      }),
      this.prisma.vehicle.count({ where: { status: 'INACTIVE', deletedAt: null } })
    ]);
    return { items, total, limit, offset };
  }

  async getAuditLogs() {
    return this.prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
  }

  async listSosEvents(limit = 20, offset = 0) {
    const page = clampPagination(limit, offset);
    const [items, total] = await Promise.all([
      this.prisma.sosEvent.findMany({
        orderBy: { triggeredAt: 'desc' },
        include: {
          user: { select: { id: true, displayName: true, phone: true } },
          trip: { select: { id: true, reference: true, status: true } },
        },
        skip: page.offset,
        take: page.limit,
      }),
      this.prisma.sosEvent.count(),
    ]);

    return {
      items: items.map((s) => ({
        id: s.id,
        type: s.type,
        status: s.status,
        latitude: s.latitude,
        longitude: s.longitude,
        notes: s.notes,
        triggeredAt: s.triggeredAt,
        resolvedAt: s.resolvedAt,
        user: s.user,
        trip: s.trip,
      })),
      total,
      limit: page.limit,
      offset: page.offset,
    };
  }

  async listIncidents(limit = 20, offset = 0) {
    const page = clampPagination(limit, offset);
    const [items, total] = await Promise.all([
      this.prisma.incidentReport.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          reportedBy: { select: { id: true, displayName: true } },
          trip: { select: { id: true, reference: true, status: true } },
        },
        skip: page.offset,
        take: page.limit,
      }),
      this.prisma.incidentReport.count(),
    ]);

    return {
      items: items.map((i) => ({
        id: i.id,
        tripId: i.tripId,
        severity: i.severity,
        status: i.status,
        description: i.description,
        resolvedAt: i.resolvedAt,
        createdAt: i.createdAt,
        updatedAt: i.updatedAt,
        reportedBy: i.reportedBy,
        trip: i.trip,
      })),
      total,
      limit: page.limit,
      offset: page.offset,
    };
  }

  async resolveSosEvent(adminId: string, sosEventId: string, notes?: string) {
    const sos = await this.prisma.sosEvent.findUnique({ where: { id: sosEventId } });
    if (!sos) throw new NotFoundException('SOS event not found.');
    if (sos.status === 'RESOLVED') throw new BadRequestException('SOS event is already resolved.');

    await this.prisma.sosEvent.update({
      where: { id: sosEventId },
      data: { status: 'RESOLVED', resolvedAt: new Date(), notes: notes ?? sos.notes },
    });

    await this.logAdminAction(adminId, 'SOS_RESOLVED', sosEventId, { previousStatus: sos.status, notes });
    return { success: true };
  }

  async updateIncidentStatus(adminId: string, incidentId: string, status: string) {
    const incident = await this.prisma.incidentReport.findUnique({ where: { id: incidentId } });
    if (!incident) throw new NotFoundException('Incident not found.');

    if (!INCIDENT_STATUSES.includes(status)) {
      throw new BadRequestException(`Status must be one of: ${INCIDENT_STATUSES.join(', ')}`);
    }

    const updateData: any = { status: status as any };
    if (status === 'RESOLVED' || status === 'CLOSED') {
      updateData.resolvedAt = new Date();
    } else {
      updateData.resolvedAt = null;
    }

    await this.prisma.incidentReport.update({
      where: { id: incidentId },
      data: updateData,
    });

    await this.logAdminAction(adminId, 'INCIDENT_STATUS_UPDATED', incidentId, { previousStatus: incident.status, newStatus: status });
    return { success: true };
  }

  async logAdminAction(actorId: string, action: string, entityId: string, details: any = {}) {
    return this.prisma.auditLog.create({
      data: {
        actorId,
        action,
        entity: 'ADMIN',
        entityId,
        payload: { details }
      }
    });
  }
}
