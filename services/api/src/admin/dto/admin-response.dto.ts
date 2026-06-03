export class UserDto {
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

export class RiderDto {
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

export class DriverDocumentDto {
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

export class VehicleDocumentDto {
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

export class KycCheckDto {
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

export class VehicleDto {
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

export class TripDto {
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

export class PaymentDto {
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

export class PayoutDto {
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

export class PayoutRequestDto {
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

export class LedgerAccountDto {
  id: string;
  code: string;
  name: string;
  accountType: string;
  balance: number;
  currency: string;
}

export class LedgerTransactionDto {
  id: string;
  reference: string;
  accountCode: string;
  amount: number;
  type: string;
  createdAt: string;
  description: string;
}

export class SupportTicketDto {
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

export class SosEventDto {
  id: string;
  type: string;
  status: string;
  latitude: number;
  longitude: number;
  notes: string | null;
  triggeredAt: string;
  resolvedAt: string | null;
  user: {
    id: string;
    displayName: string | null;
    phone: string | null;
  };
  trip: {
    id: string;
    reference: string;
    status: string;
  } | null;
}

export class IncidentDto {
  id: string;
  tripId: string;
  severity: string;
  status: string;
  description: string;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  reportedBy: {
    id: string;
    displayName: string | null;
  };
  trip: {
    id: string;
    reference: string;
    status: string;
  } | null;
}

export class AuditLogDto {
  id: string;
  actorId: string | null;
  action: string;
  entity: string;
  entityId: string;
  payload: any;
  createdAt: string;
}
