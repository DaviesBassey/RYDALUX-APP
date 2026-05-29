import { Test, TestingModule } from '@nestjs/testing';
import { SafetyService } from '../src/safety/safety.service';
import { PrismaService } from '../src/prisma/prisma.service';

describe('SafetyService', () => {
  let service: SafetyService;
  let prisma: PrismaService;

  const mockUserId = 'user-123';
  const mockAdminId = 'admin-123';
  const mockTripId = 'trip-123';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SafetyService,
        {
          provide: PrismaService,
          useValue: {
            sosEvent: {
              create: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
            },
            incidentReport: {
              create: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
            },
            trustedContact: {
              create: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
              delete: jest.fn(),
            },
            shareTripLink: {
              create: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            safetyFlag: {
              create: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
            },
            safetyCheckIn: {
              create: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            trip: {
              findUnique: jest.fn(),
            },
            user: {
              findUnique: jest.fn(),
            },
            auditLog: {
              create: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<SafetyService>(SafetyService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('SOS Operations', () => {
    it('should create SOS event', async () => {
      const dto = { type: 'PANIC', latitude: 6.5, longitude: 3.3 };
      const expected = { id: 'sos-1', userId: mockUserId, status: 'OPEN', ...dto };

      (prisma.sosEvent.create as jest.Mock).mockResolvedValue(expected);

      const result = await service.createSosEvent(mockUserId, dto);

      expect(result).toEqual(expected);
      expect(prisma.sosEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ userId: mockUserId, status: 'OPEN' }),
      });
    });

    it('should acknowledge SOS event', async () => {
      const sosEventId = 'sos-1';
      (prisma.sosEvent.findUnique as jest.Mock).mockResolvedValue({
        id: sosEventId,
        status: 'OPEN',
      });
      (prisma.sosEvent.update as jest.Mock).mockResolvedValue({
        id: sosEventId,
        status: 'ACKNOWLEDGED',
      });

      const result = await service.acknowledgeSosEvent(mockAdminId, sosEventId);

      expect(result.status).toBe('ACKNOWLEDGED');
      expect(prisma.auditLog.create).toHaveBeenCalled();
    });

    it('should escalate SOS event', async () => {
      const sosEventId = 'sos-1';
      (prisma.sosEvent.findUnique as jest.Mock).mockResolvedValue({
        id: sosEventId,
        status: 'ACKNOWLEDGED',
      });
      (prisma.sosEvent.update as jest.Mock).mockResolvedValue({
        id: sosEventId,
        status: 'ESCALATED',
      });

      const result = await service.escalateSosEvent(mockAdminId, sosEventId, 'Medical emergency');

      expect(result.status).toBe('ESCALATED');
    });

    it('should resolve SOS event', async () => {
      const sosEventId = 'sos-1';
      (prisma.sosEvent.findUnique as jest.Mock).mockResolvedValue({
        id: sosEventId,
        status: 'ESCALATED',
      });
      (prisma.sosEvent.update as jest.Mock).mockResolvedValue({
        id: sosEventId,
        status: 'RESOLVED',
        resolvedAt: expect.any(Date),
      });

      const result = await service.resolveSosEvent(mockAdminId, sosEventId, 'Resolved safely');

      expect(result.status).toBe('RESOLVED');
      expect(result.resolvedAt).toBeDefined();
    });

    it('should list SOS events', async () => {
      const events = [
        { id: 'sos-1', status: 'OPEN' },
        { id: 'sos-2', status: 'ACKNOWLEDGED' },
      ];
      (prisma.sosEvent.findMany as jest.Mock).mockResolvedValue(events);

      const result = await service.listSosEvents({ status: 'OPEN' });

      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('Incident Report Operations', () => {
    it('should create incident report for own trip', async () => {
      const dto = {
        tripId: mockTripId,
        type: 'HARASSMENT',
        description: 'Inappropriate behavior',
        severity: 'HIGH',
      };

      (prisma.trip.findUnique as jest.Mock).mockResolvedValue({
        id: mockTripId,
        riderProfile: { userId: mockUserId },
        driverProfile: null,
      });

      (prisma.incidentReport.create as jest.Mock).mockResolvedValue({
        id: 'incident-1',
        ...dto,
        reportedById: mockUserId,
        status: 'OPEN',
      });

      const result = await service.createIncidentReport(mockUserId, dto);

      expect(result).toBeDefined();
      expect(prisma.auditLog.create).toHaveBeenCalled();
    });

    it('should prevent incident report for unrelated trip', async () => {
      const dto = {
        tripId: mockTripId,
        type: 'HARASSMENT',
        description: 'Test',
      };

      (prisma.trip.findUnique as jest.Mock).mockResolvedValue({
        id: mockTripId,
        riderProfile: { userId: 'other-user' },
        driverProfile: null,
      });

      await expect(service.createIncidentReport(mockUserId, dto)).rejects.toThrow();
    });

    it('should update incident status', async () => {
      const reportId = 'incident-1';
      (prisma.incidentReport.findUnique as jest.Mock).mockResolvedValue({
        id: reportId,
        status: 'OPEN',
      });

      (prisma.incidentReport.update as jest.Mock).mockResolvedValue({
        id: reportId,
        status: 'RESOLVED',
        resolvedAt: expect.any(Date),
      });

      const result = await service.updateIncidentStatus(mockAdminId, reportId, 'RESOLVED', 'Case closed');

      expect(result.status).toBe('RESOLVED');
      expect(prisma.auditLog.create).toHaveBeenCalled();
    });

    it('should list incident reports', async () => {
      const reports = [{ id: 'incident-1', status: 'OPEN' }];
      (prisma.incidentReport.findMany as jest.Mock).mockResolvedValue(reports);

      const result = await service.listIncidentReports({ status: 'OPEN' });

      expect(result).toBeDefined();
    });
  });

  describe('Trusted Contact Operations', () => {
    it('should add trusted contact', async () => {
      const dto = { name: 'John Doe', phone: '+2341234567890', relationship: 'Friend' };

      (prisma.trustedContact.create as jest.Mock).mockResolvedValue({
        id: 'contact-1',
        userId: mockUserId,
        ...dto,
      });

      const result = await service.addTrustedContact(mockUserId, dto);

      expect(result.name).toBe(dto.name);
      expect(result.phone).toBe(dto.phone);
    });

    it('should list trusted contacts', async () => {
      const contacts = [
        { id: 'contact-1', name: 'John', phone: '+234123' },
      ];
      (prisma.trustedContact.findMany as jest.Mock).mockResolvedValue(contacts);

      const result = await service.listTrustedContacts(mockUserId);

      expect(result.length).toBeGreaterThan(0);
    });

    it('should remove trusted contact', async () => {
      const contactId = 'contact-1';
      (prisma.trustedContact.findUnique as jest.Mock).mockResolvedValue({
        id: contactId,
        userId: mockUserId,
      });

      (prisma.trustedContact.delete as jest.Mock).mockResolvedValue({
        id: contactId,
      });

      await service.removeTrustedContact(mockUserId, contactId);

      expect(prisma.trustedContact.delete).toHaveBeenCalledWith({
        where: { id: contactId },
      });
    });

    it('should prevent removing others contact', async () => {
      const contactId = 'contact-1';
      (prisma.trustedContact.findUnique as jest.Mock).mockResolvedValue({
        id: contactId,
        userId: 'other-user',
      });

      await expect(service.removeTrustedContact(mockUserId, contactId)).rejects.toThrow();
    });
  });

  describe('Share Trip Link Operations', () => {
    it('should generate share link for own trip', async () => {
      const dto = { tripId: mockTripId };

      (prisma.trip.findUnique as jest.Mock).mockResolvedValue({
        id: mockTripId,
        riderProfile: { userId: mockUserId },
      });

      (prisma.shareTripLink.create as jest.Mock).mockResolvedValue({
        id: 'link-1',
        shareToken: 'token-123',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });

      const result = await service.generateShareLink(mockUserId, dto);

      expect(result.shareToken).toBeDefined();
      expect(result.expiresAt).toBeDefined();
    });

    it('should prevent generating share link for unrelated trip', async () => {
      const dto = { tripId: mockTripId };

      (prisma.trip.findUnique as jest.Mock).mockResolvedValue({
        id: mockTripId,
        riderProfile: { userId: 'other-user' },
      });

      await expect(service.generateShareLink(mockUserId, dto)).rejects.toThrow();
    });

    it('should retrieve shared trip via valid token', async () => {
      const token = 'valid-token';
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      (prisma.shareTripLink.findUnique as jest.Mock).mockResolvedValue({
        id: 'link-1',
        shareToken: token,
        expiresAt,
        isExpired: false,
        trip: {
          id: mockTripId,
          status: 'IN_PROGRESS',
          dropoffAddress: '123 Main St',
          driverProfile: {
            currentLatitude: 6.5,
            currentLongitude: 3.3,
            user: { firstName: 'John', lastName: 'Doe' },
          },
        },
      });

      const result = await service.getSharedTrip(token);

      expect(result.trip).toBeDefined();
      expect(result.trip.driverName).toContain('...');
    });

    it('should reject expired share link', async () => {
      const token = 'expired-token';

      (prisma.shareTripLink.findUnique as jest.Mock).mockResolvedValue({
        id: 'link-1',
        shareToken: token,
        isExpired: true,
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(service.getSharedTrip(token)).rejects.toThrow();
    });
  });

  describe('Safety Flag Operations', () => {
    it('should flag user', async () => {
      const dto = {
        userId: 'user-to-flag',
        flagType: 'REPEAT_INCIDENT',
        reason: 'Multiple complaints',
        severity: 'HIGH',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: dto.userId,
      });

      (prisma.safetyFlag.create as jest.Mock).mockResolvedValue({
        id: 'flag-1',
        ...dto,
        isActive: true,
      });

      const result = await service.flagUser(mockAdminId, dto);

      expect(result.userId).toBe(dto.userId);
      expect(result.isActive).toBe(true);
      expect(prisma.auditLog.create).toHaveBeenCalled();
    });

    it('should get user risk level based on flags', async () => {
      (prisma.safetyFlag.findMany as jest.Mock).mockResolvedValue([
        { id: 'flag-1', flagType: 'REPEAT_INCIDENT' },
        { id: 'flag-2', flagType: 'HIGH_RISK_BEHAVIOR' },
      ]);

      const result = await service.checkUserRiskLevel(mockUserId);

      expect(result).toBe('HIGH');
    });

    it('should return LOW risk for user with no flags', async () => {
      (prisma.safetyFlag.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.checkUserRiskLevel(mockUserId);

      expect(result).toBe('LOW');
    });

    it('should unflag user', async () => {
      const flagId = 'flag-1';

      (prisma.safetyFlag.findUnique as jest.Mock).mockResolvedValue({
        id: flagId,
        userId: mockUserId,
        isActive: true,
      });

      (prisma.safetyFlag.update as jest.Mock).mockResolvedValue({
        id: flagId,
        isActive: false,
        resolvedAt: expect.any(Date),
      });

      const result = await service.unflagUser(mockAdminId, flagId);

      expect(result.isActive).toBe(false);
    });
  });

  describe('Safety Check-in Operations', () => {
    it('should create safety check-in', async () => {
      (prisma.trip.findUnique as jest.Mock).mockResolvedValue({
        id: mockTripId,
        riderProfile: { userId: mockUserId },
      });

      (prisma.safetyCheckIn.create as jest.Mock).mockResolvedValue({
        id: 'check-in-1',
        tripId: mockTripId,
        userId: mockUserId,
        type: 'LONG_STOP',
        latitude: 6.5,
        longitude: 3.3,
      });

      const result = await service.createSafetyCheckIn(mockTripId, mockUserId, 'LONG_STOP', 6.5, 3.3);

      expect(result.type).toBe('LONG_STOP');
    });

    it('should acknowledge check-in', async () => {
      const checkInId = 'check-in-1';

      (prisma.safetyCheckIn.findUnique as jest.Mock).mockResolvedValue({
        id: checkInId,
      });

      (prisma.safetyCheckIn.update as jest.Mock).mockResolvedValue({
        id: checkInId,
        acknowledgedAt: expect.any(Date),
        acknowledgedByUserId: mockAdminId,
      });

      const result = await service.acknowledgeCheckIn(mockAdminId, checkInId);

      expect(result.acknowledgedByUserId).toBe(mockAdminId);
    });
  });

  describe('Admin Dashboard', () => {
    it('should get dashboard summary', async () => {
      (prisma.sosEvent.count as jest.Mock).mockResolvedValue(5);
      (prisma.incidentReport.count as jest.Mock).mockResolvedValue(3);
      (prisma.safetyFlag.count as jest.Mock).mockResolvedValue(2);

      const result = await service.getDashboardSummary();

      expect(result.openSosEvents).toBe(5);
      expect(result.pendingIncidents).toBe(3);
      expect(result.activelyFlaggedUsers).toBe(2);
    });

    it('should get recent safety events', async () => {
      (prisma.sosEvent.findMany as jest.Mock).mockResolvedValue([
        { id: 'sos-1', type: 'PANIC' },
      ]);

      (prisma.incidentReport.findMany as jest.Mock).mockResolvedValue([
        { id: 'incident-1', type: 'HARASSMENT' },
      ]);

      const result = await service.getRecentSafetyEvents();

      expect(result.sosEvents).toBeDefined();
      expect(result.incidents).toBeDefined();
    });
  });
});
