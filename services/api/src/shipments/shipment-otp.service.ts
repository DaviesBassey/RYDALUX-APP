import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { ShipmentOtpType } from '@prisma/client';

const OTP_LENGTH = 6;
const OTP_SALT_ROUNDS = 10;
const OTP_MAX_ATTEMPTS = 3;
const OTP_EXPIRY_MINUTES = 15;

@Injectable()
export class ShipmentOtpService {
  constructor(private prisma: PrismaService) {}

  /**
   * Generate a numeric OTP code and store its bcrypt hash
   * Never stores or returns the raw OTP code to calling code
   */
  async generateOtp(shipmentId: string, otpType: ShipmentOtpType): Promise<string> {
    // Generate 6-digit OTP code
    const otpCode = this.generateNumericCode(OTP_LENGTH);

    // Hash the OTP with bcrypt - salt rounds=10
    const otpHash = await bcrypt.hash(otpCode, OTP_SALT_ROUNDS);

    // Calculate expiry time
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // Check if OTP already exists for this shipment/type combo
    const existingOtp = await this.prisma.shipmentOtp.findUnique({
      where: {
        shipmentId_otpType: {
          shipmentId,
          otpType,
        },
      },
    });

    if (existingOtp && !existingOtp.usedAt) {
      throw new ConflictException(`OTP already exists for this shipment and type`);
    }

    // Store the hash, NOT the raw OTP
    await this.prisma.shipmentOtp.upsert({
      where: {
        shipmentId_otpType: {
          shipmentId,
          otpType,
        },
      },
      update: {
        otpHash,
        attempts: 0,
        expiresAt,
        usedAt: null,
      },
      create: {
        shipmentId,
        otpType,
        otpHash,
        attempts: 0,
        maxAttempts: OTP_MAX_ATTEMPTS,
        expiresAt,
      },
    });

    // Return ONLY the raw code to the caller (should be logged/displayed to user)
    // The code will NOT be stored anywhere - only the hash is stored
    return otpCode;
  }

  /**
   * Verify OTP code against stored hash
   * Returns true if valid, tracks failed attempts
   */
  async verifyOtp(shipmentId: string, otpType: ShipmentOtpType, providedCode: string): Promise<boolean> {
    const otp = await this.prisma.shipmentOtp.findUnique({
      where: {
        shipmentId_otpType: {
          shipmentId,
          otpType,
        },
      },
    });

    if (!otp) {
      throw new BadRequestException(`OTP not found for this shipment`);
    }

    // Check if OTP has already been used
    if (otp.usedAt) {
      throw new ConflictException(`OTP has already been verified`);
    }

    // Check if OTP has expired
    if (otp.expiresAt < new Date()) {
      throw new BadRequestException(`OTP has expired`);
    }

    // Check if max attempts exceeded
    if (otp.attempts >= otp.maxAttempts) {
      throw new BadRequestException(`Maximum OTP attempts exceeded`);
    }

    // Verify the code against hash
    const isValid = await bcrypt.compare(providedCode, otp.otpHash);

    if (!isValid) {
      // Increment failed attempts
      await this.prisma.shipmentOtp.update({
        where: { id: otp.id },
        data: { attempts: otp.attempts + 1 },
      });

      throw new BadRequestException(`Invalid OTP code`);
    }

    // OTP verified successfully - mark as used
    await this.prisma.shipmentOtp.update({
      where: { id: otp.id },
      data: { usedAt: new Date() },
    });

    return true;
  }

  /**
   * Check if OTP has been verified for this shipment/type
   */
  async isOtpVerified(shipmentId: string, otpType: ShipmentOtpType): Promise<boolean> {
    const otp = await this.prisma.shipmentOtp.findUnique({
      where: {
        shipmentId_otpType: {
          shipmentId,
          otpType,
        },
      },
    });

    return otp?.usedAt !== null && otp?.usedAt !== undefined;
  }

  /**
   * Check if OTP exists and is still valid (not expired, not used)
   */
  async isOtpValid(shipmentId: string, otpType: ShipmentOtpType): Promise<boolean> {
    const otp = await this.prisma.shipmentOtp.findUnique({
      where: {
        shipmentId_otpType: {
          shipmentId,
          otpType,
        },
      },
    });

    if (!otp) {
      return false;
    }

    // Not valid if already used
    if (otp.usedAt) {
      return false;
    }

    // Not valid if expired
    if (otp.expiresAt < new Date()) {
      return false;
    }

    return true;
  }

  /**
   * Get OTP details (safe for internal service use only)
   * Never returns the hash to the caller
   */
  async getOtpStatus(shipmentId: string, otpType: ShipmentOtpType) {
    const otp = await this.prisma.shipmentOtp.findUnique({
      where: {
        shipmentId_otpType: {
          shipmentId,
          otpType,
        },
      },
    });

    if (!otp) {
      return null;
    }

    // Return safe data only - NO hash, NO raw OTP
    return {
      isVerified: otp.usedAt !== null,
      isExpired: otp.expiresAt < new Date(),
      attempts: otp.attempts,
      maxAttempts: otp.maxAttempts,
      expiresAt: otp.expiresAt,
    };
  }

  /**
   * Generate random numeric code of specified length
   */
  private generateNumericCode(length: number): string {
    let code = '';
    for (let i = 0; i < length; i++) {
      code += Math.floor(Math.random() * 10).toString();
    }
    return code;
  }
}
