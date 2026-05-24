import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { CreateVehicleDocumentDto } from './dto/create-vehicle-document.dto';

@Injectable()
export class VehiclesService {
  constructor(private readonly prisma: PrismaService) {}

  private buildUploadUrl(documentId: string) {
    return `https://storage.rydulux.local/upload/${documentId}?signature=placeholder`;
  }

  async createVehicle(userId: string, payload: CreateVehicleDto) {
    const driverProfile = await this.prisma.driverProfile.findUnique({ where: { userId } });
    if (!driverProfile) {
      throw new BadRequestException('Driver profile not found.');
    }

    await this.prisma.vehicle.updateMany({
      where: { driverProfileId: driverProfile.id, status: 'ACTIVE' },
      data: { status: 'INACTIVE' }
    });

    const vehicle = await this.prisma.vehicle.create({
      data: {
        driverProfileId: driverProfile.id,
        registrationNumber: payload.registrationNumber,
        make: payload.make,
        model: payload.model,
        year: payload.year,
        color: payload.color,
        capacity: payload.capacity,
        vehicleType: payload.vehicleCategory ?? payload.vehicleType,
        status: 'INACTIVE'
      }
    });

    await this.prisma.driverProfile.update({ where: { id: driverProfile.id }, data: { activeVehicleId: vehicle.id } });
    await this.prisma.auditLog.create({ data: { actorId: userId, action: 'VEHICLE_CREATED', entity: 'VEHICLE', entityId: vehicle.id, payload: { make: vehicle.make, model: vehicle.model } } });

    return vehicle;
  }

  async requestVehicleDocumentUpload(userId: string, vehicleId: string, payload: CreateVehicleDocumentDto) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId }, include: { driverProfile: true } });
    if (!vehicle) {
      throw new NotFoundException('Vehicle not found.');
    }

    if (!vehicle.driverProfile || vehicle.driverProfile.userId !== userId) {
      throw new ForbiddenException('Access denied.');
    }

    const documentId = randomUUID();
    const uploadUrl = this.buildUploadUrl(documentId);
    const documentUrl = `pending://${documentId}`;

    const vehicleDocument = await this.prisma.vehicleDocument.create({
      data: {
        vehicleId,
        documentType: payload.documentType,
        status: 'PENDING',
        documentUrl,
        issuedAt: payload.issuedAt ? new Date(payload.issuedAt) : undefined,
        expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : undefined,
        metadata: (payload.metadata ?? {}) as any
      }
    });

    await this.prisma.auditLog.create({ data: { actorId: userId, action: 'VEHICLE_DOCUMENT_UPLOAD_REQUESTED', entity: 'VEHICLE_DOCUMENT', entityId: vehicleDocument.id, payload: { vehicleId, documentType: payload.documentType } } });

    return {
      documentId: vehicleDocument.id,
      uploadUrl,
      status: vehicleDocument.status,
      documentType: vehicleDocument.documentType,
      expiresAt: vehicleDocument.expiresAt
    };
  }

  async listVehicleDocuments(userId: string, vehicleId: string) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId }, include: { driverProfile: true, documents: true } });
    if (!vehicle) {
      throw new NotFoundException('Vehicle not found.');
    }

    if (!vehicle.driverProfile || vehicle.driverProfile.userId !== userId) {
      throw new ForbiddenException('Access denied.');
    }

    return vehicle.documents;
  }

  async getVehicleVerificationStatus(userId: string, vehicleId: string) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId }, include: { driverProfile: true, documents: true } });
    if (!vehicle) {
      throw new NotFoundException('Vehicle not found.');
    }

    if (!vehicle.driverProfile || vehicle.driverProfile.userId !== userId) {
      throw new ForbiddenException('Access denied.');
    }

    const requiredDocuments = [
      'VEHICLE_REGISTRATION',
      'ROADWORTHINESS_CERTIFICATE',
      'INSURANCE_DOCUMENT',
      'VEHICLE_EXTERIOR_PHOTO',
      'VEHICLE_INTERIOR_PHOTO'
    ];

    const now = new Date();
    const documentSummaries = vehicle.documents.map((doc) => ({
      id: doc.id,
      documentType: doc.documentType,
      status: doc.status,
      issuedAt: doc.issuedAt,
      expiresAt: doc.expiresAt,
      isExpired: !!doc.expiresAt && doc.expiresAt <= now,
      metadata: doc.metadata
    }));

    const hasAllApprovedDocuments = requiredDocuments.every((type) =>
      vehicle.documents.some((doc) =>
        doc.documentType === type &&
        doc.status === 'APPROVED' &&
        (!doc.expiresAt || doc.expiresAt > now)
      )
    );

    return {
      vehicleId: vehicle.id,
      status: vehicle.status,
      approvedAt: vehicle.approvedAt,
      verifiedAt: vehicle.verifiedAt,
      isApproved: !!vehicle.approvedAt,
      canAcceptRides: vehicle.status === 'ACTIVE' && hasAllApprovedDocuments,
      documents: documentSummaries,
      missingRequiredDocuments: requiredDocuments.filter((type) =>
        !vehicle.documents.some((doc) =>
          doc.documentType === type &&
          doc.status === 'APPROVED' &&
          (!doc.expiresAt || doc.expiresAt > now)
        )
      )
    };
  }

  async getVehicle(userId: string, vehicleId: string) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId }, include: { documents: true } });
    if (!vehicle) {
      throw new NotFoundException('Vehicle not found.');
    }

    const profile = await this.prisma.driverProfile.findUnique({ where: { id: vehicle.driverProfileId } });
    if (!profile || profile.userId !== userId) {
      throw new ForbiddenException('Access denied.');
    }

    return vehicle;
  }

  async listVehicles(userId: string) {
    const profile = await this.prisma.driverProfile.findUnique({ where: { userId } });
    if (!profile) return [];
    return this.prisma.vehicle.findMany({ where: { driverProfileId: profile.id }, include: { documents: true } });
  }

  async activateVehicle(userId: string, vehicleId: string) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) throw new NotFoundException('Vehicle not found.');

    const profile = await this.prisma.driverProfile.findUnique({ where: { id: vehicle.driverProfileId } });
    if (!profile || profile.userId !== userId) throw new ForbiddenException('Access denied.');

    // Only allow activation if vehicle is approved and not suspended
    if (vehicle.status !== 'ACTIVE' && vehicle.status !== 'INACTIVE') {
      throw new BadRequestException('Vehicle must be in ACTIVE/INACTIVE state to be set active.');
    }

    if (!vehicle.approvedAt) {
      throw new BadRequestException('Vehicle must be approved before it can be activated.');
    }

    // set other vehicles inactive
    await this.prisma.vehicle.updateMany({ where: { driverProfileId: profile.id, id: { not: vehicleId } }, data: { status: 'INACTIVE' } });

    const updated = await this.prisma.vehicle.update({ where: { id: vehicleId }, data: { status: 'ACTIVE', verifiedAt: vehicle.verifiedAt ?? new Date() } });

    await this.prisma.driverProfile.update({ where: { id: profile.id }, data: { activeVehicleId: vehicleId } });

    await this.prisma.auditLog.create({ data: { actorId: userId, action: 'VEHICLE_ACTIVATED', entity: 'VEHICLE', entityId: vehicleId, payload: {} } });

    return updated;
  }
}
