import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import { AppService } from './app.service';

@Controller('health')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  health() {
    return this.appService.health();
  }

  @Get('live')
  live() {
    return this.appService.live();
  }

  @Get('ready')
  async ready(@Res() res: Response) {
    const result = await this.appService.ready();
    const statusCode = result.status === 'ok' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;
    res.status(statusCode).json(result);
  }
}
