import { VehiclesService } from '../src/vehicles/vehicles.service';

describe('VehiclesService', () => {
  let vehiclesService: VehiclesService;
  const mockPrisma: any = {
    driverProfile: { findUnique: jest.fn(), update: jest.fn() },
    vehicle: { create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
    vehicleDocument: { create: jest.fn() },
    auditLog: { create: jest.fn() }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    vehiclesService = new VehiclesService(mockPrisma as any);
  });

  it('should create a new inactive vehicle and deactivate any other active vehicle', async () => {
    mockPrisma.driverProfile.findUnique.mockResolvedValue({ id: 'profile-1', userId: 'user-1' });
    mockPrisma.vehicle.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.vehicle.create.mockResolvedValue({ id: 'veh-1', status: 'INACTIVE', make: 'Toyota', model: 'Corolla' });
    mockPrisma.driverProfile.update.mockResolvedValue({ id: 'profile-1', activeVehicleId: 'veh-1' });
    mockPrisma.auditLog.create.mockResolvedValue({});

    const result = await vehiclesService.createVehicle('user-1', {
      registrationNumber: 'ABC123',
      make: 'Toyota',
      model: 'Corolla',
      year: 2020,
      color: 'White',
      capacity: 4,
      vehicleType: 'SEDAN'
    } as any);

    expect(mockPrisma.vehicle.updateMany).toHaveBeenCalledWith({ where: { driverProfileId: 'profile-1', status: 'ACTIVE' }, data: { status: 'INACTIVE' } });
    expect(mockPrisma.vehicle.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'INACTIVE' }) }));
    expect(result.status).toEqual('INACTIVE');
  });

  it('should not activate a vehicle that has not been approved', async () => {
    mockPrisma.vehicle.findUnique.mockResolvedValue({ id: 'veh-2', driverProfileId: 'profile-1', status: 'INACTIVE', approvedAt: null });
    mockPrisma.driverProfile.findUnique.mockResolvedValue({ id: 'profile-1', userId: 'user-1' });

    await expect(vehiclesService.activateVehicle('user-1', 'veh-2')).rejects.toThrow('Vehicle must be approved before it can be activated.');
  });

  it('should activate approved vehicle and deactivate other vehicles', async () => {
    mockPrisma.vehicle.findUnique.mockResolvedValue({ id: 'veh-1', driverProfileId: 'profile-1', status: 'INACTIVE', approvedAt: new Date(), verifiedAt: null });
    mockPrisma.driverProfile.findUnique.mockResolvedValue({ id: 'profile-1', userId: 'user-1' });
    mockPrisma.vehicle.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.vehicle.update.mockResolvedValue({ id: 'veh-1', status: 'ACTIVE' });
    mockPrisma.driverProfile.update.mockResolvedValue({ id: 'profile-1', activeVehicleId: 'veh-1' });

    const result = await vehiclesService.activateVehicle('user-1', 'veh-1');

    expect(mockPrisma.vehicle.update).toHaveBeenCalledWith({ where: { id: 'veh-1' }, data: { status: 'ACTIVE', verifiedAt: expect.any(Date) } });
    expect(result.status).toEqual('ACTIVE');
  });

  it('should request a vehicle document upload and return an upload URL', async () => {
    mockPrisma.vehicle.findUnique.mockResolvedValue({ id: 'veh-3', driverProfile: { userId: 'user-1' } });
    mockPrisma.vehicleDocument.create.mockResolvedValue({ id: 'doc-1', documentType: 'VEHICLE_REGISTRATION', status: 'PENDING', expiresAt: null });
    mockPrisma.auditLog.create.mockResolvedValue({});

    const result = await vehiclesService.requestVehicleDocumentUpload('user-1', 'veh-3', {
      documentType: 'VEHICLE_REGISTRATION',
      issuedAt: '2026-01-01T00:00:00.000Z',
      expiresAt: '2027-01-01T00:00:00.000Z'
    } as any);

    expect(result.uploadUrl).toContain('https://storage.rydulux.local/upload/');
    expect(result.status).toEqual('PENDING');
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: 'VEHICLE_DOCUMENT_UPLOAD_REQUESTED' }) }));
  });

  it('should return verification status including missing required documents', async () => {
    const now = new Date();
    mockPrisma.vehicle.findUnique.mockResolvedValue({
      id: 'veh-4',
      driverProfile: { userId: 'user-1' },
      status: 'INACTIVE',
      approvedAt: null,
      verifiedAt: null,
      documents: [
        { id: 'doc-1', documentType: 'VEHICLE_REGISTRATION', status: 'APPROVED', expiresAt: new Date(now.getTime() + 100000) }
      ]
    });

    const status = await vehiclesService.getVehicleVerificationStatus('user-1', 'veh-4');

    expect(status.isApproved).toBe(false);
    expect(status.missingRequiredDocuments).toContain('ROADWORTHINESS_CERTIFICATE');
    expect(status.canAcceptRides).toBe(false);
  });

  it('should set other vehicles inactive when activating a vehicle', async () => {
    mockPrisma.vehicle.findUnique.mockResolvedValue({ id: 'veh-1', driverProfileId: 'profile-1', status: 'INACTIVE', approvedAt: new Date(), verifiedAt: null });
    mockPrisma.driverProfile.findUnique.mockResolvedValue({ id: 'profile-1', userId: 'user-1' });
    mockPrisma.vehicle.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.vehicle.update.mockResolvedValue({ id: 'veh-1', status: 'ACTIVE' });
    mockPrisma.driverProfile.update.mockResolvedValue({ id: 'profile-1', activeVehicleId: 'veh-1' });

    const result = await vehiclesService.activateVehicle('user-1', 'veh-1');

    expect(mockPrisma.vehicle.updateMany).toHaveBeenCalledWith({ where: { driverProfileId: 'profile-1', id: { not: 'veh-1' } }, data: { status: 'INACTIVE' } });
    expect(mockPrisma.vehicle.update).toHaveBeenCalled();
    expect(mockPrisma.driverProfile.update).toHaveBeenCalled();
    expect(result.status).toEqual('ACTIVE');
  });
});
