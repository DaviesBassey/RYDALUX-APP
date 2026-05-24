import { api } from './client';

export type TripStatus =
  | 'DRAFT'
  | 'QUOTED'
  | 'REQUESTED'
  | 'DRIVER_ASSIGNED'
  | 'DRIVER_ARRIVING'
  | 'DRIVER_ARRIVED'
  | 'PIN_VERIFIED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED_BY_RIDER'
  | 'CANCELLED_BY_DRIVER'
  | 'EXPIRED'
  | 'DISPUTED';

export type TripVehicle = {
  id: string;
  registrationNumber: string;
  vehicleType: string;
  make: string;
  model: string;
  color: string;
  year: number;
};

export type TripPerson = {
  id: string;
  name: string | null;
  phone: string | null;
};

export type Trip = {
  id: string;
  reference: string;
  status: TripStatus;
  serviceType: string;
  pickup: { address: string; latitude: number; longitude: number };
  dropoff: { address: string; latitude: number; longitude: number };
  fare: {
    id: string;
    totalFare: string;
    baseFare: string;
    distanceFare: string;
    timeFare: string;
    bookingFee: string;
    surgeFactor: string;
    serviceType: string;
  } | null;
  payment: { id: string; amount: string; currency: string; status: string } | null;
  rider: TripPerson | null;
  driver: TripPerson | null;
  vehicle: TripVehicle | null;
  scheduledAt: string | null;
  acceptedAt: string | null;
  startedAt: string | null;
  arrivedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  distanceMeters: number | null;
  durationSeconds: number | null;
  createdAt: string;
  updatedAt: string;
};

export type TripPin = {
  pin: string;
  expiresAt: string;
};

export async function createTrip(params: {
  fareQuoteId: string;
  pickupAddress: string;
  dropoffAddress: string;
}): Promise<Trip> {
  const { data } = await api.post<Trip>('/trips', params);
  return data;
}

export async function getTrip(tripId: string): Promise<Trip> {
  const { data } = await api.get<Trip>(`/trips/${tripId}`);
  return data;
}

export async function getActiveTrip(): Promise<Trip | null> {
  const { data } = await api.get<{ trip: Trip | null }>('/trips/rider/active');
  return data.trip;
}

export async function getTripPin(tripId: string): Promise<TripPin> {
  const { data } = await api.get<TripPin>(`/trips/${tripId}/pin`);
  return data;
}

export async function cancelTrip(tripId: string): Promise<Trip> {
  const { data } = await api.post<Trip>(`/trips/${tripId}/transition`, {
    nextState: 'CANCELLED_BY_RIDER',
    reason: 'Cancelled by rider',
  });
  return data;
}

export const TERMINAL_STATUSES: TripStatus[] = [
  'COMPLETED',
  'CANCELLED_BY_RIDER',
  'CANCELLED_BY_DRIVER',
  'EXPIRED',
  'DISPUTED',
];

export const PIN_VISIBLE_STATUSES: TripStatus[] = [
  'DRIVER_ASSIGNED',
  'DRIVER_ARRIVING',
  'DRIVER_ARRIVED',
];

export const RIDER_CANCELLABLE_STATUSES: TripStatus[] = [
  'REQUESTED',
  'DRIVER_ASSIGNED',
  'DRIVER_ARRIVING',
  'DRIVER_ARRIVED',
  'PIN_VERIFIED',
];
