import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SupportService } from './support.service';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';
import { AddTicketReplyDto } from './dto/add-ticket-reply.dto';
import { RequestUploadDto } from './dto/request-upload.dto';

@Controller('support')
@UseGuards(JwtAuthGuard)
export class SupportController {
  constructor(private supportService: SupportService) {}

  @Post('tickets')
  async createTicket(@Req() req: any, @Body() dto: CreateSupportTicketDto) {
    return this.supportService.createTicket(req.user.userId, dto);
  }

  @Get('tickets')
  async listTickets(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('priority') priority?: string,
    @Query('assignedToId') assignedToId?: string,
    @Query('page') page: string = '0',
    @Query('limit') limit: string = '20',
  ) {
    const filter: any = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (priority) filter.priority = priority;
    if (assignedToId) filter.assignedToId = assignedToId;

    const parsedLimit = Number(limit) || 20;
    const parsedOffset = (Number(page) || 0) * parsedLimit;

    return this.supportService.listTickets(req.user.userId, filter, parsedOffset, parsedLimit);
  }

  @Get('tickets/:ticketId')
  async getTicket(@Req() req: any, @Param('ticketId') ticketId: string) {
    return this.supportService.getTicket(ticketId, req.user.userId);
  }

  @Post('tickets/:ticketId/replies')
  async addReply(
    @Req() req: any,
    @Param('ticketId') ticketId: string,
    @Body() dto: AddTicketReplyDto,
  ) {
    return this.supportService.addReply(ticketId, req.user.userId, dto);
  }

  @Post('tickets/:ticketId/attachments/request-upload')
  async requestUpload(
    @Req() req: any,
    @Param('ticketId') ticketId: string,
    @Body() dto: RequestUploadDto,
  ) {
    return this.supportService.requestUpload(ticketId, req.user.userId, dto);
  }

  @Patch('tickets/:ticketId/close')
  async closeTicket(@Req() req: any, @Param('ticketId') ticketId: string) {
    return this.supportService.closeTicket(ticketId, req.user.userId);
  }
}
