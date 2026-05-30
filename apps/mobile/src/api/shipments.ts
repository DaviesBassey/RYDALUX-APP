import { api } from './client';

export type PackageCategory =
  | 'DOCUMENT'
  | 'SMALL_PACKAGE'
  | 'MEDIUM_PACKAGE'
  | 'LARGE_PACKAGE'
  | 'FRAGILE'
  | 'HIGH_VALUE'
  | 'OTHER';

export type ShipmentPriority = 'STANDARD' | 'EXPRESS' | 'SCHEDULED';

export type ShipmentStatus =
  | 'DRAFT'
  | 'QUOTED'
  | 'REQUESTED'
  | 'DRIVER_ASSIGNED'
  | 'PICKUP_ARRIVED'
  | 'PICKUP_VERIFIED'
  | 'IN_TRANSIT'
  | 'DELIVERY_ARRIVED'
  | 'DELIVERY_VERIFIED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'DISPUTED'
  | 'EXPIRED'
  | 'FAILED';

export type ShipmentProof = {
  id: string;
  proofType: string;
  url: string;
  notes: string | null;
  submittedBy: string;
  submittedAt: string;
};

export type ShipmentPhoto = {
  id: string;
  photoType: string;
  fileUrl: string;
  fileSize: number | null;
  mimeType: string | null;
  uploadedAt: string;
};

export type ShipmentTrackingEvent = {
  id: string;
  eventType: string;
  status: ShipmentStatus;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  metadata: any | null;
  createdAt: string;
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
  packageCategory: PackageCategory;
  priority: ShipmentPriority;
  pickupAddress: string;
  pickupLatitude: number;
  pickupLongitude: number;
  dropoffAddress: string;
  dropoffLatitude: number;
  dropoffLongitude: number;
  quotedFare: number | null;
  finalFare: number | null;
  payment: { id: string; amount: string; currency: string; status: string } | null;
  rider?: ShipmentPerson | null;
  driver?: ShipmentPerson | null;
  vehicle?: ShipmentVehicle | null;
  proofs: ShipmentProof[];
  photos?: ShipmentPhoto[];
  trackingEvents?: ShipmentTrackingEvent[];
  deliveredAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ShipmentQuote = {
  id: string;
  shipmentId?: string;
  baseFare: number;
  distanceFare: number;
  weightFare: number;
  surgeMultiplier: number;
  totalFare: number;
  expiresAt: string;
  acceptedAt?: string | null;
};

export type ShipmentPin = {
  pickupOtp?: string;
  deliveryOtp?: string;
  expiresAt?: string;
};

// ── Rider (Customer) Endpoints ───────────────────────────────────────────────

export async function createShipmentQuote(params: {
  pickupLatitude: number;
  pickupLongitude: number;
  dropoffLatitude: number;
  dropoffLongitude: number;
  packageCategory: PackageCategory;
  priority: ShipmentPriority;
  declaredValue?: number;
  weight?: number;
}): Promise<ShipmentQuote> {
  const { data } = await api.post<ShipmentQuote>('/shipments/quote', params);
  return data;
}

// Support alias for older calls if any
export async function getShipmentQuote(params: any): Promise<ShipmentQuote> {
  return createShipmentQuote(params);
}

export async function createShipment(params: {
  quoteId: string;
  pickupAddress: string;
  dropoffAddress: string;
  senderName: string;
  recipientName: string;
  recipientPhone: string;
  packageDescription?: string;
  packageCategory: PackageCategory;
  priority: ShipmentPriority;
  specialInstructions?: string;
}): Promise<Shipment> {
  const { data } = await api.post<Shipment>('/shipments', params);
  return data;
}

export async function listShipments(params?: {
  status?: ShipmentStatus;
  limit?: number;
  offset?: number;
}): Promise<{ items: Shipment[]; total: number }> {
  const { data } = await api.get<{ items: Shipment[]; total: number }>('/shipments', { params });
  return data;
}

export async function getActiveShipment(): Promise<Shipment | null> {
  try {
    const { data } = await api.get<{ shipment: Shipment | null }>('/shipments/active');
    return data.shipment;
  } catch {
    return null;
  }
}

export async function getShipment(shipmentId: string): Promise<Shipment> {
  const { data } = await api.get<Shipment>(`/shipments/${shipmentId}`);
  return data;
}

export async function getShipmentCodes(shipmentId: string): Promise<ShipmentPin> {
  const { data } = await api.get<ShipmentPin>(`/shipments/${shipmentId}/codes`);
  return data;
}

export async function cancelShipment(shipmentId: string, params?: { reason?: string }): Promise<Shipment> {
  const { data } = await api.post<Shipment>(`/shipments/${shipmentId}/cancel`, params || {});
  return data;
}

export async function requestShipmentPhotoUpload(
  shipmentId: string,
  params: { photoType: string; mimeType?: string; fileSize?: number }
): Promise<{ uploadUrl: string; photoId: string }> {
  const { data } = await api.post<{ uploadUrl: string; photoId: string }>(
    `/shipments/${shipmentId}/photos/request-upload`,
    params
  );
  return data;
}

export async function createShipmentSupportTicket(
  shipmentId: string,
  params: { title: string; description: string; priority?: string }
): Promise<any> {
  const { data } = await api.post(`/shipments/${shipmentId}/support-ticket`, params);
  return data;
}

// ── Driver Endpoints ─────────────────────────────────────────────────────────

export type AvailableShipment = {
  id: string;
  tripId: string;
  reference: string;
  status: ShipmentStatus;
  packageCategory: PackageCategory;
  packageDescription: string | null;
  recipientName: string; // Will be scrubbed/masked by the backend
  pickupAddress: string;
  dropoffAddress: string;
  quotedFare: number | null;
  createdAt: string;
};

export async function listAvailableShipments(): Promise<{ shipments: AvailableShipment[] }> {
  const { data } = await api.get<{ shipments: AvailableShipment[] }>('/driver/shipments/available');
  return data;
}

// Support alias for older driver calls
export async function getAvailableShipments(): Promise<{ shipments: AvailableShipment[] }> {
  return listAvailableShipments();
}

export async function getDriverActiveShipment(): Promise<Shipment | null> {
  try {
    const { data } = await api.get<{ shipment: Shipment | null }>('/driver/shipments/active');
    return data.shipment;
  } catch {
    return null;
  }
}

export async function getDriverShipment(shipmentId: string): Promise<Shipment> {
  const { data } = await api.get<Shipment>(`/driver/shipments/${shipmentId}`);
  return data;
}

export async function acceptShipment(shipmentId: string): Promise<Shipment> {
  const { data } = await api.post<Shipment>(`/driver/shipments/${shipmentId}/accept`);
  return data;
}

export async function arrivePickup(shipmentId: string): Promise<Shipment> {
  const { data } = await api.post<Shipment>(`/driver/shipments/${shipmentId}/arrive-pickup`);
  return data;
}

// Support alias
export async function arriveAtPickup(shipmentId: string): Promise<any> {
  return arrivePickup(shipmentId);
}

export async function verifyPickupOtp(shipmentId: string, code: string): Promise<Shipment> {
  const { data } = await api.post<Shipment>(`/driver/shipments/${shipmentId}/verify-pickup-otp`, { code });
  return data;
}

// Support alias
export async function confirmPickup(shipmentId: string, code: string): Promise<any> {
  return verifyPickupOtp(shipmentId, code);
}

export async function startShipment(shipmentId: string): Promise<Shipment> {
  const { data } = await api.post<Shipment>(`/driver/shipments/${shipmentId}/start`);
  return data;
}

export async function arriveDelivery(shipmentId: string): Promise<Shipment> {
  const { data } = await api.post<Shipment>(`/driver/shipments/${shipmentId}/arrive-delivery`);
  return data;
}

export async function verifyDeliveryOtp(shipmentId: string, code: string): Promise<Shipment> {
  const { data } = await api.post<Shipment>(`/driver/shipments/${shipmentId}/verify-delivery-otp`, { code });
  return data;
}

export async function completeShipment(shipmentId: string): Promise<Shipment> {
  const { data } = await api.post<Shipment>(`/driver/shipments/${shipmentId}/complete`);
  return data;
}

// Support alias
export async function confirmDelivery(shipmentId: string): Promise<any> {
  return completeShipment(shipmentId);
}

export async function submitShipmentProof(
  shipmentId: string,
  params: { url: string; notes?: string }
): Promise<ShipmentProof> {
  const { data } = await api.post<ShipmentProof>(`/driver/shipments/${shipmentId}/proof`, params);
  return data;
}

// Helper arrays & checks

export const TERMINAL_SHIPMENT_STATUSES: ShipmentStatus[] = ['DELIVERED', 'CANCELLED', 'FAILED'];

export const ACTIVE_SHIPMENT_STATUSES: ShipmentStatus[] = [
  'REQUESTED',
  'DRIVER_ASSIGNED',
  'PICKUP_ARRIVED',
  'PICKUP_VERIFIED',
  'IN_TRANSIT',
  'DELIVERY_ARRIVED',
  'DELIVERY_VERIFIED',
];

export const CANCELLABLE_SHIPMENT_STATUSES: ShipmentStatus[] = [
  'REQUESTED',
  'DRIVER_ASSIGNED',
  'PICKUP_ARRIVED',
];
