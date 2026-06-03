import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  Logger,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import { SupportService } from './support.service';
import { ChangeTicketStatusDto } from './dto/change-ticket-status.dto';
import { ChangeTicketPriorityDto } from './dto/change-ticket-priority.dto';
import { AssignTicketDto } from './dto/assign-ticket.dto';

@Controller('admin/support')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions('SUPPORT_AGENT')
export class SupportAdminController {
  private readonly logger = new Logger(SupportAdminController.name);
  constructor(private supportService: SupportService) {}

  @Get('tickets')
  async listAllTickets(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('priority') priority?: string,
    @Query('assignedToId') assignedToId?: string,
    @Query('page') page?: string,
    @Query('offset') offset?: string,
    @Query('limit') limit?: string,
  ) {
    try {
      const userId = req.user?.userId || req.user?.sub || req.user?.id;
      if (!userId) throw new UnauthorizedException('Missing authenticated user id');

      const filter: any = {};
      const allowedStatuses = ['OPEN', 'IN_REVIEW', 'WAITING_ON_USER', 'WAITING_ON_ADMIN', 'ESCALATED', 'RESOLVED', 'CLOSED'];
      if (status) {
        if (!allowedStatuses.includes(status.toUpperCase())) {
          throw new BadRequestException(`Invalid ticket status: ${status}`);
        }
        filter.status = status.toUpperCase();
      }

      const allowedTypes = ['PAYMENT_ISSUE', 'DRIVER_COMPLAINT', 'RIDER_COMPLAINT', 'LOST_ITEM', 'SAFETY_ISSUE', 'CANCELLATION_ISSUE', 'REFUND_REQUEST', 'PAYOUT_ISSUE', 'ACCOUNT_ISSUE', 'VEHICLE_ISSUE', 'SHIPMENT_ISSUE', 'OTHER'];
      if (type) {
        if (!allowedTypes.includes(type.toUpperCase())) {
          throw new BadRequestException(`Invalid ticket type: ${type}`);
        }
        filter.type = type.toUpperCase();
      }

      const allowedPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
      if (priority) {
        if (!allowedPriorities.includes(priority.toUpperCase())) {
          throw new BadRequestException(`Invalid ticket priority: ${priority}`);
        }
        filter.priority = priority.toUpperCase();
      }

      if (assignedToId) filter.assignedToId = assignedToId;

      const parsedLimit = Number(limit) || 20;
      let parsedOffset = Number(offset) || 0;
      if (page !== undefined && offset === undefined) {
        parsedOffset = (Number(page) || 0) * parsedLimit;
      }

      return await this.supportService.listTickets(userId, filter, parsedOffset, parsedLimit);
    } catch (err: any) {
      this.logger.error(`Error in listAllTickets for user ${req.user?.userId || req.user?.sub || req.user?.id}: ${err.message}`, err.stack);
      throw err;
    }
  }

  @Get('tickets/:ticketId')
  async getTicket(@Req() req: any, @Param('ticketId') ticketId: string) {
    try {
      const userId = req.user?.userId || req.user?.sub || req.user?.id;
      if (!userId) throw new UnauthorizedException('Missing authenticated user id');

      return await this.supportService.getTicket(ticketId, userId);
    } catch (err: any) {
      this.logger.error(`Error in getTicket for user ${req.user?.userId || req.user?.sub || req.user?.id}: ${err.message}`, err.stack);
      throw err;
    }
  }

  @Patch('tickets/:ticketId/status')
  async changeStatus(
    @Req() req: any,
    @Param('ticketId') ticketId: string,
    @Body() dto: ChangeTicketStatusDto,
  ) {
    try {
      const userId = req.user?.userId || req.user?.sub || req.user?.id;
      if (!userId) throw new UnauthorizedException('Missing authenticated user id');

      return await this.supportService.changeStatus(ticketId, userId, dto);
    } catch (err: any) {
      this.logger.error(`Error in changeStatus for user ${req.user?.userId || req.user?.sub || req.user?.id}: ${err.message}`, err.stack);
      throw err;
    }
  }

  @Patch('tickets/:ticketId/priority')
  async changePriority(
    @Req() req: any,
    @Param('ticketId') ticketId: string,
    @Body() dto: ChangeTicketPriorityDto,
  ) {
    try {
      const userId = req.user?.userId || req.user?.sub || req.user?.id;
      if (!userId) throw new UnauthorizedException('Missing authenticated user id');

      return await this.supportService.changePriority(ticketId, userId, dto);
    } catch (err: any) {
      this.logger.error(`Error in changePriority for user ${req.user?.userId || req.user?.sub || req.user?.id}: ${err.message}`, err.stack);
      throw err;
    }
  }

  @Patch('tickets/:ticketId/assign')
  async assignTicket(
    @Req() req: any,
    @Param('ticketId') ticketId: string,
    @Body() dto: AssignTicketDto,
  ) {
    try {
      const userId = req.user?.userId || req.user?.sub || req.user?.id;
      if (!userId) throw new UnauthorizedException('Missing authenticated user id');

      return await this.supportService.assignTicket(ticketId, userId, dto);
    } catch (err: any) {
      this.logger.error(`Error in assignTicket for user ${req.user?.userId || req.user?.sub || req.user?.id}: ${err.message}`, err.stack);
      throw err;
    }
  }

  @Patch('tickets/:ticketId/reopen')
  async reopenTicket(@Req() req: any, @Param('ticketId') ticketId: string) {
    try {
      const userId = req.user?.userId || req.user?.sub || req.user?.id;
      if (!userId) throw new UnauthorizedException('Missing authenticated user id');

      return await this.supportService.reopenTicket(ticketId, userId);
    } catch (err: any) {
      this.logger.error(`Error in reopenTicket for user ${req.user?.userId || req.user?.sub || req.user?.id}: ${err.message}`, err.stack);
      throw err;
    }
  }
}
