import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDriverDocumentDto } from './dto/create-driver-document.dto';

import { SubmitDriverOnboardingDto } from './dto/submit-driver-onboarding.dto';
import { randomUUID } from 'crypto';

const REQUIRED_DRIVER_DOCUMENT_TYPES = [
  'PROFILE_PHOTO',
  'GOVERNMENT_ID',
  'NIN',
  'DRIVER_LICENSE',
  'PROOF_OF_ADDRESS',
  'EMERGENCY_CONTACT'
];

const REQUIRED_VEHICLE_DOCUMENT_TYPES = [
  'VEHICLE_REGISTRATION',
  'ROADWORTHINESS_CERTIFICATE',
  'INSURANCE_DOCUMENT',
  'VEHICLE_EXTERIOR_PHOTO',
  'VEHICLE_INTERIOR_PHOTO'
];

@Injectable()
export class DriversService {
  constructor(private readonly prisma: PrismaService) {}

  async submitOnboardingProfile(userId: string, payload: SubmitDriverOnboardingDto) {
    const userUpdate: any = {
      firstName: payload.firstName,
      lastName: payload.lastName,
      displayName: `${payload.firstName} ${payload.lastName}`,
      userType: 'DRIVER'
    };

    if (payload.phone) {
      userUpdate.phone = payload.phone;
      userUpdate.isPhoneVerified = true;
    }

    if (payload.email) {
      userUpdate.email = payload.email;
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: userUpdate
    });

    const driverProfile = await this.prisma.driverProfile.upsert({
      where: { userId },
      create: { userId, homeCity: null },
      update: {}
    });

    if (payload.emergencyContactName || payload.emergencyContactPhone || payload.emergencyContactRelation) {
      await this.prisma.driverDocument.create({
        data: {
          userId,
          documentType: 'EMERGENCY_CONTACT',
          status: 'PENDING',
          documentUrl: 'pending://emergency-contact',
          metadata: {
            name: payload.emergencyContactName,
            phone: payload.emergencyContactPhone,
            relation: payload.emergencyContactRelation
          }
        }
      });
    }

    return { user, driverProfile };
  }

  async requestDocumentUpload(userId: string, payload: CreateDriverDocumentDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { driverProfile: true } });
    if (!user || !user.driverProfile) {
      throw new BadRequestException('Driver profile not found. Complete onboarding profile first.');
    }

    const documentId = randomUUID();
    const uploadUrl = this.buildUploadUrl(documentId);
    const documentUrl = `pending://${documentId}`;
    const issuedAt = payload.issuedAt ? new Date(payload.issuedAt) : null;
    const expiresAt = payload.expiresAt ? new Date(payload.expiresAt) : null;

    if (payload.scope === 'VEHICLE') {
      let vehicleId = payload.vehicleId;

      if (!vehicleId) {
        if (!payload.vehicleData) {
          throw new BadRequestException('vehicleData is required when uploading a vehicle document without vehicleId.');
        }

        const vehicle = await this.prisma.vehicle.create({
          data: {
            driverProfileId: user.driverProfile.id,
            registrationNumber: payload.vehicleData.registrationNumber,
            make: payload.vehicleData.make,
            model: payload.vehicleData.model,
            year: payload.vehicleData.year,
            color: payload.vehicleData.color,
            capacity: payload.vehicleData.capacity,
            vehicleType: payload.vehicleData.vehicleType
          }
        });

        await this.prisma.driverProfile.update({
          where: { id: user.driverProfile.id },
          data: { activeVehicleId: vehicle.id }
        });
        vehicleId = vehicle.id;
      }

      const vehicleDocument = await this.prisma.vehicleDocument.create({
        data: {
          vehicleId,
          documentType: payload.documentType,
          status: 'PENDING',
          documentUrl,
          issuedAt,
          expiresAt,
          metadata: (payload.metadata ?? {}) as any
        }
      });

      return { documentId: vehicleDocument.id, uploadUrl, status: vehicleDocument.status, documentType: vehicleDocument.documentType, expiresAt };
    }

    const driverDocument = await this.prisma.driverDocument.create({
      data: {
        userId,
        documentType: payload.documentType,
        status: 'PENDING',
        documentUrl,
        issuedAt,
        expiresAt,
        metadata: (payload.metadata ?? {}) as any
      }
    });

    return { documentId: driverDocument.id, uploadUrl, status: driverDocument.status, documentType: driverDocument.documentType, expiresAt };
  }

  async getSignedUploadUrl(userId: string, documentId: string) {
    const driverDocument = await this.prisma.driverDocument.findUnique({ where: { id: documentId } });
    if (driverDocument) {
      if (driverDocument.userId !== userId) {
        throw new ForbiddenException('Access denied.');
      }
      return { uploadUrl: this.buildUploadUrl(documentId) };
    }

    const vehicleDocument = await this.prisma.vehicleDocument.findUnique({ where: { id: documentId }, include: { vehicle: true } });
    if (!vehicleDocument) {
      throw new NotFoundException('Document not found.');
    }

    const driverProfile = await this.prisma.driverProfile.findUnique({ where: { id: vehicleDocument.vehicle.driverProfileId } });
    if (!driverProfile || driverProfile.userId !== userId) {
      throw new ForbiddenException('Access denied.');
    }

    return { uploadUrl: this.buildUploadUrl(documentId) };
  }

  async canActivateOnline(userId: string) {
    const profile = await this.prisma.driverProfile.findUnique({
      where: { userId },
      include: {
        driverDocuments: true,
        activeVehicle: { include: { documents: true } }
      }
    });

    if (!profile || !profile.activeVehicleId || !profile.activeVehicle) {
      return false;
    }

    const now = new Date();

    const hasApprovedDriverDocs = REQUIRED_DRIVER_DOCUMENT_TYPES.every((type) =>
      profile.driverDocuments.some((doc) =>
        doc.documentType === type &&
        doc.status === 'APPROVED' &&
        (!doc.expiresAt || doc.expiresAt > now)
      )
    );

    // Vehicle must be active and have all approved documents that are not expired
    if (!profile.activeVehicle || profile.activeVehicle.status !== 'ACTIVE') return false;

    const hasApprovedVehicleDocs = !!profile.activeVehicle && REQUIRED_VEHICLE_DOCUMENT_TYPES.every((type) =>
      profile.activeVehicle!.documents.some((doc: { documentType: string; status: string; expiresAt: Date | null }) =>
        doc.documentType === type &&
        doc.status === 'APPROVED' &&
        (!doc.expiresAt || doc.expiresAt > now)
      )
    );

    return hasApprovedDriverDocs && hasApprovedVehicleDocs;
  }

  async activateDriverOnline(userId: string) {
    const canActivate = await this.canActivateOnline(userId);
    if (!canActivate) {
      throw new ForbiddenException('Driver must have all onboarding documents approved before going online.');
    }

    const profile = await this.prisma.driverProfile.update({
      where: { userId },
      data: { isOnline: true, currentStatus: 'AVAILABLE' }
    });

    return { success: true, driverProfile: profile };
  }

  private buildUploadUrl(documentId: string) {
    return `https://storage.rydulux.local/upload/${documentId}?signature=placeholder`;
  }
}
