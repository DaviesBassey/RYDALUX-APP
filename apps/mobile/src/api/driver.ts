import { api } from './client';

export type OnboardingStatus = {
  profileExists: boolean;
  fullyApproved: boolean;
};

export type AvailableTrip = {
  id: string;
  reference: string;
  serviceType: string;
  pickup: { address: string; latitude: number; longitude: number };
  dropoff: { address: string };
  fare: number | null;
  createdAt: string;
};

export async function submitDriverProfile(payload: {
  firstName: string;
  lastName: string;
  phone?: string;
}): Promise<void> {
  await api.post('/drivers/onboarding/profile', payload);
}

export async function getOnboardingStatus(): Promise<OnboardingStatus> {
  const { data } = await api.get<OnboardingStatus>('/drivers/onboarding/status');
  return data;
}

export async function activateOnline(): Promise<void> {
  await api.patch('/drivers/onboarding/activate');
}

export async function getAvailableTrips(): Promise<{ trips: AvailableTrip[] }> {
  const { data } = await api.get<{ trips: AvailableTrip[] }>('/trips/driver/available');
  return data;
}

export async function acceptTrip(tripId: string): Promise<any> {
  const { data } = await api.post(`/trips/${tripId}/driver/accept`);
  return data;
}

export async function getDriverActiveTrip(): Promise<{ trip: any | null }> {
  const { data } = await api.get<{ trip: any | null }>('/trips/driver/active');
  return data;
}

export async function transitionTrip(
  tripId: string,
  nextState: string,
  options?: { reason?: string; pin?: string }
): Promise<any> {
  const { data } = await api.post(`/trips/${tripId}/transition`, { nextState, ...options });
  return data;
}

export async function devApproveDriver(userId: string): Promise<void> {
  await api.post(`/dev/driver/approve/${userId}`);
}
