import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { haversineDistanceMeters } from './utils/haversine';
import { CreateFareQuoteDto } from './dto/create-fare-quote.dto';
import { randomUUID } from 'crypto';

const BASE_FARE = 200; // NGN
const PER_KM = 50; // per km
const PER_MIN = 10; // per minute
const BOOKING_FEE = 100; // NGN
const MINIMUM_FARE = 400; // NGN
const QUOTE_TTL_SECONDS = 5 * 60; // 5 minutes
const LAGOS_ZONE_RADIUS_METERS = 30000; // fallback radius for Lagos zones

@Injectable()
export class FareService {
  constructor(private prisma: PrismaService) {}

  validateCoordinates(lat: number, lng: number) {
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw new BadRequestException('Invalid coordinates');
    }
  }

  private async ensureLagosZoneCoverage(pickupLatitude: number, pickupLongitude: number, dropoffLatitude: number, dropoffLongitude: number) {
    const zones = await this.prisma.cityZone.findMany({
      where: { city: { equals: 'LAGOS', mode: 'insensitive' }, isActive: true }
    });

    if (!zones.length) {
      return { pickupZone: null, dropoffZone: null };
    }

    const pickupZone = this.findNearestCityZone(pickupLatitude, pickupLongitude, zones);
    const dropoffZone = this.findNearestCityZone(dropoffLatitude, dropoffLongitude, zones);

    if (!pickupZone || !dropoffZone) {
      throw new BadRequestException('Pickup and dropoff must be within supported Lagos city zones.');
    }

    return { pickupZone, dropoffZone };
  }

  private findNearestCityZone(latitude: number, longitude: number, zones: any[]) {
    let nearest = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const zone of zones) {
      const distance = haversineDistanceMeters(latitude, longitude, zone.centerLatitude, zone.centerLongitude);
      if (distance < bestDistance) {
        bestDistance = distance;
        nearest = zone;
      }
    }

    return bestDistance <= LAGOS_ZONE_RADIUS_METERS ? nearest : null;
  }

  private calculateSurge() {
    return 1.0;
  }

  private calculateAirportSurcharge() {
    return 0.0;
  }

  async calculateFare(payload: CreateFareQuoteDto) {
    this.validateCoordinates(payload.pickupLatitude, payload.pickupLongitude);
    this.validateCoordinates(payload.dropoffLatitude, payload.dropoffLongitude);

    const distanceMeters = haversineDistanceMeters(payload.pickupLatitude, payload.pickupLongitude, payload.dropoffLatitude, payload.dropoffLongitude);
    if (distanceMeters < 10) {
      throw new BadRequestException('Pickup and dropoff locations must be different.');
    }

    const { pickupZone, dropoffZone } = await this.ensureLagosZoneCoverage(payload.pickupLatitude, payload.pickupLongitude, payload.dropoffLatitude, payload.dropoffLongitude);

    const distanceKm = distanceMeters / 1000;
    const estimatedMinutes = Math.max(1, Math.round(distanceKm * 2));

    const baseFare = BASE_FARE;
    const distanceFare = Number((distanceKm * PER_KM).toFixed(2));
    const timeFare = estimatedMinutes * PER_MIN;
    const bookingFee = BOOKING_FEE;
    const subtotal = baseFare + distanceFare + timeFare + bookingFee;

    const surge = this.calculateSurge();
    const airportSurcharge = this.calculateAirportSurcharge();

    let promoDiscount = 0.0;
    let promoId = null;
    if (payload.promoCode) {
      const promo = await this.prisma.promoCode.findUnique({ where: { code: payload.promoCode } });
      if (promo && promo.isActive && promo.startsAt <= new Date() && promo.endsAt >= new Date()) {
        promoId = promo.id;
        if (promo.promoType === 'PERCENTAGE') {
          promoDiscount = Number(subtotal) * Number(promo.discountValue) / 100;
        } else if (promo.promoType === 'FIXED_AMOUNT') {
          promoDiscount = Number(promo.discountValue);
        }
      }
    }

    let total = subtotal * surge + airportSurcharge - promoDiscount;
    if (total < MINIMUM_FARE) total = MINIMUM_FARE;

    const created = await this.prisma.fareQuote.create({
      data: {
        id: randomUUID(),
        serviceType: payload.rideCategory,
        baseFare,
        distanceFare: Number(distanceFare.toFixed(2)),
        timeFare,
        surgeFactor: surge,
        taxAmount: 0.0,
        extraFees: airportSurcharge,
        totalFare: Number(total.toFixed(2)),
        pickupLatitude: payload.pickupLatitude,
        pickupLongitude: payload.pickupLongitude,
        dropoffLatitude: payload.dropoffLatitude,
        dropoffLongitude: payload.dropoffLongitude,
        scheduledAt: payload.scheduledTime ? new Date(payload.scheduledTime) : null,
        expiresAt: new Date(Date.now() + QUOTE_TTL_SECONDS * 1000),
        bookingFee,
        minimumFare: MINIMUM_FARE,
        promoCodeId: promoId
      }
    });

    return {
      id: created.id,
      breakdown: {
        baseFare,
        distanceFare: Number(distanceFare.toFixed(2)),
        timeFare,
        bookingFee,
        surge,
        airportSurcharge,
        promoDiscount: Number(promoDiscount.toFixed(2)),
        total: Number(created.totalFare),
        pickupZone: pickupZone?.name ?? null,
        dropoffZone: dropoffZone?.name ?? null
      },
      expiresAt: created.expiresAt
    };
  }

  async getFareQuote(quoteId: string) {
    const quote = await this.prisma.fareQuote.findUnique({ where: { id: quoteId } });
    if (!quote) throw new NotFoundException('Quote not found');
    if (quote.status !== 'ACTIVE') throw new BadRequestException('Quote is no longer active');
    if (quote.expiresAt && quote.expiresAt < new Date()) {
      await this.prisma.fareQuote.update({ where: { id: quoteId }, data: { status: 'EXPIRED' } });
      throw new BadRequestException('Quote expired');
    }
    return quote;
  }

  async consumeQuote(quoteId: string) {
    await this.getFareQuote(quoteId);
    await this.prisma.fareQuote.update({ where: { id: quoteId }, data: { status: 'CONSUMED' } });
    return { success: true };
  }
}
