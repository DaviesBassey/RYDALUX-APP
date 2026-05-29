import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PackageCategory, ShipmentPriority } from '@prisma/client';

interface QuoteInput {
  pickupLatitude: number;
  pickupLongitude: number;
  dropoffLatitude: number;
  dropoffLongitude: number;
  packageCategory: PackageCategory;
  priority: ShipmentPriority;
  declaredValue?: number;
  weight?: number;
}

// Quote configuration
const BASE_FARE = 500; // 500 NGN minimum
const QUOTE_EXPIRY_MINUTES = 30;

// Distance-based pricing (simplified - in km)
const DISTANCE_RATE = 50; // 50 NGN per km

// Package category surcharges
const CATEGORY_SURCHARGES: Record<PackageCategory, number> = {
  DOCUMENT: 0, // No surcharge for documents
  SMALL_PACKAGE: 100,
  MEDIUM_PACKAGE: 200,
  LARGE_PACKAGE: 500,
  FRAGILE: 300, // Additional care required
  HIGH_VALUE: 400, // Insurance/security
  OTHER: 150,
};

// Priority multipliers
const PRIORITY_MULTIPLIERS: Record<ShipmentPriority, number> = {
  STANDARD: 1.0,
  EXPRESS: 1.5, // 50% premium
  SCHEDULED: 0.9, // 10% discount for scheduled
};

@Injectable()
export class ShipmentQuoteService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a shipment quote with fare calculation
   */
  async createQuote(shipmentId: string, quoteInput: QuoteInput): Promise<any> {
    // Validate required fields
    if (!this.isValidCoordinate(quoteInput.pickupLatitude, quoteInput.pickupLongitude)) {
      throw new BadRequestException(`Invalid pickup coordinates`);
    }
    if (!this.isValidCoordinate(quoteInput.dropoffLatitude, quoteInput.dropoffLongitude)) {
      throw new BadRequestException(`Invalid dropoff coordinates`);
    }

    // Calculate distance (Haversine formula approximation)
    const distanceKm = this.calculateDistance(
      quoteInput.pickupLatitude,
      quoteInput.pickupLongitude,
      quoteInput.dropoffLatitude,
      quoteInput.dropoffLongitude,
    );

    // Calculate fare components
    const baseFare = BASE_FARE;
    const distanceFare = distanceKm * DISTANCE_RATE;
    const categoryFare = CATEGORY_SURCHARGES[quoteInput.packageCategory] || 0;

    // Apply weight surcharge if provided (10 NGN per kg, min 0)
    const weightFare = quoteInput.weight ? Math.max(0, quoteInput.weight * 10) : 0;

    // Apply priority multiplier
    const priorityMultiplier = PRIORITY_MULTIPLIERS[quoteInput.priority] || 1.0;

    // Calculate total before multiplier
    const subtotal = baseFare + distanceFare + categoryFare + weightFare;

    // Apply surge multiplier
    const surgeMultiplier = this.calculateSurgeMultiplier();

    // Calculate total fare
    const totalFare = Math.ceil(subtotal * priorityMultiplier * surgeMultiplier);

    // Calculate expiry
    const expiresAt = new Date(Date.now() + QUOTE_EXPIRY_MINUTES * 60 * 1000);

    // Save quote to database
    const quote = await this.prisma.shipmentQuote.create({
      data: {
        shipmentId,
        baseFare,
        distanceFare,
        weightFare,
        surgeMultiplier,
        totalFare,
        expiresAt,
      },
    });

    // Update shipment with quoted fare
    await this.prisma.shipment.update({
      where: { id: shipmentId },
      data: {
        quotedFare: totalFare,
      },
    });

    return {
      id: quote.id,
      baseFare,
      distanceFare,
      categoryFare,
      weightFare,
      surgeMultiplier,
      totalFare,
      distance: Number(distanceKm.toFixed(2)),
      expiresAt,
    };
  }

  /**
   * Validate that quote exists and hasn't expired
   */
  async validateQuote(shipmentId: string): Promise<boolean> {
    const quote = await this.prisma.shipmentQuote.findUnique({
      where: { shipmentId },
    });

    if (!quote) {
      throw new BadRequestException(`Quote not found for shipment`);
    }

    if (quote.expiresAt < new Date()) {
      throw new BadRequestException(`Quote has expired`);
    }

    if (quote.acceptedAt) {
      throw new BadRequestException(`Quote has already been accepted`);
    }

    return true;
  }

  /**
   * Mark quote as accepted (when shipment is created)
   */
  async acceptQuote(shipmentId: string): Promise<void> {
    const quote = await this.prisma.shipmentQuote.findUnique({
      where: { shipmentId },
    });

    if (!quote) {
      throw new BadRequestException(`Quote not found`);
    }

    if (quote.acceptedAt) {
      throw new BadRequestException(`Quote already accepted`);
    }

    if (quote.expiresAt < new Date()) {
      throw new BadRequestException(`Quote has expired`);
    }

    await this.prisma.shipmentQuote.update({
      where: { id: quote.id },
      data: { acceptedAt: new Date() },
    });
  }

  /**
   * Get quote details for shipment
   */
  async getQuote(shipmentId: string): Promise<any> {
    const quote = await this.prisma.shipmentQuote.findUnique({
      where: { shipmentId },
    });

    if (!quote) {
      return null;
    }

    return {
      id: quote.id,
      baseFare: quote.baseFare,
      distanceFare: quote.distanceFare,
      weightFare: quote.weightFare,
      surgeMultiplier: quote.surgeMultiplier,
      totalFare: quote.totalFare,
      isExpired: quote.expiresAt < new Date(),
      isAccepted: quote.acceptedAt !== null,
      expiresAt: quote.expiresAt,
    };
  }

  /**
   * Validate coordinate is within valid range
   */
  private isValidCoordinate(latitude: number, longitude: number): boolean {
    return (
      !isNaN(latitude) &&
      !isNaN(longitude) &&
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180
    );
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   * Returns distance in kilometers
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Calculate surge multiplier based on time/demand
   * Placeholder - in production would check current demand/time
   */
  private calculateSurgeMultiplier(): number {
    // TODO: Implement demand-based surge pricing
    // For now, always return 1.0 (no surge)
    return 1.0;
  }
}
