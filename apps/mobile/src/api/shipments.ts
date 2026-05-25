import { api } from './client';

export type PackageSizeClass = 'SMALL' | 'MEDIUM' | 'LARGE';

export type ShipmentStatus =
  | 'REQUESTED'
  | 'DRIVER_EN_ROUTE'
  | 'AT_PICKUP'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'FAILED';

export type ShipmentProof = {
  id: string;
  proofType: string;
  url: string;
  notes: string | null;
  submittedBy: string;
  submittedAt: string;
};

export type ShipmentFare = {
  id: string;
  totalFare: string;
  baseFare: string;
  distanceFare: string;
  timeFare: string;
  bookingFee: string;
  surgeFactor: string;
  serviceType: string;
};

export type ShipmentPerson = {
  id: string;
  name: string | null;
  phone: string | null;
};

export type ShipmentVehicle = {
  id: string;
  registrationNumber: string;
  vehicleType: string;
  make: string;
  model: string;
  color: string;
  year: number;
};

export type ShipmentLocation = {
  address: string;
  latitude: number;
  longitude: number;
};

export type Shipment = {
  id: string;
  tripId: string;
  reference: string;
  status: ShipmentStatus;
  tripStatus: string;
  senderName: string;
  recipientName: string;
  recipientPhone: string;
  packageDescription: string | null;
  packageSizeClass: PackageSizeClass;
  specialInstructions: string | null;
  pickup: ShipmentLocation;
  dropoff: ShipmentLocation;
  fare: ShipmentFare | null;
  payment: { id: string; amount: string; currency: string; status: string } | null;
  rider: ShipmentPerson | null;
  driver: ShipmentPerson | null;
  vehicle: ShipmentVehicle | null;
  proofs: ShipmentProof[];
  deliveredAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ShipmentQuote = {
  id: string;
  breakdown: {
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
  expiresAt: string;
  packageSizeClass: PackageSizeClass;
};

export type ShipmentPin = {
  pin: string;
  expiresAt: string;
};

export async function getShipmentQuote(params: {
  pickupLatitude: number;
  pickupLongitude: number;
  dropoffLatitude: number;
  dropoffLongitude: number;
  packageSizeClass: PackageSizeClass;
  promoCode?: string;
}): Promise<ShipmentQuote> {
  const { data } = await api.post<ShipmentQuote>('/shipments/quote', params);
  return data;
}

export async function createShipment(params: {
  fareQuoteId: string;
  pickupAddress: string;
  dropoffAddress: string;
  senderName: string;
  recipientName: string;
  recipientPhone: string;
  packageDescription?: string;
  packageSizeClass: PackageSizeClass;
  specialInstructions?: string;
}): Promise<Shipment> {
  const { data } = await api.post<Shipment>('/shipments', params);
  return data;
}

export async function getActiveShipment(): Promise<Shipment | null> {
  const { data } = await api.get<{ shipment: Shipment | null }>('/shipments/active');
  return data.shipment;
}

export async function getShipment(shipmentId: string): Promise<Shipment> {
  const { data } = await api.get<Shipment>(`/shipments/${shipmentId}`);
  return data;
}

export async function getShipmentCodes(shipmentId: string): Promise<ShipmentPin> {
  const { data } = await api.get<ShipmentPin>(`/shipments/${shipmentId}/codes`);
  return data;
}

export const TERMINAL_SHIPMENT_STATUSES: ShipmentStatus[] = [
  'DELIVERED',
  'CANCELLED',
  'FAILED',
];

export const PIN_VISIBLE_SHIPMENT_STATUSES: ShipmentStatus[] = [
  'DRIVER_EN_ROUTE',
  'AT_PICKUP',
];

export const RIDER_CANCELLABLE_SHIPMENT_STATUSES: ShipmentStatus[] = [
  'REQUESTED',
  'DRIVER_EN_ROUTE',
  'AT_PICKUP',
];

// ── Driver ───────────────────────────────────────────────────────────────────

export type AvailableShipment = {
  id: string;
  tripId: string;
  reference: string;
  status: ShipmentStatus;
  packageSizeClass: PackageSizeClass;
  packageDescription: string | null;
  recipientName: string;
  specialInstructions: string | null;
  pickup: ShipmentLocation;
  dropoff: ShipmentLocation;
  fare: { totalFare: string } | null;
  createdAt: string;
};

export async function getAvailableShipments(): Promise<{ shipments: AvailableShipment[] }> {
  const { data } = await api.get<{ shipments: AvailableShipment[] }>('/shipments/driver/available');
  return data;
}

export async function getDriverActiveShipment(): Promise<Shipment | null> {
  const { data } = await api.get<{ shipment: Shipment | null }>('/shipments/driver/active');
  return data.shipment;
}

export async function acceptShipment(shipmentId: string): Promise<Shipment> {
  const { data } = await api.post<Shipment>(`/shipments/${shipmentId}/driver/accept`);
  return data;
}

export async function arriveAtPickup(shipmentId: string): Promise<{ success: boolean; status: string; tripStatus: string }> {
  const { data } = await api.post(`/shipments/${shipmentId}/arrive-pickup`);
  return data;
}

export async function confirmPickup(shipmentId: string, pin: string): Promise<{ success: boolean; status: string; tripStatus: string }> {
  const { data } = await api.post(`/shipments/${shipmentId}/confirm-pickup`, { pin });
  return data;
}

export async function submitShipmentProof(
  shipmentId: string,
  dto: { url: string; proofType?: string; notes?: string }
): Promise<ShipmentProof> {
  const { data } = await api.post<ShipmentProof>(`/shipments/${shipmentId}/proofs`, dto);
  return data;
}

export async function confirmDelivery(shipmentId: string): Promise<{ success: boolean; status: string; tripStatus: string; deliveredAt: string }> {
  const { data } = await api.post(`/shipments/${shipmentId}/confirm-delivery`);
  return data;
}
