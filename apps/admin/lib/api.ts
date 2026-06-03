import { getAdminAccessToken, getAdminRefreshToken, getAdminFingerprint, setAdminTokens, clearAdminTokens } from './auth';

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
    firstName: string;
    lastName: string;
    phone: string;
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
    firstName: string;
    lastName: string;
    phone: string;
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
      firstName: string;
      lastName: string;
      phone: string;
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

export interface UserItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: string;
  status: string;
  createdAt: string | null;
  lastLogin: string | null;
}

export interface RiderItem {
  id: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  displayName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TripItem {
  id: string;
  reference: string;
  status: string;
  pickupAddress: string;
  dropoffAddress: string;
  pickupLatitude: number;
  pickupLongitude: number;
  dropoffLatitude: number;
  dropoffLongitude: number;
  scheduledAt: string | null;
  acceptedAt: string | null;
  startedAt: string | null;
  arrivedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  distanceMeters: number | null;
  durationSeconds: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  riderProfile: {
    id: string;
    userId: string;
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      displayName: string;
    };
  };
  driverProfile: {
    id: string;
    userId: string;
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      displayName: string;
    };
  } | null;
  fareQuote: {
    totalFare: number;
  } | null;
  payment: {
    status: string;
  } | null;
}

export interface PaymentItem {
  id: string;
  tripId: string | null;
  amount: number;
  currency: string;
  status: string;
  reference: string;
  provider: string;
  createdAt: string;
  user: {
    id: string;
    displayName: string | null;
    phone: string | null;
    email: string;
  } | null;
  trip: {
    id: string;
    reference: string;
    status: string;
  } | null;
}

export interface PayoutItem {
  id: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  providerReference: string | null;
  createdAt: string;
  processedAt: string | null;
  driver: {
    id: string;
    name: string;
    phone: string;
    email: string;
  } | null;
}

export interface PayoutRequestItem {
  id: string;
  driverId: string;
  driverName: string;
  amount: number;
  currency: string;
  status: string;
  requestedAt: string;
  approvedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
}

export interface LedgerAccountItem {
  id: string;
  code: string;
  name: string;
  accountType: string;
  balance: number;
  currency: string;
}

export interface LedgerTransactionItem {
  id: string;
  reference: string;
  accountCode: string;
  amount: number;
  type: string;
  createdAt: string;
  description: string;
}

export interface SupportTicketItem {
  id: string;
  title: string;
  type: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  assignedTo: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
}

async function fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
  const token = typeof window !== 'undefined' ? getAdminAccessToken() : null;
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers || {}),
    },
  });

  if (res.status === 401) {
    const refreshToken = getAdminRefreshToken();
    const fingerprint = getAdminFingerprint();
    if (refreshToken && fingerprint) {
      try {
        const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: refreshToken, fingerprint }),
        });
        if (refreshRes.ok) {
          const data: TokenResponse = await refreshRes.json();
          setAdminTokens(data.accessToken, data.refreshToken);
          const retryRes = await fetch(`${API_URL}${path}`, {
            ...options,
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${data.accessToken}`,
              ...(options?.headers || {}),
            },
          });
          if (!retryRes.ok) {
            const err = await retryRes.json().catch(() => ({ message: retryRes.statusText }));
            throw new Error(err.error?.message || err.message || `HTTP ${retryRes.status}`);
          }
          return retryRes.json() as Promise<T>;
        }
      } catch (err) {
        if (err instanceof Error && err.message.startsWith('HTTP ')) throw err;
        // Fall through to session expiry
      }
    }
    clearAdminTokens();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw new Error('Session expired. Please log in again.');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.error?.message || err.message || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
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
  runFinanceReconciliation: () => fetchJson<any>('/admin/finance/reconciliation/run', { method: 'POST' }),
  runFinanceProviderEventRetries: () => fetchJson<any>('/admin/finance/reconciliation/retry-provider-events', { method: 'POST' }),
  getFinanceSchedulerStatus: () => fetchJson<any>('/admin/finance/reconciliation/status'),
  getFinanceReconciliationJobs: (limit = 20, offset = 0) => fetchJson<any>(`/admin/finance/reconciliation/jobs?limit=${limit}&offset=${offset}`),
  getFinanceReconciliationMismatches: (limit = 50, offset = 0) => fetchJson<any>(`/admin/finance/reconciliation/mismatches?limit=${limit}&offset=${offset}`),
  getFinanceProviderEvents: (status = '', limit = 20, offset = 0) =>
    fetchJson<any>(`/admin/finance/provider-events?${new URLSearchParams({ ...(status ? { status } : {}), limit: String(limit), offset: String(offset) })}`),
  retryProviderEvent: (id: string) => fetchJson<any>(`/admin/finance/provider-events/${id}/retry`, { method: 'POST' }),
  deadLetterProviderEvent: (id: string, reason?: string) =>
    fetchJson<any>(`/admin/finance/provider-events/${id}/dead-letter`, { method: 'POST', body: JSON.stringify({ reason }) }),
  retryPayout: (id: string, comment?: string) =>
    fetchJson<any>(`/admin/payouts/${id}/retry`, { method: 'POST', body: JSON.stringify({ comment }) }),
  getFinanceRefunds: (limit = 20, offset = 0) => fetchJson<any>(`/admin/finance/refunds?limit=${limit}&offset=${offset}`),
  getFinanceDisputes: (limit = 20, offset = 0) => fetchJson<any>(`/admin/finance/disputes?limit=${limit}&offset=${offset}`),
  updateFinanceDispute: (id: string, adminStatus?: string, adminNotes?: string) =>
    fetchJson<any>(`/admin/finance/disputes/${id}`, { method: 'PATCH', body: JSON.stringify({ adminStatus, adminNotes }) }),
  resolveFinanceDispute: (id: string, resolution: 'WON' | 'LOST' | 'CLOSED', notes?: string) =>
    fetchJson<any>(`/admin/finance/disputes/${id}/resolve`, { method: 'POST', body: JSON.stringify({ resolution, notes }) }),
  getFinanceOperations: (limit = 20, offset = 0) => fetchJson<any>(`/admin/finance/operations?limit=${limit}&offset=${offset}`),
  generateDailyClose: () => fetchJson<any>('/admin/finance/daily-close/generate', { method: 'POST' }),
  getDailyCloseReports: (limit = 20, offset = 0) => fetchJson<any>(`/admin/finance/daily-close?limit=${limit}&offset=${offset}`),
  getLatestDailyCloseReport: () => fetchJson<any>('/admin/finance/daily-close/latest'),

  // Shipments
  listAdminShipments: (status?: string, limit = 20, offset = 0) =>
    fetchJson<any>(`/admin/shipments?${new URLSearchParams({ ...(status ? { status } : {}), limit: String(limit), offset: String(offset) })}`),
  getAdminShipment: (id: string) => fetchJson<any>(`/admin/shipments/${id}`),
  assignShipmentDriver: (id: string, driverId: string) =>
    fetchJson<any>(`/admin/shipments/${id}/assign-driver`, { method: 'POST', body: JSON.stringify({ driverId }) }),
  cancelAdminShipment: (id: string, reason?: string) =>
    fetchJson<any>(`/admin/shipments/${id}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) }),
  disputeShipment: (id: string, reason: string) =>
    fetchJson<any>(`/admin/shipments/${id}/dispute`, { method: 'POST', body: JSON.stringify({ reason }) }),
  updateShipmentStatus: (id: string, status: string, reason?: string) =>
    fetchJson<any>(`/admin/shipments/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, reason }) }),

  // Old Aliases for backward compatibility
  getShipments: (status?: string, limit = 20, offset = 0) =>
    fetchJson<any>(`/admin/shipments?${new URLSearchParams({ ...(status ? { status } : {}), limit: String(limit), offset: String(offset) })}`),
  getShipment: (id: string) => fetchJson<any>(`/admin/shipments/${id}`),
  forceShipmentStatus: (id: string, status: 'CANCELLED' | 'FAILED', reason?: string) =>
    fetchJson<any>(`/admin/shipments/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, reason }) }),
  resolveShipment: (id: string, resolution: string, notes?: string) =>
    fetchJson<any>(`/admin/shipments/${id}/resolve`, { method: 'POST', body: JSON.stringify({ resolution, notes }) }),

  // Trips
  getTrips: (status?: string, limit = 20, offset = 0) =>
    fetchJson<any>(`/admin/trips?${new URLSearchParams({ ...(status ? { status } : {}), limit: String(limit), offset: String(offset) })}`),
  getTrip: (id: string) => fetchJson<any>(`/admin/trips/${id}`),

  // Payments (separate from Finance module)
  getPayments: (status?: string, provider?: string, limit = 20, offset = 0) =>
    fetchJson<any>(`/admin/payments?${new URLSearchParams({ ...(status ? { status } : {}), ...(provider ? { provider } : {}), limit: String(limit), offset: String(offset) })}`),
  getPayment: (id: string) => fetchJson<any>(`/admin/payments/${id}`),

  // Ledger
  getLedgerAccounts: () => fetchJson<any>('/admin/ledger/accounts'),
  getLedgerTransactions: (limit = 20, offset = 0) =>
    fetchJson<any>(`/admin/ledger/transactions?limit=${limit}&offset=${offset}`),

  // Payouts (separate from Finance module)
  getPayouts: (status?: string, limit = 20, offset = 0) =>
    fetchJson<any>(`/admin/payouts?${new URLSearchParams({ ...(status ? { status } : {}), limit: String(limit), offset: String(offset) })}`),
  approvePayout: (payoutId: string, notes?: string) =>
    fetchJson<any>(`/admin/payouts/${payoutId}/approve`, { method: 'POST', body: JSON.stringify({ notes }) }),
  rejectPayout: (payoutId: string, reason: string) =>
    fetchJson<any>(`/admin/payouts/${payoutId}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),

  // Support Tickets
  getSupportTickets: (status?: string, type?: string, priority?: string, limit = 20, offset = 0) =>
    fetchJson<any>(`/admin/support/tickets?${new URLSearchParams({ ...(status ? { status } : {}), ...(type ? { type } : {}), ...(priority ? { priority } : {}), limit: String(limit), offset: String(offset) })}`),
  getSupportTicket: (id: string) => fetchJson<any>(`/admin/support/tickets/${id}`),
  assignSupportTicket: (ticketId: string, adminId: string) =>
    fetchJson<any>(`/admin/support/tickets/${ticketId}/assign`, { method: 'PATCH', body: JSON.stringify({ adminUserId: adminId }) }),
  changeSupportTicketStatus: (ticketId: string, status: string) =>
    fetchJson<any>(`/admin/support/tickets/${ticketId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  changeSupportTicketPriority: (ticketId: string, priority: string) =>
    fetchJson<any>(`/admin/support/tickets/${ticketId}/priority`, { method: 'PATCH', body: JSON.stringify({ priority }) }),

  // Audit Logs
  getAuditLogs: (actor?: string, entity?: string, action?: string, limit = 20, offset = 0) =>
    fetchJson<any>(`/admin/audit-logs?${new URLSearchParams({ ...(actor ? { actor } : {}), ...(entity ? { entity } : {}), ...(action ? { action } : {}), limit: String(limit), offset: String(offset) })}`),

  // Users & Riders
  getUsers: (type?: string, status?: string, limit = 20, offset = 0) =>
    fetchJson<any>(`/admin/users?${new URLSearchParams({ ...(type ? { type } : {}), ...(status ? { status } : {}), limit: String(limit), offset: String(offset) })}`),
  getRiders: (limit = 20, offset = 0) =>
    fetchJson<any>(`/admin/riders?limit=${limit}&offset=${offset}`),

  // App Settings
  getAppSettings: () => fetchJson<any>('/admin/settings'),
};

export function normalizeListResponse<T>(res: any): { items: T[]; total: number; limit: number; offset: number } {
  if (!res) {
    return { items: [], total: 0, limit: 20, offset: 0 };
  }
  if (Array.isArray(res)) {
    return { items: res, total: res.length, limit: res.length, offset: 0 };
  }
  return {
    items: Array.isArray(res.items) ? res.items : [],
    total: Number(res.total) || (Array.isArray(res.items) ? res.items.length : 0),
    limit: Number(res.limit) || 20,
    offset: Number(res.offset) || 0,
  };
}
