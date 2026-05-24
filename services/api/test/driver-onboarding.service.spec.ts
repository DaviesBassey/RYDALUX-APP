import { DriversService } from '../src/drivers/drivers.service';

describe('DriversService', () => {
  let driversService: DriversService;
  const mockPrisma: any = {
    driverProfile: {
      findUnique: jest.fn(),
      update: jest.fn()
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    driversService = new DriversService(mockPrisma as any);
  });

  it('should prevent a driver from going online when onboarding documents are incomplete', async () => {
    mockPrisma.driverProfile.findUnique.mockResolvedValue({
      userId: 'driver-1',
      activeVehicleId: 'vehicle-1',
      driverDocuments: [
        { documentType: 'PROFILE_PHOTO', status: 'APPROVED', expiresAt: new Date(Date.now() + 100000) }
      ],
      activeVehicle: {
        id: 'vehicle-1',
        documents: [
          { documentType: 'VEHICLE_REGISTRATION', status: 'APPROVED', expiresAt: new Date(Date.now() + 100000) }
        ]
      }
    });

    await expect(driversService.activateDriverOnline('driver-1')).rejects.toThrow(
      'Driver must have all onboarding documents approved before going online.'
    );
  });

  it('should allow a driver to go online when all required onboarding documents are approved', async () => {
    const now = new Date();
    const futureDate = new Date(now.getTime() + 100000);

    mockPrisma.driverProfile.findUnique.mockResolvedValue({
      userId: 'driver-2',
      activeVehicleId: 'vehicle-2',
      driverDocuments: [
        { documentType: 'PROFILE_PHOTO', status: 'APPROVED', expiresAt: futureDate },
        { documentType: 'GOVERNMENT_ID', status: 'APPROVED', expiresAt: futureDate },
        { documentType: 'NIN', status: 'APPROVED', expiresAt: futureDate },
        { documentType: 'DRIVER_LICENSE', status: 'APPROVED', expiresAt: futureDate },
        { documentType: 'PROOF_OF_ADDRESS', status: 'APPROVED', expiresAt: futureDate },
        { documentType: 'EMERGENCY_CONTACT', status: 'APPROVED', expiresAt: futureDate }
      ],
      activeVehicle: {
        id: 'vehicle-2',
        status: 'ACTIVE',
        documents: [
          { documentType: 'VEHICLE_REGISTRATION', status: 'APPROVED', expiresAt: futureDate },
          { documentType: 'ROADWORTHINESS_CERTIFICATE', status: 'APPROVED', expiresAt: futureDate },
          { documentType: 'INSURANCE_DOCUMENT', status: 'APPROVED', expiresAt: futureDate },
          { documentType: 'VEHICLE_EXTERIOR_PHOTO', status: 'APPROVED', expiresAt: futureDate },
          { documentType: 'VEHICLE_INTERIOR_PHOTO', status: 'APPROVED', expiresAt: futureDate }
        ]
      }
    });

    mockPrisma.driverProfile.update.mockResolvedValue({ id: 'profile-2', isOnline: true, currentStatus: 'AVAILABLE' });

    const result = await driversService.activateDriverOnline('driver-2');

    expect(result).toEqual({ success: true, driverProfile: { id: 'profile-2', isOnline: true, currentStatus: 'AVAILABLE' } });
    expect(mockPrisma.driverProfile.update).toHaveBeenCalledWith({
      where: { userId: 'driver-2' },
      data: { isOnline: true, currentStatus: 'AVAILABLE' }
    });
  });
});
