export interface MockDriver {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  profilePictureUrl: string | null;
  approvalStatus: 'PENDING_ONBOARDING' | 'PENDING_REVIEW' | 'APPROVED' | 'SUSPENDED' | 'REJECTED';
  createdAt: string;
  rating?: number;
  completedTrips?: number;
}

export interface MockVehicle {
  id: string;
  registrationNumber: string;
  make: string;
  model: string;
  year: number;
  color: string;
  capacity: number;
  vehicleType: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'SUSPENDED';
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  documents: { type: string; status: string; uploadedAt: string }[];
}

export interface MockLocation {
  title: string;
  address: string;
  lat: number;
  lng: number;
}

export interface MockTripRequest {
  id: string;
  riderId: string;
  riderName: string;
  riderRating?: number;
  pickupLocation: MockLocation;
  dropoffLocation: MockLocation;
  estimatedFare: number;
  distance: number; // in meters
  eta: number; // in seconds
  rideCategory: string;
  createdAt: string;
  expiresAt: string;
}

export interface MockTrip {
  id: string;
  riderId: string;
  riderName: string;
  riderRating?: number;
  riderPhone: string;
  pickupLocation: MockLocation;
  dropoffLocation: MockLocation;
  fare: { baseFare: number; distanceFare: number; timeFare: number; total: number };
  status: string;
  acceptedAt: string;
  completedAt?: string;
  earnings: number;
  durationMinutes: number;
  distanceKm: number;
}

export interface MockEarnings {
  date: string;
  tripId: string;
  riderName: string;
  pickupLocation: string;
  dropoffLocation: string;
  amount: number;
  status: 'completed' | 'pending';
}

export interface MockPayout {
  id: string;
  amount: number;
  status: 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'PROCESSING' | 'PAID' | 'FAILED' | 'CANCELLED';
  requestedDate: string;
  processedDate?: string;
  accountNumberMasked: string;
  bankName: string;
}

export interface MockDocument {
  id: string;
  documentType: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'EXPIRED';
  uploadedAt: string;
  expiryDate?: string;
  verificationUrl?: string;
}

// Mock driver data
export const MOCK_DRIVER: MockDriver = {
  id: 'driver-1',
  firstName: 'Amara',
  lastName: 'Okafor',
  phone: '08012345678',
  email: 'amara.okafor@example.com',
  profilePictureUrl: null,
  approvalStatus: 'APPROVED',
  createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days ago
  rating: 4.8,
  completedTrips: 342,
};

// Mock vehicle data
export const MOCK_VEHICLE: MockVehicle = {
  id: 'vehicle-1',
  registrationNumber: 'ABC 123XY',
  make: 'Toyota',
  model: 'Camry',
  year: 2020,
  color: 'Silver',
  capacity: 4,
  vehicleType: 'SEDAN',
  status: 'APPROVED',
  approvalStatus: 'APPROVED',
  documents: [
    { type: 'REGISTRATION', status: 'VERIFIED', uploadedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString() },
    { type: 'INSURANCE', status: 'VERIFIED', uploadedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString() },
    { type: 'ROADWORTHINESS', status: 'VERIFIED', uploadedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() },
  ],
};

// Mock locations for trip requests
export const MOCK_PICKUP: MockLocation = {
  title: 'Lekki Phase 1',
  address: '123 Admiralty Way, Lekki Phase 1, Lagos',
  lat: 6.4281,
  lng: 3.4653,
};

export const MOCK_DROPOFF: MockLocation = {
  title: 'Victoria Island',
  address: '45 Ligali Ayorinde Street, Victoria Island, Lagos',
  lat: 6.4321,
  lng: 3.4256,
};

// Mock trip request
export function getMockTripRequest(tripId?: string): MockTripRequest {
  return {
    id: tripId || 'trip-request-1',
    riderId: 'rider-1',
    riderName: 'Chioma Eze',
    riderRating: 4.9,
    pickupLocation: MOCK_PICKUP,
    dropoffLocation: MOCK_DROPOFF,
    estimatedFare: 2500,
    distance: 8400, // meters
    eta: 1200, // seconds (20 minutes)
    rideCategory: 'STANDARD',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 60 * 1000).toISOString(), // expires in 60 seconds
  };
}

// Mock trip
export function getMockTrip(tripId?: string): MockTrip {
  return {
    id: tripId || 'trip-1',
    riderId: 'rider-1',
    riderName: 'Chioma Eze',
    riderRating: 4.9,
    riderPhone: '08087654321',
    pickupLocation: MOCK_PICKUP,
    dropoffLocation: MOCK_DROPOFF,
    fare: {
      baseFare: 1500,
      distanceFare: 800,
      timeFare: 200,
      total: 2500,
    },
    status: 'IN_PROGRESS',
    acceptedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 minutes ago
    earnings: 2500,
    durationMinutes: 18,
    distanceKm: 8.4,
  };
}

// Mock earnings for a specific date
export function getMockEarningsForDate(date: Date): MockEarnings[] {
  const dateStr = date.toISOString().split('T')[0];
  return [
    {
      date: dateStr,
      tripId: 'trip-001',
      riderName: 'Chioma Eze',
      pickupLocation: 'Lekki Phase 1',
      dropoffLocation: 'Victoria Island',
      amount: 2500,
      status: 'completed',
    },
    {
      date: dateStr,
      tripId: 'trip-002',
      riderName: 'Tunde Adeyemi',
      pickupLocation: 'VI',
      dropoffLocation: 'Ikoyi',
      amount: 3200,
      status: 'completed',
    },
    {
      date: dateStr,
      tripId: 'trip-003',
      riderName: 'Ngozi Obi',
      pickupLocation: 'Ajah',
      dropoffLocation: 'Lekki Mall',
      amount: 2800,
      status: 'completed',
    },
  ];
}

// Mock payouts
export function getMockPayouts(): MockPayout[] {
  return [
    {
      id: 'payout-1',
      amount: 45000,
      status: 'PAID',
      requestedDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      processedDate: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000).toISOString(),
      accountNumberMasked: '****5678',
      bankName: 'First Bank',
    },
    {
      id: 'payout-2',
      amount: 52000,
      status: 'PAID',
      requestedDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      processedDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      accountNumberMasked: '****5678',
      bankName: 'First Bank',
    },
    {
      id: 'payout-3',
      amount: 38500,
      status: 'PROCESSING',
      requestedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      accountNumberMasked: '****5678',
      bankName: 'First Bank',
    },
  ];
}

// Mock driver
export function getMockDriver(driverId?: string): MockDriver {
  return {
    ...MOCK_DRIVER,
    id: driverId || MOCK_DRIVER.id,
  };
}

// Mock vehicle
export function getMockVehicle(vehicleId?: string): MockVehicle {
  return {
    ...MOCK_VEHICLE,
    id: vehicleId || MOCK_VEHICLE.id,
  };
}
