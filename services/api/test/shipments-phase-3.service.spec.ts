import { Test, TestingModule } from '@nestjs/testing';
import { ShipmentOtpService } from '../src/shipments/shipment-otp.service';
import { ShipmentQuoteService } from '../src/shipments/shipment-quote.service';
import { ShipmentStateMachine } from '../src/shipments/shipment-state-machine';
import { PrismaService } from '../src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

describe('ShipmentOtpService', () => {
  let service: ShipmentOtpService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ShipmentOtpService, PrismaService],
    }).compile();

    service = module.get<ShipmentOtpService>(ShipmentOtpService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('OTP generation and verification', () => {
    it('should generate OTP and store only hash, not raw code', async () => {
      const shipmentId = 'test-shipment-1';
      const code = await service.generateOtp(shipmentId, 'PICKUP');

      // Code should be a 6-digit string
      expect(code).toMatch(/^\d{6}$/);

      // Verify code is 6 digits
      expect(code.length).toBe(6);

      // OTP should be stored in DB with hash only
      const storedOtp = await prisma.shipmentOtp.findUnique({
        where: {
          shipmentId_otpType: {
            shipmentId,
            otpType: 'PICKUP',
          },
        },
      });

      expect(storedOtp).toBeDefined();
      expect(storedOtp.otpHash).toBeDefined();
      // Hash should not equal raw code (bcrypt hash is much longer)
      expect(storedOtp.otpHash).not.toBe(code);
      // Hash should be bcrypt hash (starts with $2a/$2b/$2y)
      expect(storedOtp.otpHash).toMatch(/^\$2[aby]\$/);
    });

    it('should verify OTP with correct code', async () => {
      const shipmentId = 'test-shipment-2';
      const code = await service.generateOtp(shipmentId, 'PICKUP');

      // Verification should succeed with correct code
      const result = await service.verifyOtp(shipmentId, 'PICKUP', code);
      expect(result).toBe(true);
    });

    it('should fail OTP verification with wrong code', async () => {
      const shipmentId = 'test-shipment-3';
      await service.generateOtp(shipmentId, 'PICKUP');

      // Verification should fail with wrong code
      await expect(
        service.verifyOtp(shipmentId, 'PICKUP', '000000'),
      ).rejects.toThrow('Invalid OTP code');
    });

    it('should prevent OTP reuse after verification', async () => {
      const shipmentId = 'test-shipment-4';
      const code = await service.generateOtp(shipmentId, 'PICKUP');

      // First verification should succeed
      await service.verifyOtp(shipmentId, 'PICKUP', code);

      // Second verification with same code should fail
      await expect(
        service.verifyOtp(shipmentId, 'PICKUP', code),
      ).rejects.toThrow('OTP has already been verified');
    });
  });
});

describe('ShipmentQuoteService', () => {
  let service: ShipmentQuoteService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ShipmentQuoteService, PrismaService],
    }).compile();

    service = module.get<ShipmentQuoteService>(ShipmentQuoteService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('Quote creation', () => {
    it('should create quote with valid coordinates and category', async () => {
      const shipmentId = 'test-shipment-quote-1';

      const quote = await service.createQuote(shipmentId, {
        pickupLatitude: 6.5244,
        pickupLongitude: 3.3792,
        dropoffLatitude: 6.4281,
        dropoffLongitude: 3.4653,
        packageCategory: 'SMALL_PACKAGE',
        priority: 'STANDARD',
      });

      expect(quote).toBeDefined();
      expect(quote.totalFare).toBeGreaterThan(0);
      expect(quote.expiresAt).toBeDefined();
      expect(quote.distance).toBeGreaterThan(0);
    });

    it('should reject expired quote', async () => {
      const shipmentId = 'test-shipment-quote-2';

      await service.createQuote(shipmentId, {
        pickupLatitude: 6.5244,
        pickupLongitude: 3.3792,
        dropoffLatitude: 6.4281,
        dropoffLongitude: 3.4653,
        packageCategory: 'SMALL_PACKAGE',
        priority: 'STANDARD',
      });

      // Manually expire the quote
      await prisma.shipmentQuote.update({
        where: { shipmentId },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });

      // Validation should fail for expired quote
      await expect(service.validateQuote(shipmentId)).rejects.toThrow('expired');
    });
  });
});

describe('ShipmentStateMachine', () => {
  describe('State transitions', () => {
    it('should allow valid state transition DRAFT to QUOTED', () => {
      expect(ShipmentStateMachine.canTransition('DRAFT', 'QUOTED')).toBe(true);
    });

    it('should reject invalid state transition DRAFT to DELIVERED', () => {
      expect(ShipmentStateMachine.canTransition('DRAFT', 'DELIVERED')).toBe(false);
    });

    it('should reject transitions from terminal states', () => {
      expect(ShipmentStateMachine.canTransition('DELIVERED', 'CANCELLED')).toBe(false);
      expect(ShipmentStateMachine.canTransition('CANCELLED', 'DELIVERED')).toBe(false);
    });

    it('should validate full lifecycle transition', () => {
      const transitions = [
        { from: 'DRAFT', to: 'QUOTED' },
        { from: 'QUOTED', to: 'REQUESTED' },
        { from: 'REQUESTED', to: 'DRIVER_ASSIGNED' },
        { from: 'DRIVER_ASSIGNED', to: 'PICKUP_ARRIVED' },
        { from: 'PICKUP_ARRIVED', to: 'PICKUP_VERIFIED' },
        { from: 'PICKUP_VERIFIED', to: 'IN_TRANSIT' },
        { from: 'IN_TRANSIT', to: 'DELIVERY_ARRIVED' },
        { from: 'DELIVERY_ARRIVED', to: 'DELIVERY_VERIFIED' },
        { from: 'DELIVERY_VERIFIED', to: 'DELIVERED' },
      ] as const;

      transitions.forEach(({ from, to }) => {
        expect(ShipmentStateMachine.canTransition(from as any, to as any)).toBe(true);
      });
    });

    it('should identify terminal states correctly', () => {
      expect(ShipmentStateMachine.isTerminalState('DELIVERED')).toBe(true);
      expect(ShipmentStateMachine.isTerminalState('CANCELLED')).toBe(true);
      expect(ShipmentStateMachine.isTerminalState('DISPUTED')).toBe(true);
      expect(ShipmentStateMachine.isTerminalState('EXPIRED')).toBe(true);
      expect(ShipmentStateMachine.isTerminalState('REQUESTED')).toBe(false);
    });

    it('should validate cancellation rules', () => {
      expect(ShipmentStateMachine.canBeCancelled('DRAFT')).toBe(true);
      expect(ShipmentStateMachine.canBeCancelled('REQUESTED')).toBe(true);
      expect(ShipmentStateMachine.canBeCancelled('IN_TRANSIT')).toBe(true);
      expect(ShipmentStateMachine.canBeCancelled('DELIVERED')).toBe(false);
      expect(ShipmentStateMachine.canBeCancelled('CANCELLED')).toBe(false);
    });

    it('should throw on invalid assertTransition', () => {
      expect(() =>
        ShipmentStateMachine.assertTransition('DELIVERED', 'CANCELLED'),
      ).toThrow(/Invalid state transition/);
    });
  });
});
