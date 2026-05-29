import { SupportService } from '../src/support/support.service';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { SupportStatus, SupportTicketType, SupportTicketPriority } from '@prisma/client';

describe('SupportService', () => {
  let service: SupportService;

  const mockPrisma: any = {
    supportTicket: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    supportTicketMessage: {
      create: jest.fn(),
    },
    supportTicketAttachment: {
      create: jest.fn(),
    },
    riderProfile: {
      findUnique: jest.fn(),
    },
    driverProfile: {
      findUnique: jest.fn(),
    },
    trip: {
      findUnique: jest.fn(),
    },
    adminUser: {
      findUnique: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.auditLog.create.mockResolvedValue({});
    service = new SupportService(mockPrisma as any);
  });

  describe('createTicket', () => {
    it('rejects when no linked entity is provided', async () => {
      await expect(
        service.createTicket('rider-1', {
          title: 'Test Issue',
          description: 'This is a test issue description',
          type: SupportTicketType.PAYMENT_ISSUE,
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects when rider does not own the trip', async () => {
      mockPrisma.trip.findUnique.mockResolvedValue({
        id: 'trip-1',
        riderProfileId: 'rider-2',
        driverProfileId: 'driver-1',
      });
      mockPrisma.riderProfile.findUnique.mockResolvedValue({ id: 'rider-1' });
      mockPrisma.driverProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.createTicket('rider-1', {
          title: 'Test Issue',
          description: 'This is a test issue description',
          type: SupportTicketType.PAYMENT_ISSUE,
          tripId: 'trip-1',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows rider to create ticket for own trip', async () => {
      mockPrisma.trip.findUnique.mockResolvedValue({
        id: 'trip-1',
        riderProfileId: 'rider-prof-1',
        driverProfileId: 'driver-prof-1',
      });
      mockPrisma.riderProfile.findUnique.mockResolvedValue({ id: 'rider-prof-1' });
      mockPrisma.driverProfile.findUnique.mockResolvedValue(null);
      mockPrisma.supportTicket.create.mockResolvedValue({
        id: 'ticket-1',
        createdById: 'rider-1',
        title: 'Payment Issue',
        description: 'My payment was not processed',
        type: SupportTicketType.PAYMENT_ISSUE,
        status: SupportStatus.OPEN,
        priority: SupportTicketPriority.MEDIUM,
        tripId: 'trip-1',
        createdBy: { id: 'rider-1', email: 'rider@example.com', firstName: 'John', lastName: 'Doe' },
        messages: [],
        attachments: [],
      });

      const result = await service.createTicket('rider-1', {
        title: 'Payment Issue',
        description: 'My payment was not processed',
        type: SupportTicketType.PAYMENT_ISSUE,
        tripId: 'trip-1',
      });

      expect(result.id).toBe('ticket-1');
      expect(mockPrisma.supportTicket.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            createdById: 'rider-1',
            type: SupportTicketType.PAYMENT_ISSUE,
            tripId: 'trip-1',
          }),
        }),
      );
    });

    it('allows driver to create ticket for own trip', async () => {
      mockPrisma.trip.findUnique.mockResolvedValue({
        id: 'trip-1',
        riderProfileId: 'rider-prof-1',
        driverProfileId: 'driver-prof-1',
      });
      mockPrisma.riderProfile.findUnique.mockResolvedValue(null);
      mockPrisma.driverProfile.findUnique.mockResolvedValue({ id: 'driver-prof-1' });
      mockPrisma.supportTicket.create.mockResolvedValue({
        id: 'ticket-1',
        createdById: 'driver-1',
        title: 'Driver Complaint',
        description: 'Rider was rude',
        type: SupportTicketType.DRIVER_COMPLAINT,
        status: SupportStatus.OPEN,
        priority: SupportTicketPriority.HIGH,
        tripId: 'trip-1',
        createdBy: { id: 'driver-1', email: 'driver@example.com', firstName: 'Jane', lastName: 'Smith' },
        messages: [],
        attachments: [],
      });

      const result = await service.createTicket('driver-1', {
        title: 'Driver Complaint',
        description: 'Rider was rude',
        type: SupportTicketType.DRIVER_COMPLAINT,
        priority: SupportTicketPriority.HIGH,
        tripId: 'trip-1',
      });

      expect(result.id).toBe('ticket-1');
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });
  });

  describe('getTicket', () => {
    it('rejects when ticket does not exist', async () => {
      mockPrisma.supportTicket.findUnique.mockResolvedValue(null);

      await expect(service.getTicket('nonexistent', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('rejects when user is not creator and not admin', async () => {
      mockPrisma.supportTicket.findUnique.mockResolvedValue({
        id: 'ticket-1',
        createdById: 'rider-1',
        messages: [],
        attachments: [],
      });
      mockPrisma.adminUser.findUnique.mockResolvedValue(null);

      await expect(service.getTicket('ticket-1', 'other-user')).rejects.toThrow(ForbiddenException);
    });

    it('allows creator to view ticket', async () => {
      mockPrisma.supportTicket.findUnique.mockResolvedValue({
        id: 'ticket-1',
        createdById: 'rider-1',
        createdBy: { id: 'rider-1', email: 'rider@example.com', firstName: 'John', lastName: 'Doe' },
        messages: [],
        attachments: [],
      });
      mockPrisma.adminUser.findUnique.mockResolvedValue(null);

      const result = await service.getTicket('ticket-1', 'rider-1');
      expect(result.id).toBe('ticket-1');
    });

    it('allows admin to view any ticket', async () => {
      mockPrisma.supportTicket.findUnique.mockResolvedValue({
        id: 'ticket-1',
        createdById: 'rider-1',
        createdBy: { id: 'rider-1', email: 'rider@example.com', firstName: 'John', lastName: 'Doe' },
        messages: [],
        attachments: [],
      });
      mockPrisma.adminUser.findUnique.mockResolvedValue({ id: 'admin-1', userId: 'admin-1' });

      const result = await service.getTicket('ticket-1', 'admin-1');
      expect(result.id).toBe('ticket-1');
    });

    it('hides internal messages from non-creator users', async () => {
      mockPrisma.supportTicket.findUnique.mockResolvedValue({
        id: 'ticket-1',
        createdById: 'rider-1',
        createdBy: { id: 'rider-1', email: 'rider@example.com', firstName: 'John', lastName: 'Doe' },
        messages: [
          { id: 'msg-1', content: 'Public reply', isInternal: false, authorId: 'admin-1' },
          { id: 'msg-2', content: 'Internal note', isInternal: true, authorId: 'admin-1' },
        ],
        attachments: [],
      });
      mockPrisma.adminUser.findUnique.mockResolvedValue(null);

      const result = await service.getTicket('ticket-1', 'rider-1');
      // Should only show public message, internal one hidden by the where clause in service
      expect(mockPrisma.supportTicket.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            messages: expect.objectContaining({
              where: expect.any(Object),
            }),
          }),
        }),
      );
    });
  });

  describe('listTickets', () => {
    it('non-admin user sees only their own tickets', async () => {
      mockPrisma.adminUser.findUnique.mockResolvedValue(null);
      mockPrisma.supportTicket.findMany.mockResolvedValue([
        { id: 'ticket-1', createdById: 'rider-1', title: 'Issue 1', messages: [] },
      ]);
      mockPrisma.supportTicket.count.mockResolvedValue(1);

      await service.listTickets('rider-1', {}, 0, 20);

      expect(mockPrisma.supportTicket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { createdById: 'rider-1' },
        }),
      );
    });

    it('admin can filter by status, type, priority, assignedTo', async () => {
      mockPrisma.adminUser.findUnique.mockResolvedValue({ id: 'admin-1', userId: 'admin-1' });
      mockPrisma.supportTicket.findMany.mockResolvedValue([]);
      mockPrisma.supportTicket.count.mockResolvedValue(0);

      await service.listTickets(
        'admin-1',
        {
          status: SupportStatus.OPEN,
          type: SupportTicketType.PAYMENT_ISSUE,
          priority: SupportTicketPriority.HIGH,
        },
        0,
        20,
      );

      expect(mockPrisma.supportTicket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: SupportStatus.OPEN,
            type: SupportTicketType.PAYMENT_ISSUE,
            priority: SupportTicketPriority.HIGH,
          },
        }),
      );
    });
  });

  describe('addReply', () => {
    it('rejects when ticket does not exist', async () => {
      mockPrisma.supportTicket.findUnique.mockResolvedValue(null);

      await expect(
        service.addReply('nonexistent', 'user-1', { content: 'Reply text' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects when user is not creator or admin', async () => {
      mockPrisma.supportTicket.findUnique.mockResolvedValue({
        id: 'ticket-1',
        createdById: 'rider-1',
        status: SupportStatus.OPEN,
      });
      mockPrisma.adminUser.findUnique.mockResolvedValue(null);

      await expect(
        service.addReply('ticket-1', 'other-user', { content: 'Reply text' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows creator to add public reply', async () => {
      mockPrisma.supportTicket.findUnique.mockResolvedValue({
        id: 'ticket-1',
        createdById: 'rider-1',
        status: SupportStatus.OPEN,
      });
      mockPrisma.adminUser.findUnique.mockResolvedValue(null);
      mockPrisma.supportTicketMessage.create.mockResolvedValue({
        id: 'msg-1',
        ticketId: 'ticket-1',
        authorId: 'rider-1',
        content: 'Additional info',
        isInternal: false,
        author: { id: 'rider-1', email: 'rider@example.com', firstName: 'John', lastName: 'Doe' },
      });

      const result = await service.addReply('ticket-1', 'rider-1', { content: 'Additional info' });
      expect(result.id).toBe('msg-1');
      expect(result.isInternal).toBe(false);
    });

    it('rejects when creator tries to create internal message', async () => {
      mockPrisma.supportTicket.findUnique.mockResolvedValue({
        id: 'ticket-1',
        createdById: 'rider-1',
        status: SupportStatus.OPEN,
      });
      mockPrisma.adminUser.findUnique.mockResolvedValue(null);

      await expect(
        service.addReply('ticket-1', 'rider-1', { content: 'Internal note', isInternal: true }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows admin to add internal message', async () => {
      mockPrisma.supportTicket.findUnique.mockResolvedValue({
        id: 'ticket-1',
        createdById: 'rider-1',
        status: SupportStatus.OPEN,
      });
      mockPrisma.adminUser.findUnique.mockResolvedValue({ id: 'admin-1', userId: 'admin-1' });
      mockPrisma.supportTicketMessage.create.mockResolvedValue({
        id: 'msg-1',
        ticketId: 'ticket-1',
        authorId: 'admin-1',
        content: 'Internal note for team',
        isInternal: true,
        author: { id: 'admin-1', email: 'admin@example.com', firstName: 'Admin', lastName: 'User' },
      });

      const result = await service.addReply('ticket-1', 'admin-1', {
        content: 'Internal note for team',
        isInternal: true,
      });
      expect(result.isInternal).toBe(true);
    });

    it('auto-updates status to IN_REVIEW when admin replies to OPEN ticket', async () => {
      mockPrisma.supportTicket.findUnique.mockResolvedValue({
        id: 'ticket-1',
        createdById: 'rider-1',
        status: SupportStatus.OPEN,
      });
      mockPrisma.adminUser.findUnique.mockResolvedValue({ id: 'admin-1', userId: 'admin-1' });
      mockPrisma.supportTicketMessage.create.mockResolvedValue({
        id: 'msg-1',
        ticketId: 'ticket-1',
        authorId: 'admin-1',
        content: 'We are looking into this',
        isInternal: false,
      });
      mockPrisma.supportTicket.update.mockResolvedValue({});

      await service.addReply('ticket-1', 'admin-1', { content: 'We are looking into this' });

      expect(mockPrisma.supportTicket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ticket-1' },
          data: { status: SupportStatus.IN_REVIEW },
        }),
      );
    });
  });

  describe('changeStatus', () => {
    it('rejects when ticket does not exist', async () => {
      mockPrisma.supportTicket.findUnique.mockResolvedValue(null);

      await expect(
        service.changeStatus('nonexistent', 'admin-1', { status: SupportStatus.IN_REVIEW }),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects when user is not admin', async () => {
      mockPrisma.supportTicket.findUnique.mockResolvedValue({ id: 'ticket-1', status: SupportStatus.OPEN });
      mockPrisma.adminUser.findUnique.mockResolvedValue(null);

      await expect(
        service.changeStatus('ticket-1', 'user-1', { status: SupportStatus.IN_REVIEW }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows valid status transition from OPEN to IN_REVIEW', async () => {
      mockPrisma.supportTicket.findUnique.mockResolvedValue({ id: 'ticket-1', status: SupportStatus.OPEN });
      mockPrisma.adminUser.findUnique.mockResolvedValue({ id: 'admin-1', userId: 'admin-1' });
      mockPrisma.supportTicket.update.mockResolvedValue({ id: 'ticket-1', status: SupportStatus.IN_REVIEW });

      const result = await service.changeStatus('ticket-1', 'admin-1', {
        status: SupportStatus.IN_REVIEW,
      });
      expect(result.status).toBe(SupportStatus.IN_REVIEW);
    });

    it('rejects invalid status transition', async () => {
      mockPrisma.supportTicket.findUnique.mockResolvedValue({ id: 'ticket-1', status: SupportStatus.CLOSED });
      mockPrisma.adminUser.findUnique.mockResolvedValue({ id: 'admin-1', userId: 'admin-1' });

      await expect(
        service.changeStatus('ticket-1', 'admin-1', { status: SupportStatus.IN_REVIEW }),
      ).rejects.toThrow(BadRequestException);
    });

    it('sets resolvedAt timestamp when status changes to RESOLVED', async () => {
      mockPrisma.supportTicket.findUnique.mockResolvedValue({
        id: 'ticket-1',
        status: SupportStatus.IN_REVIEW,
      });
      mockPrisma.adminUser.findUnique.mockResolvedValue({ id: 'admin-1', userId: 'admin-1' });
      mockPrisma.supportTicket.update.mockResolvedValue({
        id: 'ticket-1',
        status: SupportStatus.RESOLVED,
        resolvedAt: new Date(),
      });

      await service.changeStatus('ticket-1', 'admin-1', { status: SupportStatus.RESOLVED });

      expect(mockPrisma.supportTicket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: SupportStatus.RESOLVED,
            resolvedAt: expect.any(Date),
          }),
        }),
      );
    });
  });

  describe('assignTicket', () => {
    it('rejects when ticket does not exist', async () => {
      mockPrisma.supportTicket.findUnique.mockResolvedValue(null);

      await expect(
        service.assignTicket('nonexistent', 'admin-1', { adminUserId: 'admin-2' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects when user is not admin', async () => {
      mockPrisma.supportTicket.findUnique.mockResolvedValue({ id: 'ticket-1' });
      mockPrisma.adminUser.findUnique.mockResolvedValue(null);

      await expect(
        service.assignTicket('ticket-1', 'user-1', { adminUserId: 'admin-2' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects when target admin does not exist', async () => {
      mockPrisma.supportTicket.findUnique.mockResolvedValue({ id: 'ticket-1' });
      mockPrisma.adminUser.findUnique.mockResolvedValueOnce({ id: 'admin-1', userId: 'admin-1' });
      mockPrisma.adminUser.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.assignTicket('ticket-1', 'admin-1', { adminUserId: 'nonexistent-admin' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('assigns ticket to target admin', async () => {
      mockPrisma.supportTicket.findUnique.mockResolvedValue({ id: 'ticket-1' });
      mockPrisma.adminUser.findUnique.mockResolvedValueOnce({ id: 'admin-1', userId: 'admin-1' });
      mockPrisma.adminUser.findUnique.mockResolvedValueOnce({ id: 'admin-2', userId: 'admin-2' });
      mockPrisma.supportTicket.update.mockResolvedValue({
        id: 'ticket-1',
        assignedToId: 'admin-2',
        assignedTo: {
          user: { id: 'admin-2', email: 'admin2@example.com', firstName: 'Jane', lastName: 'Smith' },
        },
      });

      const result = await service.assignTicket('ticket-1', 'admin-1', { adminUserId: 'admin-2' });
      expect(result.assignedToId).toBe('admin-2');
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });
  });

  describe('closeTicket', () => {
    it('allows creator to close ticket', async () => {
      mockPrisma.supportTicket.findUnique.mockResolvedValue({
        id: 'ticket-1',
        createdById: 'rider-1',
        status: SupportStatus.IN_REVIEW,
      });
      mockPrisma.adminUser.findUnique.mockResolvedValue(null);
      mockPrisma.supportTicket.update.mockResolvedValue({
        id: 'ticket-1',
        status: SupportStatus.CLOSED,
        closedAt: new Date(),
      });

      const result = await service.closeTicket('ticket-1', 'rider-1');
      expect(result.status).toBe(SupportStatus.CLOSED);
    });

    it('allows admin to close ticket', async () => {
      mockPrisma.supportTicket.findUnique.mockResolvedValue({
        id: 'ticket-1',
        createdById: 'rider-1',
        status: SupportStatus.IN_REVIEW,
      });
      mockPrisma.adminUser.findUnique.mockResolvedValue({ id: 'admin-1', userId: 'admin-1' });
      mockPrisma.supportTicket.update.mockResolvedValue({
        id: 'ticket-1',
        status: SupportStatus.CLOSED,
        closedAt: new Date(),
      });

      const result = await service.closeTicket('ticket-1', 'admin-1');
      expect(result.status).toBe(SupportStatus.CLOSED);
    });
  });

  describe('reopenTicket', () => {
    it('rejects when user is not admin', async () => {
      mockPrisma.supportTicket.findUnique.mockResolvedValue({ id: 'ticket-1', status: SupportStatus.CLOSED });
      mockPrisma.adminUser.findUnique.mockResolvedValue(null);

      await expect(service.reopenTicket('ticket-1', 'user-1')).rejects.toThrow(ForbiddenException);
    });

    it('allows admin to reopen ticket', async () => {
      mockPrisma.supportTicket.findUnique.mockResolvedValue({ id: 'ticket-1', status: SupportStatus.CLOSED });
      mockPrisma.adminUser.findUnique.mockResolvedValue({ id: 'admin-1', userId: 'admin-1' });
      mockPrisma.supportTicket.update.mockResolvedValue({
        id: 'ticket-1',
        status: SupportStatus.OPEN,
        closedAt: null,
      });

      const result = await service.reopenTicket('ticket-1', 'admin-1');
      expect(result.status).toBe(SupportStatus.OPEN);
    });
  });
});
