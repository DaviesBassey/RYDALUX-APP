import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RiderOnlyGuard } from '../auth/rider-only.guard';
import { UsersService } from './users.service';
import { CreateRiderProfileDto } from './dto/create-rider-profile.dto';
import { UpdateRiderProfileDto } from './dto/update-rider-profile.dto';
import { CreateTrustedContactDto } from './dto/create-trusted-contact.dto';
import { ConfirmPhoneChangeDto } from './dto/confirm-phone-change.dto';
import { ConfirmPhoneVerificationDto } from './dto/confirm-phone-verification.dto';
import { PaymentMethodDto } from './dto/payment-method.dto';
import { AccountDeletionRequestDto } from './dto/account-deletion-request.dto';

@Controller('rider')
@UseGuards(JwtAuthGuard, RiderOnlyGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('profile')
  createProfile(@Req() req: Request, @Body() body: CreateRiderProfileDto) {
    const user = req.user as any;
    return this.usersService.createRiderProfile(user.userId, body);
  }

  @Get('profile')
  getProfile(@Req() req: Request) {
    const user = req.user as any;
    return this.usersService.getRiderProfile(user.userId);
  }

  @Patch('profile')
  updateProfile(@Req() req: Request, @Body() body: UpdateRiderProfileDto) {
    const user = req.user as any;
    return this.usersService.updateRiderProfile(user.userId, body);
  }

  @Post('trusted-contacts')
  addTrustedContact(@Req() req: Request, @Body() body: CreateTrustedContactDto) {
    const user = req.user as any;
    return this.usersService.addTrustedContact(user.userId, body);
  }

  @Get('trusted-contacts')
  listTrustedContacts(@Req() req: Request) {
    const user = req.user as any;
    return this.usersService.listTrustedContacts(user.userId);
  }

  @Delete('trusted-contacts/:id')
  removeTrustedContact(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as any;
    return this.usersService.removeTrustedContact(user.userId, id);
  }

  @Post('phone/verify-request')
  requestPhoneVerification(@Req() req: Request) {
    const user = req.user as any;
    return this.usersService.requestPhoneVerification(user.userId);
  }

  @Post('phone/verify-confirm')
  confirmPhoneVerification(@Req() req: Request, @Body() body: ConfirmPhoneVerificationDto) {
    const user = req.user as any;
    return this.usersService.confirmPhoneVerification(user.userId, body);
  }

  @Post('phone/change-request')
  requestPhoneChange(@Req() req: Request) {
    const user = req.user as any;
    return this.usersService.requestPhoneChange(user.userId);
  }

  @Post('phone/change-confirm')
  confirmPhoneChange(@Req() req: Request, @Body() body: ConfirmPhoneChangeDto) {
    const user = req.user as any;
    return this.usersService.confirmPhoneChange(user.userId, body);
  }

  @Post('selfie-verification')
  requestSelfieVerification(@Req() req: Request) {
    const user = req.user as any;
    return this.usersService.requestSelfieVerification(user.userId);
  }

  @Post('payment-methods')
  addPaymentMethod(@Req() req: Request, @Body() body: PaymentMethodDto) {
    const user = req.user as any;
    return this.usersService.addPaymentMethod(user.userId, body);
  }

  @Get('payment-methods')
  getPaymentMethod(@Req() req: Request) {
    const user = req.user as any;
    return this.usersService.getPaymentMethod(user.userId);
  }

  @Post('account-deletion-request')
  requestAccountDeletion(@Req() req: Request, @Body() body: AccountDeletionRequestDto) {
    const user = req.user as any;
    return this.usersService.requestAccountDeletion(user.userId, body);
  }
}
