import { api } from './client';

// Shape returned by GET /rider/profile — the top-level object is the User,
// and riderProfile is the separate RiderProfile entity (null until profile setup completes).
export type UserProfileResponse = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  phone: string;
  email: string;
  riderProfile: { id: string; userId: string } | null;
};

export type CreateRiderProfileParams = {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
};

export async function getRiderProfile(): Promise<UserProfileResponse> {
  const { data } = await api.get('/rider/profile');
  return data;
}

export async function createRiderProfile(params: CreateRiderProfileParams) {
  const { data } = await api.post('/rider/profile', params);
  return data;
}
