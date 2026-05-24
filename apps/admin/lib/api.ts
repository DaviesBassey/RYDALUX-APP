const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface AdminLoginRequest {
  email: string;
  password: string;
  fingerprint: string;
  deviceName?: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface HealthResponse {
  status: string;
  timestamp: string;
}

export interface KycItem {
  id: string;
  userId: string;
  status: string;
  provider: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  reviewedById: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
  };
}

export interface KycPendingResponse {
  items: KycItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface DriverDocumentItem {
  id: string;
  userId: string;
  documentType: string;
  status: string;
  documentUrl: string;
  issuedAt: string | null;
  expiresAt: string | null;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
  };
}

export interface VehicleDocumentItem {
  id: string;
  vehicleId: string;
  documentType: string;
  status: string;
  documentUrl: string;
  issuedAt: string | null;
  expiresAt: string | null;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
  vehicle: {
    id: string;
    registrationNumber: string;
    make: string;
    model: string;
    driverProfileId: string;
  };
}

export interface DriverDocumentsPendingResponse {
  driverDocuments: {
    items: DriverDocumentItem[];
    total: number;
  };
  vehicleDocuments: {
    items: VehicleDocumentItem[];
    total: number;
  };
  limit: number;
  offset: number;
}

export interface VehicleItem {
  id: string;
  driverProfileId: string;
  registrationNumber: string;
  make: string;
  model: string;
  year: number;
  color: string;
  capacity: number;
  vehicleType: string;
  status: string;
  approvedAt: string | null;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
  driverProfile: {
    id: string;
    userId: string;
    user: {
      id: string;
      email: string;
      firstName: string | null;
      lastName: string | null;
      phone: string | null;
    };
  };
}

export interface VehiclesPendingResponse {
  items: VehicleItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface AuditLogItem {
  id: string;
  actorId: string | null;
  action: string;
  entity: string;
  entityId: string;
  payload: any;
  createdAt: string;
}

async function fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_access_token') : null;
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.error?.message || err.message || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export interface SosEventItem {
  id: string;
  type: string;
  status: string;
  latitude: number;
  longitude: number;
  notes: string | null;
  triggeredAt: string;
  resolvedAt: string | null;
  user: { id: string; displayName: string | null; phone: string | null };
  trip: { id: string; reference: string; status: string } | null;
}

export interface SosEventsResponse {
  items: SosEventItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface IncidentItem {
  id: string;
  tripId: string;
  severity: string;
  status: string;
  description: string;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  reportedBy: { id: string; displayName: string | null };
  trip: { id: string; reference: string; status: string } | null;
}

export interface IncidentsResponse {
  items: IncidentItem[];
  total: number;
  limit: number;
  offset: number;
}

export const api = {
  login: (body: AdminLoginRequest) => fetchJson<TokenResponse>('/auth/admin/login', { method: 'POST', body: JSON.stringify(body) }),
  health: () => fetchJson<HealthResponse>('/health'),
  getPendingKyc: (limit = 20, offset = 0) => fetchJson<KycPendingResponse>(`/admin/kyc/pending?limit=${limit}&offset=${offset}`),
  getPendingDriverDocuments: (limit = 20, offset = 0) => fetchJson<DriverDocumentsPendingResponse>(`/admin/drivers/documents/pending?limit=${limit}&offset=${offset}`),
  getPendingVehicles: (limit = 20, offset = 0) => fetchJson<VehiclesPendingResponse>(`/admin/vehicles/pending?limit=${limit}&offset=${offset}`),
  approveKyc: (userId: string, comment?: string) => fetchJson<{ success: boolean }>('/admin/kyc/approve', { method: 'POST', body: JSON.stringify({ userId, comment }) }),
  reviewDriverDocument: (documentId: string, action: 'approve' | 'reject', rejectionReason?: string) =>
    fetchJson<{ success: boolean }>(`/admin/drivers/documents/${documentId}/review`, { method: 'POST', body: JSON.stringify({ action, rejectionReason }) }),
  reviewVehicle: (vehicleId: string, action: 'approve' | 'reject' | 'suspend' | 'reactivate', rejectionReason?: string) =>
    fetchJson<{ success: boolean }>(`/admin/vehicles/${vehicleId}/review`, { method: 'POST', body: JSON.stringify({ action, rejectionReason }) }),
  getAuditLogs: () => fetchJson<AuditLogItem[]>('/admin/audit-logs'),
  getSosEvents: (limit = 20, offset = 0) => fetchJson<SosEventsResponse>(`/admin/sos-events?limit=${limit}&offset=${offset}`),
  getIncidents: (limit = 20, offset = 0) => fetchJson<IncidentsResponse>(`/admin/incidents?limit=${limit}&offset=${offset}`),
  resolveSosEvent: (id: string, notes?: string) => fetchJson<{ success: boolean }>(`/admin/sos-events/${id}/resolve`, { method: 'PATCH', body: JSON.stringify({ notes }) }),
  updateIncidentStatus: (id: string, status: string) => fetchJson<{ success: boolean }>(`/admin/incidents/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  reportIncident: (tripId: string, description: string, severity?: string) =>
    fetchJson<{ success: boolean; incidentId?: string }>('/admin/incidents/report', { method: 'POST', body: JSON.stringify({ tripId, description, severity }) }),

  // Finance
  getFinanceSummary: () => fetchJson<any>('/admin/finance/summary'),
  getFinancePayments: (limit = 20, offset = 0) => fetchJson<any>(`/admin/finance/payments?limit=${limit}&offset=${offset}`),
  getFinancePayouts: (limit = 20, offset = 0) => fetchJson<any>(`/admin/finance/payouts?limit=${limit}&offset=${offset}`),
  getFinanceLedger: (limit = 20, offset = 0) => fetchJson<any>(`/admin/finance/ledger?limit=${limit}&offset=${offset}`),
  getFinanceWallets: (limit = 20, offset = 0) => fetchJson<any>(`/admin/finance/wallets?limit=${limit}&offset=${offset}`),
  getFinanceReconciliation: () => fetchJson<any>('/admin/finance/reconciliation'),
};
