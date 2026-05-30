import {
  PrismaClient,
  UserType,
  TripStatus,
  PaymentStatus,
  PayoutStatus,
  LedgerEventType,
  TransactionType,
  SupportStatus,
  SupportTicketType,
  SupportTicketPriority,
  IncidentSeverity,
  IncidentStatus,
  SosEventType,
  SosStatus,
  VehicleStatus,
  DriverStatus,
  ServiceType,
  ShipmentStatus,
  PackageCategory,
  ShipmentPriority,
  ShipmentOtpType,
  ProofType
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Stable UUID constants for consistent upsert and idempotency
const USER_ADMIN_ID = 'e1e1e1e1-e1e1-e1e1-e1e1-e1e1e1e1e1e1';
const USER_SUPPORT_ID = 'e2e2e2e2-e2e2-e2e2-e2e2-e2e2e2e2e2e2';
const USER_FINANCE_ID = 'e3e3e3e3-e3e3-e3e3-e3e3-e3e3e3e3e3e3';
const USER_SAFETY_ID = 'e4e4e4e4-e4e4-e4e4-e4e4-e4e4e4e4e4e4';
const USER_RIDER_ID = 'e5e5e5e5-e5e5-e5e5-e5e5-e5e5e5e5e5e5';
const USER_APPROVED_DRIVER_ID = 'e6e6e6e6-e6e6-e6e6-e6e6-e6e6e6e6e6e6';
const USER_PENDING_DRIVER_ID = 'e7e7e7e7-e7e7-e7e7-e7e7-e7e7e7e7e7e7';

const ADMIN_USER_ADMIN_ID = '99999999-9999-9999-9999-999999999991';
const ADMIN_USER_SUPPORT_ID = '99999999-9999-9999-9999-999999999992';
const ADMIN_USER_FINANCE_ID = '99999999-9999-9999-9999-999999999993';
const ADMIN_USER_SAFETY_ID = '99999999-9999-9999-9999-999999999994';

const RIDER_PROFILE_ID = 'f1f1f1f1-f1f1-f1f1-f1f1-f1f1f1f1f1f1';
const APPROVED_DRIVER_PROFILE_ID = 'f2f2f2f2-f2f2-f2f2-f2f2-f2f2f2f2f2f2';
const PENDING_DRIVER_PROFILE_ID = 'f3f3f3f3-f3f3-f3f3-f3f3-f3f3f3f3f3f3';

const APPROVED_VEHICLE_ID = '11111111-1111-1111-1111-111111111111';
const PENDING_VEHICLE_ID = '22222222-2222-2222-2222-222222222222';

const APPROVED_BANK_ACCOUNT_ID = '33333333-3333-3333-3333-333333333333';

const PAYOUT_PAID_ID = '44444444-4444-4444-4444-444444444444';
const PAYOUT_REQ_ID = '55555555-5555-5555-5555-555555555555';

const TRIP_COMPLETED_ID = '66666666-6666-6666-6666-666666666666';
const TRIP_REQUESTED_ID = '77777777-7777-7777-7777-777777777777';

const PAYMENT_COMPLETED_ID = '88888888-8888-8888-8888-888888888888';

const LEDGER_ACC_CASH_ID = '91919191-9191-9191-9191-919191919191';
const LEDGER_ACC_RECEIVABLES_ID = '92929292-9292-9292-9292-929292929292';
const LEDGER_ACC_PAYABLES_ID = '93939393-9393-9393-9393-939393939393';
const LEDGER_ACC_REVENUE_ID = '94949494-9494-9494-9494-949494949494';

const FT_TRIP_1_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const LEDGER_ENTRY_1_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const LEDGER_ENTRY_2_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const LEDGER_ENTRY_3_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

const SOS_TRIP_1_ID = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
const INCIDENT_TRIP_1_ID = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
const TICKET_INCIDENT_ID = '00000000-0000-0000-0000-000000000000';
const SUPPORT_MSG_1_ID = '81818181-8181-8181-8181-818181818181';
const SUPPORT_MSG_2_ID = '82828282-8282-8282-8282-828282828282';
const SUPPORT_MSG_3_ID = '83838383-8383-8383-8383-838383838383';

const TRIP_SHIPMENT_1_ID = '70707070-7070-7070-7070-707070707070';
const TRIP_SHIPMENT_2_ID = '80808080-8080-8080-8080-808080808080';

const SHIPMENT_COMPLETED_ID = '10101010-1010-1010-1010-101010101010';
const SHIPMENT_REQUESTED_ID = '20202020-2020-2020-2020-202020202020';

const SHIPMENT_QUOTE_2_ID = '30303030-3030-3030-3030-303030303030';
const SHIPMENT_1_ITEM_ID = '40404040-4040-4040-4040-404040404040';
const SHIPMENT_2_ITEM_ID = '50505050-5050-5050-5050-505050505050';
const SHIPMENT_1_PROOF_ID = '60606060-6060-6060-6060-606060606060';

const permissions = [
  { name: 'SUPER_ADMIN', description: 'Full admin access to all admin routes and RBAC operations.' },
  { name: 'OPERATIONS_MANAGER', description: 'Manage ride dispatch and operations workflows.' },
  { name: 'KYC_REVIEWER', description: 'Approve or reject KYC checks and review identity documentation.' },
  { name: 'FINANCE_MANAGER', description: 'Approve payouts and manage financial admin workflows.' },
  { name: 'SAFETY_OFFICER', description: 'Report safety incidents and review safety incidents.' },
  { name: 'FRAUD_ANALYST', description: 'Review suspicious activity and access audit trails.' },
  { name: 'READ_ONLY_AUDITOR', description: 'View audit logs and compliance reports only.' },
  { name: 'DRIVER_ONBOARDING_REVIEWER', description: 'Review driver onboarding documents and manage driver approvals.' },
  { name: 'SUPPORT_AGENT', description: 'View ride details and customer support related admin data.' },
  { name: 'VEHICLE_MANAGER', description: 'Approve, reject, suspend, and reactivate vehicles.' }
];

const roles = [
  {
    name: 'Super Admin',
    description: 'Full platform administrator with unrestricted RBAC access.',
    permissions: ['SUPER_ADMIN', 'OPERATIONS_MANAGER', 'KYC_REVIEWER', 'FINANCE_MANAGER', 'SAFETY_OFFICER', 'FRAUD_ANALYST', 'READ_ONLY_AUDITOR', 'DRIVER_ONBOARDING_REVIEWER', 'SUPPORT_AGENT', 'VEHICLE_MANAGER']
  },
  {
    name: 'Operations Manager',
    description: 'Manages trip dispatch and operational workflows.',
    permissions: ['OPERATIONS_MANAGER', 'DRIVER_ONBOARDING_REVIEWER', 'VEHICLE_MANAGER']
  },
  {
    name: 'KYC Reviewer',
    description: 'Handles KYC approval and identity verification.',
    permissions: ['KYC_REVIEWER']
  },
  {
    name: 'Finance Manager',
    description: 'Handles payout approvals and payment investigations.',
    permissions: ['FINANCE_MANAGER']
  },
  {
    name: 'Safety Officer',
    description: 'Reports and investigates safety incidents.',
    permissions: ['SAFETY_OFFICER']
  },
  {
    name: 'Fraud Analyst',
    description: 'Reviews fraud cases and compliance logs.',
    permissions: ['FRAUD_ANALYST', 'READ_ONLY_AUDITOR']
  },
  {
    name: 'Read Only Auditor',
    description: 'Read-only access for compliance and audit review.',
    permissions: ['READ_ONLY_AUDITOR']
  },
  {
    name: 'Support Agent',
    description: 'Support staff with access to customer support admin functionality.',
    permissions: ['SUPPORT_AGENT']
  }
];

async function seedPermissionsAndRoles() {
  console.log('Seeding admin roles and permissions...');

  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { name: permission.name },
      update: { description: permission.description },
      create: permission
    });
  }

  for (const role of roles) {
    const createdRole = await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description },
      create: {
        name: role.name,
        description: role.description
      }
    });

    const permissionRecords = await prisma.permission.findMany({
      where: { name: { in: role.permissions } }
    });

    for (const permission of permissionRecords) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: createdRole.id,
            permissionId: permission.id
          }
        },
        update: {},
        create: {
          roleId: createdRole.id,
          permissionId: permission.id
        }
      });
    }
  }

  console.log('Admin RBAC seed complete.');
}

async function main() {
  await seedPermissionsAndRoles();

  const defaultPassword = process.env.ADMIN_PASSWORD || 'LocalAdminPass123!';
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@rydalux.local';
  
  if (defaultPassword.length < 12) {
    throw new Error('ADMIN_PASSWORD must be at least 12 characters.');
  }

  const passwordHash = await bcrypt.hash(defaultPassword, 10);
  
  // Safe test OTP hash
  const otpHash = await bcrypt.hash('123456', 10);

  console.log('Seeding administrative and staff users...');

  // 1. Super Admin User
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash },
    create: {
      id: USER_ADMIN_ID,
      email: adminEmail,
      phone: '+2348000000001',
      passwordHash,
      firstName: 'Super',
      lastName: 'Admin',
      displayName: 'System Admin',
      userType: UserType.ADMIN,
      isEmailVerified: true,
      isPhoneVerified: true
    }
  });

  const superAdminRole = await prisma.role.findUnique({ where: { name: 'Super Admin' } });
  if (superAdminRole) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: USER_ADMIN_ID, roleId: superAdminRole.id } },
      update: {},
      create: { userId: USER_ADMIN_ID, roleId: superAdminRole.id }
    });

    await prisma.adminUser.upsert({
      where: { userId: USER_ADMIN_ID },
      update: { roleId: superAdminRole.id },
      create: { id: ADMIN_USER_ADMIN_ID, userId: USER_ADMIN_ID, roleId: superAdminRole.id, isActive: true }
    });
  }

  // 2. Support Officer User
  const supportEmail = 'support@rydalux.local';
  await prisma.user.upsert({
    where: { email: supportEmail },
    update: { passwordHash },
    create: {
      id: USER_SUPPORT_ID,
      email: supportEmail,
      phone: '+2348000000002',
      passwordHash,
      firstName: 'Sarah',
      lastName: 'Support',
      displayName: 'Sarah Support',
      userType: UserType.ADMIN,
      isEmailVerified: true,
      isPhoneVerified: true
    }
  });

  const supportRole = await prisma.role.findUnique({ where: { name: 'Support Agent' } });
  if (supportRole) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: USER_SUPPORT_ID, roleId: supportRole.id } },
      update: {},
      create: { userId: USER_SUPPORT_ID, roleId: supportRole.id }
    });

    await prisma.adminUser.upsert({
      where: { userId: USER_SUPPORT_ID },
      update: { roleId: supportRole.id },
      create: { id: ADMIN_USER_SUPPORT_ID, userId: USER_SUPPORT_ID, roleId: supportRole.id, isActive: true }
    });
  }

  // 3. Finance Manager User
  const financeEmail = 'finance@rydalux.local';
  await prisma.user.upsert({
    where: { email: financeEmail },
    update: { passwordHash },
    create: {
      id: USER_FINANCE_ID,
      email: financeEmail,
      phone: '+2348000000003',
      passwordHash,
      firstName: 'Felix',
      lastName: 'Finance',
      displayName: 'Felix Finance',
      userType: UserType.ADMIN,
      isEmailVerified: true,
      isPhoneVerified: true
    }
  });

  const financeRole = await prisma.role.findUnique({ where: { name: 'Finance Manager' } });
  if (financeRole) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: USER_FINANCE_ID, roleId: financeRole.id } },
      update: {},
      create: { userId: USER_FINANCE_ID, roleId: financeRole.id }
    });

    await prisma.adminUser.upsert({
      where: { userId: USER_FINANCE_ID },
      update: { roleId: financeRole.id },
      create: { id: ADMIN_USER_FINANCE_ID, userId: USER_FINANCE_ID, roleId: financeRole.id, isActive: true }
    });
  }

  // 4. Safety Officer User
  const safetyEmail = 'safety@rydalux.local';
  await prisma.user.upsert({
    where: { email: safetyEmail },
    update: { passwordHash },
    create: {
      id: USER_SAFETY_ID,
      email: safetyEmail,
      phone: '+2348000000004',
      passwordHash,
      firstName: 'Samuel',
      lastName: 'Safety',
      displayName: 'Samuel Safety',
      userType: UserType.ADMIN,
      isEmailVerified: true,
      isPhoneVerified: true
    }
  });

  const safetyRole = await prisma.role.findUnique({ where: { name: 'Safety Officer' } });
  if (safetyRole) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: USER_SAFETY_ID, roleId: safetyRole.id } },
      update: {},
      create: { userId: USER_SAFETY_ID, roleId: safetyRole.id }
    });

    await prisma.adminUser.upsert({
      where: { userId: USER_SAFETY_ID },
      update: { roleId: safetyRole.id },
      create: { id: ADMIN_USER_SAFETY_ID, userId: USER_SAFETY_ID, roleId: safetyRole.id, isActive: true }
    });
  }

  console.log('Seeding customers and drivers...');

  // 5. Sample Rider (Customer)
  const riderEmail = 'rider@rydalux.local';
  await prisma.user.upsert({
    where: { email: riderEmail },
    update: { passwordHash },
    create: {
      id: USER_RIDER_ID,
      email: riderEmail,
      phone: '+2348033333333',
      passwordHash,
      firstName: 'Ray',
      lastName: 'Rider',
      displayName: 'Ray Rider',
      userType: UserType.RIDER,
      isEmailVerified: true,
      isPhoneVerified: true
    }
  });

  await prisma.riderProfile.upsert({
    where: { userId: USER_RIDER_ID },
    update: {},
    create: {
      id: RIDER_PROFILE_ID,
      userId: USER_RIDER_ID,
      isActive: true,
      defaultPaymentMethod: 'CARD'
    }
  });

  // 6. Approved Driver
  const approvedDriverEmail = 'driver.approved@rydalux.local';
  await prisma.user.upsert({
    where: { email: approvedDriverEmail },
    update: { passwordHash },
    create: {
      id: USER_APPROVED_DRIVER_ID,
      email: approvedDriverEmail,
      phone: '+2348044444444',
      passwordHash,
      firstName: 'David',
      lastName: 'Driver',
      displayName: 'David Approved',
      userType: UserType.DRIVER,
      isEmailVerified: true,
      isPhoneVerified: true
    }
  });

  await prisma.driverProfile.upsert({
    where: { userId: USER_APPROVED_DRIVER_ID },
    update: {
      currentStatus: DriverStatus.AVAILABLE,
      isOnline: true
    },
    create: {
      id: APPROVED_DRIVER_PROFILE_ID,
      userId: USER_APPROVED_DRIVER_ID,
      currentStatus: DriverStatus.AVAILABLE,
      isOnline: true,
      licenseNumber: 'DL-APPROVED-98765',
      licensePlate: 'LAG-123-AB',
      averageRating: 4.85
    }
  });

  // 7. Pending Driver
  const pendingDriverEmail = 'driver.pending@rydalux.local';
  await prisma.user.upsert({
    where: { email: pendingDriverEmail },
    update: { passwordHash },
    create: {
      id: USER_PENDING_DRIVER_ID,
      email: pendingDriverEmail,
      phone: '+2348055555555',
      passwordHash,
      firstName: 'Paul',
      lastName: 'Pending',
      displayName: 'Paul Pending',
      userType: UserType.DRIVER,
      isEmailVerified: true,
      isPhoneVerified: false
    }
  });

  await prisma.driverProfile.upsert({
    where: { userId: USER_PENDING_DRIVER_ID },
    update: {},
    create: {
      id: PENDING_DRIVER_PROFILE_ID,
      userId: USER_PENDING_DRIVER_ID,
      currentStatus: DriverStatus.OFFLINE,
      isOnline: false,
      licenseNumber: 'DL-PENDING-54321',
      licensePlate: 'LAG-456-CD',
      averageRating: 0.0
    }
  });

  console.log('Seeding vehicles and bank accounts...');

  // 8. Approved Vehicle
  await prisma.vehicle.upsert({
    where: { registrationNumber: 'LAG-123-AB' },
    update: { status: VehicleStatus.ACTIVE },
    create: {
      id: APPROVED_VEHICLE_ID,
      driverProfileId: APPROVED_DRIVER_PROFILE_ID,
      registrationNumber: 'LAG-123-AB',
      make: 'Toyota',
      model: 'Camry',
      year: 2022,
      color: 'Black',
      capacity: 4,
      vehicleType: 'REGULAR',
      status: VehicleStatus.ACTIVE,
      approvedAt: new Date(),
      verifiedAt: new Date()
    }
  });

  // Link approved vehicle as the active vehicle for the approved driver
  await prisma.driverProfile.update({
    where: { id: APPROVED_DRIVER_PROFILE_ID },
    data: { activeVehicleId: APPROVED_VEHICLE_ID }
  });

  // 9. Pending Vehicle
  await prisma.vehicle.upsert({
    where: { registrationNumber: 'LAG-456-CD' },
    update: {},
    create: {
      id: PENDING_VEHICLE_ID,
      driverProfileId: PENDING_DRIVER_PROFILE_ID,
      registrationNumber: 'LAG-456-CD',
      make: 'Hyundai',
      model: 'Elantra',
      year: 2020,
      color: 'Silver',
      capacity: 4,
      vehicleType: 'REGULAR',
      status: VehicleStatus.INACTIVE
    }
  });

  // Approved Driver Bank Account
  await prisma.driverBankAccount.upsert({
    where: { driverProfileId: APPROVED_DRIVER_PROFILE_ID },
    update: {},
    create: {
      id: APPROVED_BANK_ACCOUNT_ID,
      driverProfileId: APPROVED_DRIVER_PROFILE_ID,
      bankCode: '058',
      bankName: 'Guaranty Trust Bank',
      accountName: 'David Driver',
      accountNumberLast4: '4321',
      currency: 'NGN',
      provider: 'paystack',
      paystackRecipientCode: 'RCP_approved_driver_123',
      verifiedAt: new Date()
    }
  });

  console.log('Seeding payouts and financial records...');

  // Historical Paid Payout
  await prisma.payout.upsert({
    where: { id: PAYOUT_PAID_ID },
    update: {},
    create: {
      id: PAYOUT_PAID_ID,
      driverProfileId: APPROVED_DRIVER_PROFILE_ID,
      amount: 15000.00,
      currency: 'NGN',
      status: PayoutStatus.PAID,
      provider: 'paystack',
      providerReference: 'PAYOUT-GTB-98123',
      providerTransferCode: 'TRF_payout_paid_123',
      requestedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      processedAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
    }
  });

  // Active Pending Payout Request
  await prisma.payout.upsert({
    where: { id: PAYOUT_REQ_ID },
    update: {},
    create: {
      id: PAYOUT_REQ_ID,
      driverProfileId: APPROVED_DRIVER_PROFILE_ID,
      amount: 5000.00,
      currency: 'NGN',
      status: PayoutStatus.REQUESTED,
      provider: 'paystack',
      requestedAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
    }
  });

  console.log('Seeding trips, payments, and events...');

  // 10. Sample Completed Trip (Trip 1)
  await prisma.trip.upsert({
    where: { id: TRIP_COMPLETED_ID },
    update: {},
    create: {
      id: TRIP_COMPLETED_ID,
      reference: 'TRIP-COMPLETED-001',
      riderProfileId: RIDER_PROFILE_ID,
      driverProfileId: APPROVED_DRIVER_PROFILE_ID,
      vehicleId: APPROVED_VEHICLE_ID,
      serviceType: ServiceType.REGULAR,
      status: TripStatus.COMPLETED,
      pickupAddress: '12 Admiralty Way, Lekki, Lagos',
      dropoffAddress: '45 Allen Avenue, Ikeja, Lagos',
      pickupLatitude: 6.4474,
      pickupLongitude: 3.4735,
      dropoffLatitude: 6.5968,
      dropoffLongitude: 3.3512,
      distanceMeters: 25000,
      durationSeconds: 1800,
      pinCode: '4321',
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      acceptedAt: new Date(Date.now() - 24 * 60 * 60 * 1000 + 2 * 60 * 1000),
      startedAt: new Date(Date.now() - 24 * 60 * 60 * 1000 + 5 * 60 * 1000),
      completedAt: new Date(Date.now() - 24 * 60 * 60 * 1000 + 35 * 60 * 1000)
    }
  });

  // Completed Trip Event timelines
  const eventTypes = ['REQUESTED', 'DRIVER_ASSIGNED', 'DRIVER_ARRIVED', 'PIN_VERIFIED', 'COMPLETED'];
  for (let i = 0; i < eventTypes.length; i++) {
    await prisma.tripEvent.create({
      data: {
        tripId: TRIP_COMPLETED_ID,
        eventType: eventTypes[i],
        occurredAt: new Date(Date.now() - 24 * 60 * 60 * 1000 + i * 5 * 60 * 1000)
      }
    });
  }

  // Payment for Trip 1
  await prisma.payment.upsert({
    where: { id: PAYMENT_COMPLETED_ID },
    update: {},
    create: {
      id: PAYMENT_COMPLETED_ID,
      userId: USER_RIDER_ID,
      tripId: TRIP_COMPLETED_ID,
      amount: 7500.00,
      currency: 'NGN',
      provider: 'paystack',
      status: PaymentStatus.CAPTURED,
      reference: 'PAY-TRIP-1-REF-123',
      externalId: 'PSTK-CHG-98765',
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
    }
  });

  // 11. Sample Requested Active Trip (Trip 2)
  await prisma.trip.upsert({
    where: { id: TRIP_REQUESTED_ID },
    update: {},
    create: {
      id: TRIP_REQUESTED_ID,
      reference: 'TRIP-ACTIVE-REQUEST-002',
      riderProfileId: RIDER_PROFILE_ID,
      serviceType: ServiceType.REGULAR,
      status: TripStatus.REQUESTED,
      pickupAddress: 'Victoria Island, Lagos',
      dropoffAddress: 'Surulere, Lagos',
      pickupLatitude: 6.4281,
      pickupLongitude: 3.4219,
      dropoffLatitude: 6.5080,
      dropoffLongitude: 3.3764,
      createdAt: new Date(Date.now() - 30 * 60 * 1000)
    }
  });

  await prisma.tripEvent.create({
    data: {
      tripId: TRIP_REQUESTED_ID,
      eventType: 'REQUESTED',
      occurredAt: new Date(Date.now() - 30 * 60 * 1000)
    }
  });

  console.log('Seeding double-entry ledger accounts...');

  // Initialize System Accounts
  await prisma.ledgerAccount.upsert({
    where: { code: '1010' },
    update: { balance: 500000.00 },
    create: {
      id: LEDGER_ACC_CASH_ID,
      code: '1010',
      name: 'Bank Settlement Account',
      accountType: 'ASSET',
      currency: 'NGN',
      balance: 500000.00,
      isSystem: true
    }
  });

  await prisma.ledgerAccount.upsert({
    where: { code: '1200' },
    update: { balance: 7500.00 },
    create: {
      id: LEDGER_ACC_RECEIVABLES_ID,
      code: '1200',
      name: 'Rider Receivables',
      accountType: 'ASSET',
      currency: 'NGN',
      balance: 7500.00,
      isSystem: true
    }
  });

  await prisma.ledgerAccount.upsert({
    where: { code: '2100' },
    update: { balance: 6000.00 },
    create: {
      id: LEDGER_ACC_PAYABLES_ID,
      code: '2100',
      name: 'Driver Payables',
      accountType: 'LIABILITY',
      currency: 'NGN',
      balance: 6000.00,
      isSystem: true
    }
  });

  await prisma.ledgerAccount.upsert({
    where: { code: '4000' },
    update: { balance: 1500.00 },
    create: {
      id: LEDGER_ACC_REVENUE_ID,
      code: '4000',
      name: 'Platform Commission Revenue',
      accountType: 'REVENUE',
      currency: 'NGN',
      balance: 1500.00,
      isSystem: true
    }
  });

  // Balance entries for Completed Trip 1 payment (Debits = Credits = 7500)
  await prisma.financialTransaction.upsert({
    where: { id: FT_TRIP_1_ID },
    update: {},
    create: {
      id: FT_TRIP_1_ID,
      eventType: LedgerEventType.RIDER_PAYMENT_CAPTURED,
      reference: 'FT-TRIP-1-PAYMENT-REF',
      referenceType: 'PAYMENT',
      referenceId: PAYMENT_COMPLETED_ID,
      paymentId: PAYMENT_COMPLETED_ID,
      tripId: TRIP_COMPLETED_ID,
      amount: 7500.00,
      totalDebit: 7500.00,
      totalCredit: 7500.00,
      status: 'POSTED',
      postedAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
    }
  });

  await prisma.ledgerEntry.upsert({
    where: { id: LEDGER_ENTRY_1_ID },
    update: {},
    create: {
      id: LEDGER_ENTRY_1_ID,
      ledgerAccountId: LEDGER_ACC_CASH_ID,
      financialTransactionId: FT_TRIP_1_ID,
      eventType: LedgerEventType.RIDER_PAYMENT_CAPTURED,
      transactionType: TransactionType.DEBIT,
      amount: 7500.00,
      balanceAfter: 507500.00,
      referenceType: 'PAYMENT',
      referenceId: PAYMENT_COMPLETED_ID,
      description: 'Debit Cash for Rider Payment'
    }
  });

  await prisma.ledgerEntry.upsert({
    where: { id: LEDGER_ENTRY_2_ID },
    update: {},
    create: {
      id: LEDGER_ENTRY_2_ID,
      ledgerAccountId: LEDGER_ACC_PAYABLES_ID,
      financialTransactionId: FT_TRIP_1_ID,
      eventType: LedgerEventType.RIDER_PAYMENT_CAPTURED,
      transactionType: TransactionType.CREDIT,
      amount: 6000.00,
      balanceAfter: 6000.00,
      referenceType: 'PAYMENT',
      referenceId: PAYMENT_COMPLETED_ID,
      description: 'Credit Driver Payable'
    }
  });

  await prisma.ledgerEntry.upsert({
    where: { id: LEDGER_ENTRY_3_ID },
    update: {},
    create: {
      id: LEDGER_ENTRY_3_ID,
      ledgerAccountId: LEDGER_ACC_REVENUE_ID,
      financialTransactionId: FT_TRIP_1_ID,
      eventType: LedgerEventType.RIDER_PAYMENT_CAPTURED,
      transactionType: TransactionType.CREDIT,
      amount: 1500.00,
      balanceAfter: 1500.00,
      referenceType: 'PAYMENT',
      referenceId: PAYMENT_COMPLETED_ID,
      description: 'Credit Platform Revenue'
    }
  });

  console.log('Seeding safety incidents and support tickets...');

  // 12. Safety SOS Event
  await prisma.sosEvent.upsert({
    where: { id: SOS_TRIP_1_ID },
    update: {},
    create: {
      id: SOS_TRIP_1_ID,
      userId: USER_RIDER_ID,
      tripId: TRIP_COMPLETED_ID,
      type: SosEventType.PANIC,
      status: SosStatus.RESOLVED,
      latitude: 6.4920,
      longitude: 3.4110,
      notes: 'Rider triggered distress PANIC button near Lekki. Resolved via verification callback.',
      triggeredAt: new Date(Date.now() - 24 * 60 * 60 * 1000 + 15 * 60 * 1000),
      resolvedAt: new Date(Date.now() - 24 * 60 * 60 * 1000 + 25 * 60 * 1000)
    }
  });

  // 13. Safety Incident Report
  await prisma.incidentReport.upsert({
    where: { id: INCIDENT_TRIP_1_ID },
    update: {},
    create: {
      id: INCIDENT_TRIP_1_ID,
      tripId: TRIP_COMPLETED_ID,
      reportedById: USER_RIDER_ID,
      severity: IncidentSeverity.LOW,
      status: IncidentStatus.RESOLVED,
      description: 'The driver accelerated aggressively near Lekki toll gate during peak traffic.',
      resolvedAt: new Date(Date.now() - 12 * 60 * 60 * 1000)
    }
  });

  // 14. Support Ticket linked to the incident report
  await prisma.supportTicket.upsert({
    where: { id: TICKET_INCIDENT_ID },
    update: {},
    create: {
      id: TICKET_INCIDENT_ID,
      createdById: USER_RIDER_ID,
      assignedToId: ADMIN_USER_SUPPORT_ID,
      title: 'Aggressive acceleration safety concern',
      description: 'Distressed by the sudden high acceleration. SOS resolved but warning wanted.',
      type: SupportTicketType.SAFETY_ISSUE,
      status: SupportStatus.RESOLVED,
      priority: SupportTicketPriority.HIGH,
      tripId: TRIP_COMPLETED_ID,
      incidentReportId: INCIDENT_TRIP_1_ID,
      resolvedAt: new Date(Date.now() - 12 * 60 * 60 * 1000)
    }
  });

  // Ticket Message timelines
  await prisma.supportTicketMessage.upsert({
    where: { id: SUPPORT_MSG_1_ID },
    update: {},
    create: {
      id: SUPPORT_MSG_1_ID,
      ticketId: TICKET_INCIDENT_ID,
      authorId: USER_RIDER_ID,
      content: 'Hi, I wanted to follow up on the safety check callback. The driver was driving aggressively.',
      isInternal: false,
      createdAt: new Date(Date.now() - 23 * 60 * 60 * 1000)
    }
  });

  await prisma.supportTicketMessage.upsert({
    where: { id: SUPPORT_MSG_2_ID },
    update: {},
    create: {
      id: SUPPORT_MSG_2_ID,
      ticketId: TICKET_INCIDENT_ID,
      authorId: USER_SUPPORT_ID,
      content: 'Checking trip speed charts and telemetry now. Accelerations peaks detected at 6:15 PM.',
      isInternal: true,
      createdAt: new Date(Date.now() - 20 * 60 * 60 * 1000)
    }
  });

  await prisma.supportTicketMessage.upsert({
    where: { id: SUPPORT_MSG_3_ID },
    update: {},
    create: {
      id: SUPPORT_MSG_3_ID,
      ticketId: TICKET_INCIDENT_ID,
      authorId: USER_SUPPORT_ID,
      content: 'Hello Ray. We investigated this incident. We have contacted David and issued a safety warning. Thank you for your feedback.',
      isInternal: false,
      createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000)
    }
  });

  console.log('Seeding shipments and shipment quotes...');

  // 15. Completed Shipment (Shipment 1)
  // First, create the corresponding SHIPMENT trip
  await prisma.trip.upsert({
    where: { id: TRIP_SHIPMENT_1_ID },
    update: {},
    create: {
      id: TRIP_SHIPMENT_1_ID,
      reference: 'TRIP-SHIPMENT-001',
      riderProfileId: RIDER_PROFILE_ID,
      driverProfileId: APPROVED_DRIVER_PROFILE_ID,
      vehicleId: APPROVED_VEHICLE_ID,
      serviceType: ServiceType.SHIPMENT,
      status: TripStatus.COMPLETED,
      pickupAddress: 'Block 5, Lekki Scheme 1, Lagos',
      dropoffAddress: 'Zone 3, Ikeja City Mall, Lagos',
      pickupLatitude: 6.4485,
      pickupLongitude: 3.4750,
      dropoffLatitude: 6.5980,
      dropoffLongitude: 3.3530,
      createdAt: new Date(Date.now() - 18 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 17 * 60 * 60 * 1000)
    }
  });

  await prisma.shipment.upsert({
    where: { id: SHIPMENT_COMPLETED_ID },
    update: {},
    create: {
      id: SHIPMENT_COMPLETED_ID,
      tripId: TRIP_SHIPMENT_1_ID,
      senderUserId: USER_RIDER_ID,
      senderRiderProfileId: RIDER_PROFILE_ID,
      driverProfileId: APPROVED_DRIVER_PROFILE_ID,
      vehicleId: APPROVED_VEHICLE_ID,
      pickupAddress: 'Block 5, Lekki Scheme 1, Lagos',
      pickupLatitude: 6.4485,
      pickupLongitude: 3.4750,
      dropoffAddress: 'Zone 3, Ikeja City Mall, Lagos',
      dropoffLatitude: 6.5980,
      dropoffLongitude: 3.3530,
      recipientName: 'Alice Smith',
      recipientPhone: '+2348031234567',
      packageCategory: PackageCategory.DOCUMENT,
      packageDescription: 'Signed corporate purchase agreements',
      priority: ShipmentPriority.EXPRESS,
      quotedFare: 4500.00,
      finalFare: 4500.00,
      status: ShipmentStatus.DELIVERED,
      pickupOtpHash: otpHash,
      deliveryOtpHash: otpHash,
      pickupVerifiedAt: new Date(Date.now() - 17 * 60 * 60 * 1000 - 45 * 60),
      deliveryVerifiedAt: new Date(Date.now() - 17 * 60 * 60 * 1000 - 5 * 60),
      deliveredAt: new Date(Date.now() - 17 * 60 * 60 * 1000)
    }
  });

  await prisma.shipmentItem.upsert({
    where: { id: SHIPMENT_1_ITEM_ID },
    update: {},
    create: {
      id: SHIPMENT_1_ITEM_ID,
      shipmentId: SHIPMENT_COMPLETED_ID,
      description: 'Confidential corporate papers folder',
      quantity: 1,
      weight: 0.8
    }
  });

  const shipment1Events = ['DRIVER_ASSIGNED', 'PICKUP_ARRIVED', 'PICKUP_VERIFIED', 'DELIVERY_ARRIVED', 'DELIVERY_VERIFIED', 'DELIVERED'];
  for (let i = 0; i < shipment1Events.length; i++) {
    await prisma.shipmentTrackingEvent.create({
      data: {
        shipmentId: SHIPMENT_COMPLETED_ID,
        eventType: shipment1Events[i] === 'DELIVERED' ? 'STATUS_CHANGED' : shipment1Events[i],
        status: shipment1Events[i] as ShipmentStatus,
        createdAt: new Date(Date.now() - 18 * 60 * 60 * 1000 + i * 10 * 60 * 1000)
      }
    });
  }

  // Double-blind OTP hashes record (for test verification purposes)
  await prisma.shipmentOtp.upsert({
    where: { shipmentId_otpType: { shipmentId: SHIPMENT_COMPLETED_ID, otpType: ShipmentOtpType.PICKUP } },
    update: {},
    create: {
      shipmentId: SHIPMENT_COMPLETED_ID,
      otpType: ShipmentOtpType.PICKUP,
      otpHash,
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000)
    }
  });

  await prisma.shipmentOtp.upsert({
    where: { shipmentId_otpType: { shipmentId: SHIPMENT_COMPLETED_ID, otpType: ShipmentOtpType.DELIVERY } },
    update: {},
    create: {
      shipmentId: SHIPMENT_COMPLETED_ID,
      otpType: ShipmentOtpType.DELIVERY,
      otpHash,
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000)
    }
  });

  // Shipment 1 Proof
  await prisma.shipmentProof.upsert({
    where: { id: SHIPMENT_1_PROOF_ID },
    update: {},
    create: {
      id: SHIPMENT_1_PROOF_ID,
      shipmentId: SHIPMENT_COMPLETED_ID,
      proofType: ProofType.PHOTO_URL,
      url: 'https://images.rydalux.local/proofs/shipment-1-signature.png',
      notes: 'Received and signed by Alice.',
      submittedBy: USER_APPROVED_DRIVER_ID,
      submittedAt: new Date(Date.now() - 17 * 60 * 60 * 1000)
    }
  });

  // 16. Pending Requested Shipment (Shipment 2)
  // First, create the corresponding SHIPMENT trip
  await prisma.trip.upsert({
    where: { id: TRIP_SHIPMENT_2_ID },
    update: {},
    create: {
      id: TRIP_SHIPMENT_2_ID,
      reference: 'TRIP-SHIPMENT-002',
      riderProfileId: RIDER_PROFILE_ID,
      serviceType: ServiceType.SHIPMENT,
      status: TripStatus.REQUESTED,
      pickupAddress: '44 Toyin Street, Ikeja, Lagos',
      dropoffAddress: '88 Allen Avenue, Ikeja, Lagos',
      pickupLatitude: 6.5985,
      pickupLongitude: 3.3540,
      dropoffLatitude: 6.5968,
      dropoffLongitude: 3.3512,
      createdAt: new Date(Date.now() - 10 * 60 * 1000)
    }
  });

  await prisma.shipment.upsert({
    where: { id: SHIPMENT_REQUESTED_ID },
    update: {},
    create: {
      id: SHIPMENT_REQUESTED_ID,
      tripId: TRIP_SHIPMENT_2_ID,
      senderUserId: USER_RIDER_ID,
      senderRiderProfileId: RIDER_PROFILE_ID,
      pickupAddress: '44 Toyin Street, Ikeja, Lagos',
      pickupLatitude: 6.5985,
      pickupLongitude: 3.3540,
      dropoffAddress: '88 Allen Avenue, Ikeja, Lagos',
      dropoffLatitude: 6.5968,
      dropoffLongitude: 3.3512,
      recipientName: 'Bob Johnson',
      recipientPhone: '+2348099876543',
      packageCategory: PackageCategory.SMALL_PACKAGE,
      packageDescription: 'Box of luxury custom chocolates',
      priority: ShipmentPriority.STANDARD,
      quotedFare: 2300.00,
      status: ShipmentStatus.REQUESTED,
      pickupOtpHash: otpHash,
      deliveryOtpHash: otpHash
    }
  });

  await prisma.shipmentItem.upsert({
    where: { id: SHIPMENT_2_ITEM_ID },
    update: {},
    create: {
      id: SHIPMENT_2_ITEM_ID,
      shipmentId: SHIPMENT_REQUESTED_ID,
      description: 'Chocolates gift box',
      quantity: 1,
      weight: 1.5
    }
  });

  await prisma.shipmentTrackingEvent.create({
    data: {
      shipmentId: SHIPMENT_REQUESTED_ID,
      eventType: 'CREATED',
      status: ShipmentStatus.REQUESTED,
      createdAt: new Date(Date.now() - 10 * 60 * 1000)
    }
  });

  // Active Shipment Quote
  await prisma.shipmentQuote.upsert({
    where: { shipmentId: SHIPMENT_REQUESTED_ID },
    update: {},
    create: {
      id: SHIPMENT_QUOTE_2_ID,
      shipmentId: SHIPMENT_REQUESTED_ID,
      baseFare: 1500.00,
      distanceFare: 800.00,
      weightFare: 0.00,
      surgeMultiplier: 1.0,
      totalFare: 2300.00,
      expiresAt: new Date(Date.now() + 50 * 60 * 1000)
    }
  });

  // Hashed OTP records for active Shipment 2
  await prisma.shipmentOtp.upsert({
    where: { shipmentId_otpType: { shipmentId: SHIPMENT_REQUESTED_ID, otpType: ShipmentOtpType.PICKUP } },
    update: {},
    create: {
      shipmentId: SHIPMENT_REQUESTED_ID,
      otpType: ShipmentOtpType.PICKUP,
      otpHash,
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000)
    }
  });

  await prisma.shipmentOtp.upsert({
    where: { shipmentId_otpType: { shipmentId: SHIPMENT_REQUESTED_ID, otpType: ShipmentOtpType.DELIVERY } },
    update: {},
    create: {
      shipmentId: SHIPMENT_REQUESTED_ID,
      otpType: ShipmentOtpType.DELIVERY,
      otpHash,
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000)
    }
  });

  console.log('RYDALUX local preview QA seed database populated successfully.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
