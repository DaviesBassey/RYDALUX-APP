import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service';
import { CreateRiderProfileDto } from './dto/create-rider-profile.dto';
import { UpdateRiderProfileDto } from './dto/update-rider-profile.dto';
import { CreateTrustedContactDto } from './dto/create-trusted-contact.dto';
import { ConfirmPhoneChangeDto } from './dto/confirm-phone-change.dto';
import { ConfirmPhoneVerificationDto } from './dto/confirm-phone-verification.dto';
import { PaymentMethodDto } from './dto/payment-method.dto';
import { AccountDeletionRequestDto } from './dto/account-deletion-request.dto';
import { MAX_OTP_ATTEMPTS, OTP_CODE_EXPIRES_IN_MINUTES } from '../auth/constants';

const UNSAFE_PAYMENT_METHOD_KEYS = new Set([
  'pan',
  'cardnumber',
  'number',
  'cvv',
  'cvc',
  'expiry',
  'expmonth',
  'expyear',
  'pin',
  'trackdata',
  'magneticstripe',
]);

const SAFE_PAYMENT_METHOD_DATA_KEYS = new Set([
  'authorizationcode',
  'bank',
  'brand',
  'cardtype',
  'channel',
  'customercode',
  'last4',
  'providercustomerid',
  'providermethod',
  'reference',
  'reusable',
  'token',
]);

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async createRiderProfile(userId: string, payload: CreateRiderProfileDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: payload.firstName,
        lastName: payload.lastName,
        displayName: `${payload.firstName} ${payload.lastName}`,
        phone: payload.phone,
        email: payload.email ?? undefined,
        preferredLanguage: payload.preferredLanguage ?? undefined,
        userType: 'RIDER',
        isPhoneVerified: false,
        emergencyContactName: payload.emergencyContactName ?? undefined,
        emergencyContactPhone: payload.emergencyContactPhone ?? undefined,
        emergencyContactRelationship: payload.emergencyContactRelationship ?? undefined
      }
    });

    const riderProfile = await this.prisma.riderProfile.upsert({
      where: { userId },
      create: { userId },
      update: {}
    });

    await this.logAuditEvent(userId, 'RIDER_PROFILE_CREATED', userId, {
      firstName: payload.firstName,
      lastName: payload.lastName,
      phone: payload.phone
    });

    return { user, riderProfile };
  }

  async updateRiderProfile(userId: string, payload: UpdateRiderProfileDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const updateData: any = {
      firstName: payload.firstName ?? undefined,
      lastName: payload.lastName ?? undefined,
      email: payload.email ?? undefined,
      preferredLanguage: payload.preferredLanguage ?? undefined,
      emergencyContactName: payload.emergencyContactName ?? undefined,
      emergencyContactPhone: payload.emergencyContactPhone ?? undefined,
      emergencyContactRelationship: payload.emergencyContactRelationship ?? undefined
    };

    const profile = await this.prisma.riderProfile.upsert({
      where: { userId },
      create: { userId },
      update: {}
    });

    const updatedUser = await this.prisma.user.update({ where: { id: userId }, data: updateData });
    await this.logAuditEvent(userId, 'RIDER_PROFILE_UPDATED', userId, {
      changedFields: Object.keys(updateData).filter((key) => updateData[key] !== undefined)
    });

    return { user: updatedUser, riderProfile: profile };
  }

  async getRiderProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { riderProfile: true, trustedContacts: true }
    });
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      displayName: user.displayName,
      email: user.email,
      phone: user.phone,
      preferredLanguage: user.preferredLanguage,
      emergencyContactName: user.emergencyContactName,
      emergencyContactPhone: user.emergencyContactPhone,
      emergencyContactRelationship: user.emergencyContactRelationship,
      selfieVerificationStatus: user.selfieVerificationStatus,
      paymentMethod: user.paymentMethod,
      riderProfile: user.riderProfile
    };
  }

  async addTrustedContact(userId: string, payload: CreateTrustedContactDto) {
    const contact = await this.prisma.trustedContact.create({
      data: {
        userId,
        name: payload.name,
        phone: payload.phone,
        relationship: payload.relationship
      }
    });

    await this.logAuditEvent(userId, 'TRUSTED_CONTACT_ADDED', userId, {
      contactId: contact.id,
      name: payload.name
    });

    return contact;
  }

  async listTrustedContacts(userId: string) {
    return this.prisma.trustedContact.findMany({ where: { userId } });
  }

  async removeTrustedContact(userId: string, contactId: string) {
    const contact = await this.prisma.trustedContact.findUnique({ where: { id: contactId } });
    if (!contact || contact.userId !== userId) {
      throw new NotFoundException('Trusted contact not found.');
    }

    await this.prisma.trustedContact.delete({ where: { id: contactId } });
    await this.logAuditEvent(userId, 'TRUSTED_CONTACT_REMOVED', userId, { contactId });
    return { success: true };
  }

  private async createOtpRequest(phone: string) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + OTP_CODE_EXPIRES_IN_MINUTES * 60000);
    const code = this.generateNumericCode();
    const codeHash = await bcrypt.hash(code, 10);

    const existing = await this.prisma.otpRequest.findFirst({
      where: { phone, expiresAt: { gt: now }, usedAt: null },
      orderBy: { createdAt: 'desc' }
    });

    if (existing && existing.attempts >= MAX_OTP_ATTEMPTS) {
      throw new BadRequestException('Too many phone verification attempts. Try again later.');
    }

    return this.prisma.otpRequest.create({
      data: {
        phone,
        codeHash,
        attempts: 0,
        expiresAt,
        deviceId: null,
        ipAddress: null,
        userAgent: null
      }
    });
  }

  async requestPhoneVerification(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.phone) {
      throw new BadRequestException('Phone number is required to request verification.');
    }

    await this.createOtpRequest(user.phone);
    await this.logAuditEvent(userId, 'PHONE_VERIFICATION_REQUESTED', userId, { phone: user.phone });
    return { success: true, message: 'Verification code sent to phone.' };
  }

  async confirmPhoneVerification(userId: string, payload: ConfirmPhoneVerificationDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.phone) {
      throw new BadRequestException('Phone number not found.');
    }

    const now = new Date();
    const request = await this.prisma.otpRequest.findFirst({
      where: { phone: user.phone, expiresAt: { gt: now }, usedAt: null },
      orderBy: { createdAt: 'desc' }
    });

    if (!request) {
      throw new BadRequestException('Verification code is invalid or expired.');
    }

    const isValid = await bcrypt.compare(payload.code, request.codeHash);
    if (!isValid) {
      await this.prisma.otpRequest.update({ where: { id: request.id }, data: { attempts: { increment: 1 } } });
      throw new BadRequestException('Invalid verification code.');
    }

    await this.prisma.otpRequest.update({ where: { id: request.id }, data: { usedAt: new Date() } });
    const updatedUser = await this.prisma.user.update({ where: { id: userId }, data: { isPhoneVerified: true } });
    await this.logAuditEvent(userId, 'PHONE_VERIFIED', userId, { phone: user.phone });

    return { success: true, user: updatedUser };
  }

  async requestPhoneChange(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.phone) {
      throw new BadRequestException('Current phone number is required to request a phone change.');
    }

    await this.createOtpRequest(user.phone);
    await this.logAuditEvent(userId, 'PHONE_CHANGE_REQUESTED', userId, { oldPhone: user.phone });
    return { success: true, message: 'Verification code sent to current phone.' };
  }

  async confirmPhoneChange(userId: string, payload: ConfirmPhoneChangeDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.phone) {
      throw new BadRequestException('Current phone number not found.');
    }

    const now = new Date();
    const request = await this.prisma.otpRequest.findFirst({
      where: { phone: user.phone, expiresAt: { gt: now }, usedAt: null },
      orderBy: { createdAt: 'desc' }
    });

    if (!request) {
      throw new BadRequestException('Verification code is invalid or expired.');
    }

    const isValid = await bcrypt.compare(payload.code, request.codeHash);
    if (!isValid) {
      await this.prisma.otpRequest.update({
        where: { id: request.id },
        data: { attempts: { increment: 1 } }
      });
      throw new BadRequestException('Invalid verification code.');
    }

    await this.prisma.otpRequest.update({ where: { id: request.id }, data: { usedAt: new Date() } });

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { phone: payload.newPhone, isPhoneVerified: true }
    });

    await this.logAuditEvent(userId, 'PHONE_CHANGED', userId, { oldPhone: user.phone, newPhone: payload.newPhone });
    return { success: true, user: updatedUser };
  }

  async requestSelfieVerification(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const uploadUrl = `https://storage.rydulux.local/selfie-upload/${userId}?signature=placeholder`;
    await this.prisma.user.update({
      where: { id: userId },
      data: { selfieVerificationStatus: 'PENDING', selfieVerificationRequestedAt: new Date() }
    });

    return { uploadUrl, status: 'PENDING' };
  }

  async addPaymentMethod(userId: string, payload: PaymentMethodDto) {
    this.validateTokenizedPaymentMethod(payload);

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        paymentMethod: {
          provider: payload.provider,
          data: payload.data as any,
          nickname: payload.nickname
        }
      }
    });

    await this.logAuditEvent(userId, 'PAYMENT_METHOD_ADDED', userId, { provider: payload.provider });
    return { success: true, paymentMethod: updatedUser.paymentMethod };
  }

  async getPaymentMethod(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found.');
    }
    return { paymentMethod: user.paymentMethod };
  }

  async requestAccountDeletion(userId: string, payload: AccountDeletionRequestDto) {
    const request = await this.prisma.accountDeletionRequest.create({
      data: {
        userId,
        reason: payload.reason ?? null,
        status: 'PENDING'
      }
    });

    await this.logAuditEvent(userId, 'ACCOUNT_DELETION_REQUESTED', userId, { requestId: request.id });
    return { success: true, requestId: request.id };
  }

  private generateNumericCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private validateTokenizedPaymentMethod(payload: PaymentMethodDto) {
    if (!payload.provider || !/^[a-z0-9_-]{2,40}$/i.test(payload.provider)) {
      throw new BadRequestException('Payment provider is invalid.');
    }

    const data = payload.data;
    if (!data || Array.isArray(data) || typeof data !== 'object') {
      throw new BadRequestException('Payment method data must be tokenized provider metadata.');
    }

    const entries = Object.entries(data);
    if (entries.length === 0) {
      throw new BadRequestException('Payment method data is required.');
    }

    for (const [key, value] of entries) {
      const normalizedKey = key.replace(/[^a-z0-9]/gi, '').toLowerCase();
      if (UNSAFE_PAYMENT_METHOD_KEYS.has(normalizedKey)) {
        throw new BadRequestException('Raw card data must not be submitted or stored.');
      }
      if (!SAFE_PAYMENT_METHOD_DATA_KEYS.has(normalizedKey)) {
        throw new BadRequestException(`Unsupported payment method field: ${key}`);
      }
      if (
        value !== null &&
        typeof value !== 'string' &&
        typeof value !== 'boolean'
      ) {
        throw new BadRequestException(`Unsupported payment method value for field: ${key}`);
      }
    }

    const hasTokenReference = entries.some(([key, value]) => {
      const normalizedKey = key.replace(/[^a-z0-9]/gi, '').toLowerCase();
      return ['token', 'reference', 'authorizationcode'].includes(normalizedKey) && typeof value === 'string' && value.trim().length > 0;
    });

    if (!hasTokenReference) {
      throw new BadRequestException('Payment method must include a provider token, reference, or authorization code.');
    }
  }

  private async logAuditEvent(actorId: string, action: string, entityId: string, details: Record<string, unknown>) {
    await this.prisma.auditLog.create({
      data: {
        actorId,
        action,
        entity: 'RIDER',
        entityId,
        payload: { details: details as any }
      }
    });
  }
}
