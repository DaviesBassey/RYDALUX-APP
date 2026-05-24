import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { FareService } from './fare.service';
import { CreateFareQuoteDto } from './dto/create-fare-quote.dto';

@Controller('fare')
export class FareController {
  constructor(private readonly fareService: FareService) {}

  @Post('quote')
  async createQuote(@Body() body: CreateFareQuoteDto) {
    return this.fareService.calculateFare(body);
  }

  @Get('quote/:id')
  async getQuote(@Param('id') id: string) {
    return this.fareService.getFareQuote(id);
  }

  @Post('quote/:id/consume')
  async consumeQuote(@Param('id') id: string) {
    return this.fareService.consumeQuote(id);
  }
}
