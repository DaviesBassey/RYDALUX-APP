import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const DRIVER_DOC_TYPES = [
  'PROFILE_PHOTO',
  'GOVERNMENT_ID',
  'NIN',
  'DRIVER_LICENSE',
  'PROOF_OF_ADDRESS',
  'EMERGENCY_CONTACT',
];

const VEHICLE_DOC_TYPES = [
  'VEHICLE_REGISTRATION',
  'ROADWORTHINESS_CERTIFICATE',
  'INSURANCE_DOCUMENT',
  'VEHICLE_EXTERIOR_PHOTO',
  'VEHICLE_INTERIOR_PHOTO',
];

@Injectable()
export class DevService {
  constructor(private readonly prisma: PrismaService) {}

  async approveDriver(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found.');

    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

    let driverProfile = await this.prisma.driverProfile.findUnique({ where: { userId } });
    if (!driverProfile) {
      driverProfile = await this.prisma.driverProfile.create({
        data: { userId, homeCity: null },
      });
    }

    for (const documentType of DRIVER_DOC_TYPES) {
      const existing = await this.prisma.driverDocument.findFirst({
        where: { userId, documentType },
      });
      if (!existing) {
        await this.prisma.driverDocument.create({
          data: {
            userId,
            documentType,
            status: 'APPROVED',
            documentUrl: `dev://approved/${documentType.toLowerCase()}`,
            expiresAt,
            metadata: {},
          },
        });
      } else {
        await this.prisma.driverDocument.update({
          where: { id: existing.id },
          data: { status: 'APPROVED', expiresAt },
        });
      }
    }

    let vehicle = driverProfile.activeVehicleId
      ? await this.prisma.vehicle.findUnique({ where: { id: driverProfile.activeVehicleId } })
      : null;

    if (!vehicle) {
      vehicle = await this.prisma.vehicle.create({
        data: {
          driverProfileId: driverProfile.id,
          registrationNumber: `DEV-${userId.slice(0, 8).toUpperCase()}`,
          make: 'Dev',
          model: 'Approved',
          year: 2024,
          color: 'White',
          capacity: 4,
          vehicleType: 'SEDAN',
          status: 'ACTIVE',
        },
      });
      await this.prisma.driverProfile.update({
        where: { id: driverProfile.id },
        data: { activeVehicleId: vehicle.id },
      });
    } else if (vehicle.status !== 'ACTIVE') {
      await this.prisma.vehicle.update({
        where: { id: vehicle.id },
        data: { status: 'ACTIVE' },
      });
    }

    for (const documentType of VEHICLE_DOC_TYPES) {
      const existing = await this.prisma.vehicleDocument.findFirst({
        where: { vehicleId: vehicle.id, documentType },
      });
      if (!existing) {
        await this.prisma.vehicleDocument.create({
          data: {
            vehicleId: vehicle.id,
            documentType,
            status: 'APPROVED',
            documentUrl: `dev://approved/${documentType.toLowerCase()}`,
            expiresAt,
            metadata: {},
          },
        });
      } else {
        await this.prisma.vehicleDocument.update({
          where: { id: existing.id },
          data: { status: 'APPROVED', expiresAt },
        });
      }
    }

    return { success: true, userId, message: 'Driver fully approved for development.' };
  }
}
