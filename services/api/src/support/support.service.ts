import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SupportStatus, SupportTicketType, SupportTicketPriority } from '@prisma/client';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';
import { AddTicketReplyDto } from './dto/add-ticket-reply.dto';
import { ChangeTicketStatusDto } from './dto/change-ticket-status.dto';
import { ChangeTicketPriorityDto } from './dto/change-ticket-priority.dto';
import { AssignTicketDto } from './dto/assign-ticket.dto';
import { RequestUploadDto } from './dto/request-upload.dto';

interface TicketFilter {
  status?: SupportStatus;
  type?: SupportTicketType;
  priority?: SupportTicketPriority;
  assignedToId?: string;
}

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);
  constructor(private prisma: PrismaService) {}

  async createTicket(userId: string, dto: CreateSupportTicketDto) {
    const { tripId, paymentId, payoutId, sosEventId, incidentReportId, vehicleId } = dto;

    // Validate at least one linked entity is provided
    if (!tripId && !paymentId && !payoutId && !sosEventId && !incidentReportId && !vehicleId) {
      throw new BadRequestException('At least one linked entity (trip, payment, payout, SOS, incident, or vehicle) is required');
    }

    // Validate ownership/authorization for linked entities
    if (tripId) {
      const trip = await this.prisma.trip.findUnique({
        where: { id: tripId },
        select: { riderProfileId: true, driverProfileId: true },
      });
      if (!trip) {
        throw new NotFoundException('Trip not found');
      }

      const riderProfile = await this.prisma.riderProfile.findUnique({
        where: { userId },
      });
      const driverProfile = await this.prisma.driverProfile.findUnique({
        where: { userId },
      });

      const isRider = riderProfile && riderProfile.id === trip.riderProfileId;
      const isDriver = driverProfile && driverProfile.id === trip.driverProfileId;

      if (!isRider && !isDriver) {
        throw new ForbiddenException('You do not have access to this trip');
      }
    }

    const ticket = await this.prisma.supportTicket.create({
      data: {
        createdById: userId,
        title: dto.title,
        description: dto.description,
        type: dto.type,
        priority: dto.priority || SupportTicketPriority.MEDIUM,
        status: SupportStatus.OPEN,
        tripId,
        paymentId,
        payoutId,
        sosEventId,
        incidentReportId,
        vehicleId,
      },
      include: {
        createdBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        messages: true,
        attachments: true,
      },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        actorId: userId,
        action: 'SUPPORT_TICKET_CREATED',
        entity: 'SUPPORT_TICKET',
        entityId: ticket.id,
        payload: {
          type: dto.type,
          priority: dto.priority,
          linkedEntity: tripId ? 'trip' : paymentId ? 'payment' : 'other',
        },
      },
    });

    return ticket;
  }

  async getTicket(ticketId: string, userId: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        createdBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        assignedTo: {
          select: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
        },
        messages: {
          where: {
            OR: [
              { isInternal: false },
              { authorId: userId }, // Always show user their own internal messages
            ],
          },
          include: {
            author: {
              select: { id: true, email: true, firstName: true, lastName: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        attachments: {
          include: {
            uploadedBy: {
              select: { id: true, email: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }

    // Check authorization
    const isCreator = ticket.createdById === userId;
    const isAdminUser = await this.prisma.adminUser.findUnique({
      where: { userId },
    });

    if (!isCreator && !isAdminUser) {
      throw new ForbiddenException('You do not have access to this ticket');
    }

    return ticket;
  }

  async listTickets(userId: string, filter: TicketFilter, offset: number = 0, limit: number = 20) {
    try {
      if (!userId) {
        throw new BadRequestException('User ID is required');
      }

      const isAdminUser = await this.prisma.adminUser.findUnique({
        where: { userId },
      });

      const where: any = {};

      // Non-admin users see only their own tickets
      if (!isAdminUser) {
        where.createdById = userId;
      } else {
        // Admin filters
        if (filter.status) where.status = filter.status;
        if (filter.type) where.type = filter.type;
        if (filter.priority) where.priority = filter.priority;
        if (filter.assignedToId) where.assignedToId = filter.assignedToId;
      }

      const [tickets, total] = await Promise.all([
        this.prisma.supportTicket.findMany({
          where,
          include: {
            createdBy: {
              select: { id: true, email: true, firstName: true, lastName: true },
            },
            assignedTo: {
              select: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: offset,
          take: limit,
        }),
        this.prisma.supportTicket.count({ where }),
      ]);

      return {
        items: tickets.map((t) => {
          const mappedCreatedBy = t.createdBy
            ? {
                id: t.createdBy.id,
                firstName: t.createdBy.firstName || '',
                lastName: t.createdBy.lastName || '',
                email: t.createdBy.email || '',
              }
            : null;

          const mappedAssignedTo = t.assignedTo?.user
            ? {
                id: t.assignedTo.user.id,
                firstName: t.assignedTo.user.firstName || '',
                lastName: t.assignedTo.user.lastName || '',
                email: t.assignedTo.user.email || '',
              }
            : null;

          return {
            id: t.id,
            title: t.title || '',
            type: t.type || 'OTHER',
            status: t.status || 'OPEN',
            priority: t.priority || 'MEDIUM',
            createdAt: t.createdAt ? t.createdAt.toISOString() : '',
            updatedAt: t.updatedAt ? t.updatedAt.toISOString() : '',
            createdBy: mappedCreatedBy,
            assignedTo: mappedAssignedTo,
          };
        }),
        total,
        limit,
        offset,
      };
    } catch (err: any) {
      this.logger.error(`Failed to list tickets for user ${userId}: ${err.message}`, err.stack);
      throw err;
    }
  }

  async addReply(ticketId: string, userId: string, dto: AddTicketReplyDto) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      select: {
        createdById: true,
        status: true,
      },
    });

    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }

    const isCreator = ticket.createdById === userId;
    const isAdminUser = await this.prisma.adminUser.findUnique({
      where: { userId },
    });

    // Only creator and assigned admin can add replies
    if (!isCreator && !isAdminUser) {
      throw new ForbiddenException('You do not have access to this ticket');
    }

    // Cannot add internal message as non-admin
    if (dto.isInternal && !isAdminUser) {
      throw new ForbiddenException('Only admin users can create internal messages');
    }

    const message = await this.prisma.supportTicketMessage.create({
      data: {
        ticketId,
        authorId: userId,
        content: dto.content,
        isInternal: dto.isInternal || false,
      },
      include: {
        author: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });

    // Auto-update status to IN_REVIEW if still OPEN and admin replied
    if (isAdminUser && ticket.status === SupportStatus.OPEN) {
      await this.prisma.supportTicket.update({
        where: { id: ticketId },
        data: { status: SupportStatus.IN_REVIEW },
      });
    }

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        actorId: userId,
        action: 'SUPPORT_TICKET_REPLY_ADDED',
        entity: 'SUPPORT_TICKET_MESSAGE',
        entityId: message.id,
        payload: {
          ticketId,
          isInternal: message.isInternal,
        },
      },
    });

    return message;
  }

  async changeStatus(ticketId: string, adminId: string, dto: ChangeTicketStatusDto) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }

    // Verify admin user
    const adminUser = await this.prisma.adminUser.findUnique({
      where: { userId: adminId },
    });

    if (!adminUser) {
      throw new ForbiddenException('Only admin users can change ticket status');
    }

    // Validate status transitions
    const validTransitions: Record<SupportStatus, SupportStatus[]> = {
      [SupportStatus.OPEN]: [
        SupportStatus.IN_REVIEW,
        SupportStatus.WAITING_ON_USER,
        SupportStatus.WAITING_ON_ADMIN,
        SupportStatus.ESCALATED,
      ],
      [SupportStatus.IN_REVIEW]: [
        SupportStatus.WAITING_ON_USER,
        SupportStatus.WAITING_ON_ADMIN,
        SupportStatus.ESCALATED,
        SupportStatus.RESOLVED,
        SupportStatus.CLOSED,
      ],
      [SupportStatus.WAITING_ON_USER]: [
        SupportStatus.IN_REVIEW,
        SupportStatus.ESCALATED,
        SupportStatus.CLOSED,
      ],
      [SupportStatus.WAITING_ON_ADMIN]: [
        SupportStatus.IN_REVIEW,
        SupportStatus.ESCALATED,
        SupportStatus.RESOLVED,
        SupportStatus.CLOSED,
      ],
      [SupportStatus.ESCALATED]: [
        SupportStatus.IN_REVIEW,
        SupportStatus.RESOLVED,
        SupportStatus.CLOSED,
      ],
      [SupportStatus.RESOLVED]: [SupportStatus.CLOSED],
      [SupportStatus.CLOSED]: [SupportStatus.OPEN], // Reopen
    };

    if (!validTransitions[ticket.status]?.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot transition from ${ticket.status} to ${dto.status}`,
      );
    }

    const updateData: any = { status: dto.status };

    if (dto.status === SupportStatus.RESOLVED) {
      updateData.resolvedAt = new Date();
    }
    if (dto.status === SupportStatus.CLOSED) {
      updateData.closedAt = new Date();
    }

    const updated = await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: updateData,
      include: {
        createdBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        actorId: adminId,
        action: 'SUPPORT_TICKET_STATUS_CHANGED',
        entity: 'SUPPORT_TICKET',
        entityId: ticketId,
        payload: {
          previousStatus: ticket.status,
          newStatus: dto.status,
          notes: dto.notes,
        },
      },
    });

    return updated;
  }

  async changePriority(ticketId: string, adminId: string, dto: ChangeTicketPriorityDto) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }

    // Verify admin user
    const adminUser = await this.prisma.adminUser.findUnique({
      where: { userId: adminId },
    });

    if (!adminUser) {
      throw new ForbiddenException('Only admin users can change ticket priority');
    }

    const updated = await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: { priority: dto.priority },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        actorId: adminId,
        action: 'SUPPORT_TICKET_PRIORITY_CHANGED',
        entity: 'SUPPORT_TICKET',
        entityId: ticketId,
        payload: {
          previousPriority: ticket.priority,
          newPriority: dto.priority,
          reason: dto.reason,
        },
      },
    });

    return updated;
  }

  async assignTicket(ticketId: string, adminId: string, dto: AssignTicketDto) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }

    // Verify requesting user is admin
    const requestingAdmin = await this.prisma.adminUser.findUnique({
      where: { userId: adminId },
    });

    if (!requestingAdmin) {
      throw new ForbiddenException('Only admin users can assign tickets');
    }

    // Verify target admin user exists
    const targetAdmin = await this.prisma.adminUser.findUnique({
      where: { id: dto.adminUserId },
    });

    if (!targetAdmin) {
      throw new NotFoundException('Admin user not found');
    }

    const updated = await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: { assignedToId: dto.adminUserId },
      include: {
        assignedTo: {
          select: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
        },
      },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        actorId: adminId,
        action: 'SUPPORT_TICKET_ASSIGNED',
        entity: 'SUPPORT_TICKET',
        entityId: ticketId,
        payload: {
          assignedToUserId: dto.adminUserId,
          notes: dto.notes,
        },
      },
    });

    return updated;
  }

  async requestUpload(ticketId: string, userId: string, dto: RequestUploadDto) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      select: { createdById: true },
    });

    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }

    // Only creator or assigned admin can upload
    const isCreator = ticket.createdById === userId;
    const isAdminUser = await this.prisma.adminUser.findUnique({
      where: { userId },
    });

    if (!isCreator && !isAdminUser) {
      throw new ForbiddenException('You do not have access to this ticket');
    }

    // Generate storage key (in real app, would integrate with S3/cloud storage)
    const storageKey = `support-tickets/${ticketId}/${Date.now()}-${dto.fileName}`;

    const attachment = await this.prisma.supportTicketAttachment.create({
      data: {
        ticketId,
        uploadedById: userId,
        fileName: dto.fileName,
        fileSize: dto.fileSize,
        mimeType: dto.mimeType,
        storageKey,
      },
      include: {
        uploadedBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        actorId: userId,
        action: 'SUPPORT_TICKET_ATTACHMENT_UPLOADED',
        entity: 'SUPPORT_TICKET_ATTACHMENT',
        entityId: attachment.id,
        payload: {
          ticketId,
          fileName: dto.fileName,
          fileSize: dto.fileSize,
        },
      },
    });

    return {
      attachmentId: attachment.id,
      storageKey,
      uploadUrl: `${process.env.API_URL}/support/tickets/${ticketId}/attachments/${attachment.id}/upload`,
    };
  }

  async closeTicket(ticketId: string, userId: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      select: { createdById: true, status: true },
    });

    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }

    // Only creator can close (or admin can force close)
    const isCreator = ticket.createdById === userId;
    const isAdminUser = await this.prisma.adminUser.findUnique({
      where: { userId },
    });

    if (!isCreator && !isAdminUser) {
      throw new ForbiddenException('You do not have permission to close this ticket');
    }

    const updated = await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        status: SupportStatus.CLOSED,
        closedAt: new Date(),
      },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        actorId: userId,
        action: 'SUPPORT_TICKET_CLOSED',
        entity: 'SUPPORT_TICKET',
        entityId: ticketId,
        payload: {
          previousStatus: ticket.status,
        },
      },
    });

    return updated;
  }

  async reopenTicket(ticketId: string, adminId: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      select: { status: true },
    });

    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }

    // Only admin can reopen
    const isAdminUser = await this.prisma.adminUser.findUnique({
      where: { userId: adminId },
    });

    if (!isAdminUser) {
      throw new ForbiddenException('Only admin users can reopen tickets');
    }

    const updated = await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        status: SupportStatus.OPEN,
        closedAt: null,
      },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        actorId: adminId,
        action: 'SUPPORT_TICKET_REOPENED',
        entity: 'SUPPORT_TICKET',
        entityId: ticketId,
        payload: {
          previousStatus: ticket.status,
        },
      },
    });

    return updated;
  }
}
