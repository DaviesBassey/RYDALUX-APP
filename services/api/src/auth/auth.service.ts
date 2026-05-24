import { Injectable, UnauthorizedException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { OtpRequestDto } from './dto/otp-request.dto';
import { OtpVerifyDto } from './dto/otp-verify.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ACCESS_TOKEN_EXPIRES_IN, REFRESH_TOKEN_EXPIRES_IN, MAX_OTP_ATTEMPTS, OTP_CODE_EXPIRES_IN_MINUTES } from './constants';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  async requestOtp(payload: OtpRequestDto) {
    const expiresAt = new Date(Date.now() + OTP_CODE_EXPIRES_IN_MINUTES * 60000);
    const code = this.generateNumericCode();
    const codeHash = await bcrypt.hash(code, 10);

    const existing = await this.prisma.otpRequest.findFirst({
      where: { phone: payload.phone, expiresAt: { gt: new Date() }, usedAt: null },
      orderBy: { createdAt: 'desc' }
    });

    if (existing && existing.attempts >= MAX_OTP_ATTEMPTS) {
      throw new ForbiddenException('Too many OTP requests. Try again later.');
    }

    await this.prisma.otpRequest.create({
      data: {
        phone: payload.phone,
        codeHash,
        attempts: 0,
        expiresAt,
        deviceId: null,
        ipAddress: null,
        userAgent: null
      }
    });

    // In production, send the OTP code via SMS provider instead of returning it.
    const response: Record<string, unknown> = { success: true, message: 'OTP request accepted.' };
    if (process.env.NODE_ENV === 'development') {
      response.devCode = code;
    }
    return response;
  }

  async verifyOtp(payload: OtpVerifyDto) {
    const now = new Date();
    const request = await this.prisma.otpRequest.findFirst({
      where: {
        phone: payload.phone,
        expiresAt: { gt: now },
        usedAt: null
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!request) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    if (request.attempts >= MAX_OTP_ATTEMPTS) {
      throw new ForbiddenException('Too many verification attempts.');
    }

    const valid = await bcrypt.compare(payload.code, request.codeHash);
    if (!valid) {
      await this.prisma.otpRequest.update({
        where: { id: request.id },
        data: { attempts: { increment: 1 } }
      });
      throw new UnauthorizedException('Invalid credentials.');
    }

    await this.prisma.otpRequest.update({
      where: { id: request.id },
      data: { usedAt: new Date() }
    });

    const user = await this.prisma.user.upsert({
      where: { phone: payload.phone },
      update: { lastLoginAt: now },
      create: {
        phone: payload.phone,
        email: `${payload.phone}@placeholder.rydulux.local`,
        userType: 'RIDER',
        isPhoneVerified: true,
        createdAt: now,
        updatedAt: now
      }
    });

    const device = await this.getOrCreateDevice(user.id, payload.fingerprint, payload.deviceName);
    const tokens = await this.createSessionTokens(user.id, device.id, user.userType);
    await this.logAuthEvent(user.id, 'OTP_LOGIN', `Phone OTP login for ${payload.phone}`);

    return tokens;
  }

  async adminLogin(payload: AdminLoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: payload.email },
      include: { adminUser: true }
    });

    if (!user || user.userType !== 'ADMIN' || !user.adminUser || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const passwordMatches = await bcrypt.compare(payload.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const device = await this.getOrCreateDevice(user.id, payload.fingerprint, payload.deviceName);
    const tokens = await this.createSessionTokens(user.id, device.id, user.userType);
    await this.logAuthEvent(user.id, 'ADMIN_LOGIN', `Admin login for ${payload.email}`);

    return tokens;
  }

  async refreshToken(payload: RefreshTokenDto) {
    const decoded = await this.verifyRefreshToken(payload.token);
    const session = await this.prisma.authSession.findUnique({
      where: { id: decoded.sid },
      include: { user: true }
    });

    if (!session || session.revokedAt || session.expiresAt < new Date() || !session.user) {
      throw new UnauthorizedException('Invalid token.');
    }

    const tokenMatch = await bcrypt.compare(payload.token, session.refreshTokenHash);
    if (!tokenMatch) {
      await this.revokeSession(session.id, 'TOKEN_MISMATCH');
      throw new UnauthorizedException('Invalid token.');
    }

    const device = await this.getOrCreateDevice(session.userId, payload.fingerprint, undefined);
    await this.revokeSession(session.id, 'ROTATED');

    const tokens = await this.createSessionTokens(session.userId, device.id, session.user.userType);
    await this.logAuthEvent(session.userId, 'REFRESH_TOKEN', `Refresh token rotated for session ${session.id}`);

    return tokens;
  }

  async logoutCurrent(userId: string, sessionId: string) {
    await this.revokeSession(sessionId, 'LOGOUT');
    await this.logAuthEvent(userId, 'LOGOUT', `User logged out from session ${sessionId}`);
    return { success: true };
  }

  async logoutAll(userId: string) {
    await this.prisma.authSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date(), reasonRevoked: 'LOGOUT_ALL' }
    });
    await this.logAuthEvent(userId, 'LOGOUT_ALL', 'Logged out from all sessions');
    return { success: true };
  }

  async validateAccessToken(payload: any) {
    const session = await this.prisma.authSession.findUnique({ where: { id: payload.sessionId } });
    if (!session || session.revokedAt) {
      throw new UnauthorizedException('Session revoked.');
    }
    return { userId: payload.sub, sessionId: payload.sessionId, userType: payload.userType };
  }

  private async getOrCreateDevice(userId: string, fingerprint: string, deviceName?: string) {
    const existing = await this.prisma.device.findUnique({ where: { fingerprint } });
    if (existing && existing.userId !== userId) {
      throw new BadRequestException('Device fingerprint conflict.');
    }

    if (existing) {
      return this.prisma.device.update({
        where: { id: existing.id },
        data: { lastSeenAt: new Date(), deviceName: deviceName ?? existing.deviceName }
      });
    }

    return this.prisma.device.create({
      data: {
        userId,
        fingerprint,
        deviceName,
        isActive: true,
        lastSeenAt: new Date()
      }
    });
  }

  private async createSessionTokens(userId: string, deviceId: string, userType: string) {
    const sessionId = randomUUID();
    const refreshToken = await this.createRefreshToken(userId, sessionId);
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date(Date.now() + this.parseDuration(REFRESH_TOKEN_EXPIRES_IN));

    await this.prisma.authSession.create({
      data: {
        id: sessionId,
        userId,
        deviceId,
        refreshTokenHash,
        expiresAt,
        ipAddress: null,
        userAgent: null
      }
    });

    const accessToken = await this.jwtService.signAsync(
      { sub: userId, sessionId, userType, type: 'access' },
      { secret: this.configService.get<string>('JWT_ACCESS_SECRET', 'change-me'), expiresIn: ACCESS_TOKEN_EXPIRES_IN }
    );

    return { accessToken, refreshToken, expiresIn: ACCESS_TOKEN_EXPIRES_IN };
  }

  private async createRefreshToken(userId: string, sessionId: string) {
    return this.jwtService.signAsync(
      { sub: userId, sid: sessionId, type: 'refresh' },
      { secret: this.configService.get<string>('JWT_REFRESH_SECRET', 'change-me'), expiresIn: REFRESH_TOKEN_EXPIRES_IN }
    );
  }

  private async verifyRefreshToken(token: string) {
    try {
      return await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET', 'change-me')
      });
    } catch (error) {
      throw new UnauthorizedException('Invalid token.');
    }
  }

  private async revokeSession(sessionId: string, reason: string) {
    await this.prisma.authSession.update({
      where: { id: sessionId },
      data: { revokedAt: new Date(), reasonRevoked: reason }
    });
  }

  private async logAuthEvent(userId: string, action: string, details: string) {
    await this.prisma.auditLog.create({
      data: {
        actorId: userId,
        action,
        entity: 'AUTH',
        entityId: userId,
        payload: { details }
      }
    });
  }

  private generateNumericCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private parseDuration(duration: string) {
    const amount = Number(duration.replace(/[^0-9]/g, ''));
    if (duration.endsWith('m')) {
      return amount * 60 * 1000;
    }
    if (duration.endsWith('h')) {
      return amount * 60 * 60 * 1000;
    }
    if (duration.endsWith('d')) {
      return amount * 24 * 60 * 60 * 1000;
    }
    return amount * 1000;
  }
}
