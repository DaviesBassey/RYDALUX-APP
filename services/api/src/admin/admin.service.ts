import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReviewDriverDocumentDto } from '../drivers/dto/review-driver-document.dto';
import { ReviewVehicleDto } from './dto/review-vehicle.dto';

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
    await this.prisma.payout.update({
      where: { id: payoutId },
      data: {
        status: 'PAID',
        processedAt: new Date(),
        notes: comment
      }
    });

    await this.logAdminAction(approverId, 'PAYOUT_APPROVE', payoutId, { comment });
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
    await this.logAdminAction(adminId, 'REPORT_INCIDENT', tripId, { description, severity });
    return { success: true };
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
