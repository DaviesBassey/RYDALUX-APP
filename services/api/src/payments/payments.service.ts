import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const DRIVER_EARNINGS_RATIO = 0.8; // driver receives 80%, platform retains 20%

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async initiateMockPayment(userId: string, tripId: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        riderProfile: { select: { userId: true } },
        fareQuote: { select: { totalFare: true } },
        payment: { select: { id: true } },
      },
    }) as any;

    if (!trip) throw new NotFoundException('Trip not found.');
    if (!trip.riderProfile || trip.riderProfile.userId !== userId) throw new ForbiddenException('Access denied.');
    if (!trip.fareQuote) throw new BadRequestException('No fare quote for this trip.');
    if (trip.payment) throw new BadRequestException('Payment already exists for this trip.');

    const reference = `RYD-PAY-${Date.now().toString(36).toUpperCase()}`;

    const payment = await this.prisma.payment.create({
      data: {
        userId,
        tripId,
        amount: trip.fareQuote.totalFare,
        currency: 'NGN',
        provider: 'mock-paystack',
        status: 'PENDING',
        reference,
      },
    });

    return {
      id: payment.id,
      tripId: payment.tripId,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      reference: payment.reference,
      provider: payment.provider,
      createdAt: payment.createdAt,
    };
  }

  async getPaymentForTrip(tripId: string, userId: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        riderProfile: { select: { userId: true } },
        payment: true,
      },
    }) as any;

    if (!trip) throw new NotFoundException('Trip not found.');
    if (!trip.riderProfile || trip.riderProfile.userId !== userId) throw new ForbiddenException('Access denied.');

    const p = trip.payment;
    if (!p) {
      return { payment: null };
    }

    return {
      payment: {
        id: p.id,
        tripId,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        provider: p.provider,
        reference: p.reference,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      },
    };
  }

  // Called when driver accepts trip — mock auto-authorize
  async authorizePaymentForTrip(tripId: string): Promise<void> {
    const payment = await this.prisma.payment.findUnique({ where: { tripId } });
    if (!payment) return;
    if (payment.status !== 'PENDING') return;

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'AUTHORIZED', updatedAt: new Date() },
    });
  }

  // Called when trip transitions to COMPLETED.
  // Idempotent — safe to call multiple times.
  async capturePaymentForTrip(tripId: string, driverProfileId: string | null): Promise<void> {
    const payment = await this.prisma.payment.findUnique({ where: { tripId } });
    if (!payment) return;
    if (payment.status === 'CAPTURED') return;
    if (payment.status !== 'PENDING' && payment.status !== 'AUTHORIZED') return;

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'CAPTURED', updatedAt: new Date() },
    });

    if (driverProfileId) {
      // Use integer kobo (1 NGN = 100 kobo) to avoid floating-point errors
      const amountKobo = Math.round(parseFloat(payment.amount.toString()) * 100);
      const driverKobo = Math.floor(amountKobo * DRIVER_EARNINGS_RATIO);
      const driverAmount = (driverKobo / 100).toFixed(2);
      await this.prisma.payout.create({
        data: {
          driverProfileId,
          amount: driverAmount,
          currency: payment.currency,
          provider: payment.provider,
          status: 'PENDING',
        },
      });
    }

    await this.prisma.auditLog.create({
      data: {
        actorId: null,
        action: 'PAYMENT_CAPTURED',
        entity: 'PAYMENT',
        entityId: payment.id,
        payload: { tripId, driverProfileId } as any,
      },
    });
  }

  async getDriverPayouts(userId: string, limit = 20, offset = 0) {
    const driverProfile = await this.prisma.driverProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!driverProfile) throw new NotFoundException('Driver profile not found.');

    const [items, total] = await Promise.all([
      this.prisma.payout.findMany({
        where: { driverProfileId: driverProfile.id },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.payout.count({ where: { driverProfileId: driverProfile.id } }),
    ]);

    return { items, total, limit, offset };
  }

  async listPayments(limit = 20, offset = 0) {
    const [items, total] = await Promise.all([
      this.prisma.payment.findMany({
        include: {
          user: { select: { id: true, displayName: true, phone: true, email: true } },
          trip: { select: { id: true, reference: true, status: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.payment.count(),
    ]);

    return {
      items: items.map((p) => ({
        id: p.id,
        tripId: p.tripId,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        reference: p.reference,
        provider: p.provider,
        createdAt: p.createdAt,
        user: p.user,
        trip: p.trip,
      })),
      total,
      limit,
      offset,
    };
  }

  async listPendingPayouts(limit = 20, offset = 0) {
    const [items, total] = await Promise.all([
      this.prisma.payout.findMany({
        where: { status: { in: ['PENDING', 'PROCESSING'] } },
        include: {
          driverProfile: {
            include: {
              user: { select: { id: true, displayName: true, phone: true, email: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.payout.count({ where: { status: { in: ['PENDING', 'PROCESSING'] } } }),
    ]);

    return {
      items: items.map((p) => ({
        id: p.id,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        provider: p.provider,
        createdAt: p.createdAt,
        driver: {
          id: p.driverProfile.user.id,
          name: p.driverProfile.user.displayName,
          phone: p.driverProfile.user.phone,
          email: p.driverProfile.user.email,
        },
      })),
      total,
      limit,
      offset,
    };
  }

  async getRevenueStats() {
    const [capturedAgg, byStatus, pendingPayoutsAgg, paidPayoutsAgg] = await Promise.all([
      this.prisma.payment.aggregate({
        where: { status: 'CAPTURED' },
        _sum: { amount: true },
        _count: { id: true },
      }),
      this.prisma.payment.groupBy({
        by: ['status'],
        _count: { id: true },
        _sum: { amount: true },
      }),
      this.prisma.payout.aggregate({
        where: { status: { in: ['PENDING', 'PROCESSING'] } },
        _sum: { amount: true },
        _count: { id: true },
      }),
      this.prisma.payout.aggregate({
        where: { status: 'PAID' },
        _sum: { amount: true },
        _count: { id: true },
      }),
    ]);

    const totalCaptured = parseFloat((capturedAgg._sum.amount ?? 0).toString());
    const totalPendingPayouts = parseFloat((pendingPayoutsAgg._sum.amount ?? 0).toString());
    const totalPaidPayouts = parseFloat((paidPayoutsAgg._sum.amount ?? 0).toString());

    return {
      totalCaptured,
      capturedCount: capturedAgg._count.id,
      byStatus: byStatus.map((row) => ({
        status: row.status,
        count: row._count.id,
        total: parseFloat((row._sum.amount ?? 0).toString()),
      })),
      pendingPayouts: {
        total: totalPendingPayouts,
        count: pendingPayoutsAgg._count.id,
      },
      paidPayouts: {
        total: totalPaidPayouts,
        count: paidPayoutsAgg._count.id,
      },
      platformRevenue: Math.round((totalCaptured - totalPaidPayouts - totalPendingPayouts) * 100) / 100,
    };
  }
}
