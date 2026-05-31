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
  UnauthorizedException,
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
    const userId = req.user?.userId || req.user?.sub || req.user?.id;
    if (!userId) throw new UnauthorizedException('Missing authenticated user id');

    return this.supportService.createTicket(userId, dto);
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
    const userId = req.user?.userId || req.user?.sub || req.user?.id;
    if (!userId) throw new UnauthorizedException('Missing authenticated user id');

    const filter: any = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (priority) filter.priority = priority;
    if (assignedToId) filter.assignedToId = assignedToId;

    const parsedLimit = Number(limit) || 20;
    const parsedOffset = (Number(page) || 0) * parsedLimit;

    return this.supportService.listTickets(userId, filter, parsedOffset, parsedLimit);
  }

  @Get('tickets/:ticketId')
  async getTicket(@Req() req: any, @Param('ticketId') ticketId: string) {
    const userId = req.user?.userId || req.user?.sub || req.user?.id;
    if (!userId) throw new UnauthorizedException('Missing authenticated user id');

    return this.supportService.getTicket(ticketId, userId);
  }

  @Post('tickets/:ticketId/replies')
  async addReply(
    @Req() req: any,
    @Param('ticketId') ticketId: string,
    @Body() dto: AddTicketReplyDto,
  ) {
    const userId = req.user?.userId || req.user?.sub || req.user?.id;
    if (!userId) throw new UnauthorizedException('Missing authenticated user id');

    return this.supportService.addReply(ticketId, userId, dto);
  }

  @Post('tickets/:ticketId/attachments/request-upload')
  async requestUpload(
    @Req() req: any,
    @Param('ticketId') ticketId: string,
    @Body() dto: RequestUploadDto,
  ) {
    const userId = req.user?.userId || req.user?.sub || req.user?.id;
    if (!userId) throw new UnauthorizedException('Missing authenticated user id');

    return this.supportService.requestUpload(ticketId, userId, dto);
  }

  @Patch('tickets/:ticketId/close')
  async closeTicket(@Req() req: any, @Param('ticketId') ticketId: string) {
    const userId = req.user?.userId || req.user?.sub || req.user?.id;
    if (!userId) throw new UnauthorizedException('Missing authenticated user id');

    return this.supportService.closeTicket(ticketId, userId);
  }
}
