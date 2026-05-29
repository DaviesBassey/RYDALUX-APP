import type { FareBreakdownDisplay } from '../components/rider';

export type MockLocation = {
  title: string;
  address: string;
  lat: number;
  lng: number;
};

export type MockTrip = {
  id: string;
  reference: string;
  pickup: MockLocation;
  dropoff: MockLocation;
  status: string;
  category: string;
  date: string;
  distanceMeters: number;
  durationSeconds: number;
  fare: FareBreakdownDisplay;
  driver: {
    name: string;
    rating: string;
    phone: string;
  };
  vehicle: {
    model: string;
    color: string;
    plate: string;
  };
  payment: {
    brand: string;
    last4: string;
    status: string;
  };
  pin: string;
  eta: string;
};

export type MockTicket = {
  id: string;
  title: string;
  status: 'OPEN' | 'IN_REVIEW' | 'RESOLVED';
  date: string;
};

export const MOCK_PICKUP: MockLocation = {
  title: 'Current pickup',
  address: 'Eko Hotel roundabout, Victoria Island',
  lat: 6.4281,
  lng: 3.4219,
};

export const MOCK_DROPOFF: MockLocation = {
  title: 'Destination',
  address: 'Murtala Muhammed Airport Terminal 2',
  lat: 6.5849,
  lng: 3.3246,
};

export const MOCK_RECENT_LOCATIONS: MockLocation[] = [
  { title: 'Ikoyi Club', address: '6 Ikoyi Club 1938 Road, Ikoyi', lat: 6.4521, lng: 3.4333 },
  { title: 'Lekki Phase 1', address: 'Admiralty Way, Lekki Phase 1', lat: 6.4474, lng: 3.4723 },
  { title: 'The Wheatbaker', address: '4 Lawrence Road, Ikoyi', lat: 6.4495, lng: 3.4441 },
];

export const MOCK_FARE: FareBreakdownDisplay = {
  baseFare: 1800,
  distanceFare: 7200,
  timeFare: 2100,
  bookingFee: 900,
  safetyFee: 350,
  total: 12350,
};

export const MOCK_TRIPS: MockTrip[] = [
  {
    id: 'trip_lagos_airport',
    reference: 'RYD-21-0842',
    pickup: MOCK_PICKUP,
    dropoff: MOCK_DROPOFF,
    status: 'COMPLETED',
    category: 'Executive',
    date: '2026-05-27T14:20:00.000Z',
    distanceMeters: 24300,
    durationSeconds: 2380,
    fare: MOCK_FARE,
    driver: { name: 'Tunde Adebayo', rating: '4.94', phone: '+234 801 000 2211' },
    vehicle: { model: 'Mercedes-Benz E-Class', color: 'Obsidian Black', plate: 'LND 842 QX' },
    payment: { brand: 'Visa', last4: '4242', status: 'PAID' },
    pin: '482913',
    eta: '4 min',
  },
  {
    id: 'trip_lekki_ikoyi',
    reference: 'RYD-21-0791',
    pickup: MOCK_RECENT_LOCATIONS[1],
    dropoff: MOCK_RECENT_LOCATIONS[0],
    status: 'COMPLETED',
    category: 'Comfort',
    date: '2026-05-22T18:45:00.000Z',
    distanceMeters: 9800,
    durationSeconds: 1340,
    fare: { baseFare: 1200, distanceFare: 3600, timeFare: 1200, bookingFee: 650, total: 6650 },
    driver: { name: 'Kelechi Okafor', rating: '4.89', phone: '+234 802 000 8890' },
    vehicle: { model: 'Toyota Camry', color: 'Pearl White', plate: 'EKY 219 BC' },
    payment: { brand: 'Mastercard', last4: '1188', status: 'PAID' },
    pin: '714205',
    eta: '6 min',
  },
];

export const MOCK_SUPPORT_TICKETS: MockTicket[] = [
  { id: 'ticket_103', title: 'Receipt request for airport ride', status: 'RESOLVED', date: '2026-05-27T17:30:00.000Z' },
  { id: 'ticket_104', title: 'Driver arrival clarification', status: 'IN_REVIEW', date: '2026-05-28T08:10:00.000Z' },
];

export const MOCK_CONTACTS = [
  { id: 'contact_1', name: 'Ada Bassey', phone: '+234 803 410 0091' },
  { id: 'contact_2', name: 'David Okon', phone: '+234 806 232 7781' },
];

export const getMockTrip = (tripId?: string) => MOCK_TRIPS.find((trip) => trip.id === tripId) ?? MOCK_TRIPS[0];
