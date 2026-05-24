import { api } from './client';

export type ServiceType = 'REGULAR' | 'PREMIUM' | 'SCHEDULED';

export type FareBreakdown = {
  baseFare: number;
  distanceFare: number;
  timeFare: number;
  bookingFee: number;
  surge: number;
  airportSurcharge: number;
  promoDiscount: number;
  total: number;
  pickupZone: string | null;
  dropoffZone: string | null;
};

export type FareQuote = {
  id: string;
  breakdown: FareBreakdown;
  expiresAt: string;
};

export type CreateFareQuoteParams = {
  pickupLatitude: number;
  pickupLongitude: number;
  dropoffLatitude: number;
  dropoffLongitude: number;
  rideCategory: ServiceType;
  promoCode?: string;
};

export async function createFareQuote(params: CreateFareQuoteParams): Promise<FareQuote> {
  const { data } = await api.post<FareQuote>('/fare/quote', params);
  return data;
}
