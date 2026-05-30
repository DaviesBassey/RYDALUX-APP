import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
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
  constructor(private supportService: SupportService) {}

  @Get('tickets')
  async listAllTickets(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('priority') priority?: string,
    @Query('assignedToId') assignedToId?: string,
    @Query('page') page: number = 0,
    @Query('limit') limit: number = 20,
  ) {
    const filter: any = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (priority) filter.priority = priority;
    if (assignedToId) filter.assignedToId = assignedToId;

    return this.supportService.listTickets(req.user.id, filter, page, limit);
  }

  @Get('tickets/:ticketId')
  async getTicket(@Req() req: any, @Param('ticketId') ticketId: string) {
    return this.supportService.getTicket(ticketId, req.user.id);
  }

  @Patch('tickets/:ticketId/status')
  async changeStatus(
    @Req() req: any,
    @Param('ticketId') ticketId: string,
    @Body() dto: ChangeTicketStatusDto,
  ) {
    return this.supportService.changeStatus(ticketId, req.user.id, dto);
  }

  @Patch('tickets/:ticketId/priority')
  async changePriority(
    @Req() req: any,
    @Param('ticketId') ticketId: string,
    @Body() dto: ChangeTicketPriorityDto,
  ) {
    return this.supportService.changePriority(ticketId, req.user.id, dto);
  }

  @Patch('tickets/:ticketId/assign')
  async assignTicket(
    @Req() req: any,
    @Param('ticketId') ticketId: string,
    @Body() dto: AssignTicketDto,
  ) {
    return this.supportService.assignTicket(ticketId, req.user.id, dto);
  }

  @Patch('tickets/:ticketId/reopen')
  async reopenTicket(@Req() req: any, @Param('ticketId') ticketId: string) {
    return this.supportService.reopenTicket(ticketId, req.user.id);
  }
}
