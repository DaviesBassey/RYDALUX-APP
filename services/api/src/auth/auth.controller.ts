import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { OtpRequestDto } from './dto/otp-request.dto';
import { OtpVerifyDto } from './dto/otp-verify.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('otp/request')
  requestOtp(@Body() body: OtpRequestDto) {
    return this.authService.requestOtp(body);
  }

  @Post('otp/verify')
  verifyOtp(@Body() body: OtpVerifyDto) {
    return this.authService.verifyOtp(body);
  }

  @Post('admin/login')
  adminLogin(@Body() body: AdminLoginDto) {
    return this.authService.adminLogin(body);
  }

  @Post('refresh')
  refreshToken(@Body() body: RefreshTokenDto) {
    return this.authService.refreshToken(body);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logoutCurrent(@Req() req: Request) {
    const user = req.user as any;
    return this.authService.logoutCurrent(user.userId, user.sessionId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  logoutAll(@Req() req: Request) {
    const user = req.user as any;
    return this.authService.logoutAll(user.userId);
  }
}
