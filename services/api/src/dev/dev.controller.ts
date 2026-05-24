import { Controller, NotFoundException, Param, Post } from '@nestjs/common';
import { DevService } from './dev.service';

@Controller('dev')
export class DevController {
  constructor(private readonly devService: DevService) {}

  @Post('driver/approve/:userId')
  async approveDriver(@Param('userId') userId: string) {
    if (process.env.NODE_ENV !== 'development') {
      throw new NotFoundException();
    }
    return this.devService.approveDriver(userId);
  }
}
