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
  DocumentStatus,
  KycStatus,
  ServiceType
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Stable UUIDs for idempotent operations seeding
const RIDER_A_USER_ID = 'c01a1a1a-a1a1-a1a1-a1a1-a1a1a1a1a1a1';
const RIDER_B_USER_ID = 'c02a2a2a-a2a2-a2a2-a2a2-a2a2a2a2a2a2';
const RIDER_C_USER_ID = 'c03a3a3a-a3a3-a3a3-a3a3-a3a3a3a3a3a3';

const RIDER_A_PROFILE_ID = 'c01b1b1b-b1b1-b1b1-b1b1-b1b1b1b1b1b1';
const RIDER_B_PROFILE_ID = 'c02b2b2b-b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2';
const RIDER_C_PROFILE_ID = 'c03b2b2b-b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b3';

const DRIVER_A_USER_ID = 'd01a1a1a-a1a1-a1a1-a1a1-a1a1a1a1a1a1';
const DRIVER_B_USER_ID = 'd02a2a2a-a2a2-a2a2-a2a2-a2a2-a2a2a2a2a2a2';
const DRIVER_C_USER_ID = 'd03a3a3a-a3a3-a3a3-a3a3-a3a3-a3a3a3a3a3a3';

const DRIVER_A_PROFILE_ID = 'd01b1b1b-b1b1-b1b1-b1b1-b1b1b1b1b1b1';
const DRIVER_B_PROFILE_ID = 'd02b2b2b-b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2';
const DRIVER_C_PROFILE_ID = 'd03b2b2b-b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b3';

const VEHICLE_A_ID = 'a01a1a1a-a1a1-a1a1-a1a1-a1a1a1a1a1a1';
const VEHICLE_B_ID = 'a02a2a2a-a2a2-a2a2-a2a2-a2a2a2a2a2a2';
const VEHICLE_C_ID = 'a03a3a3a-a3a3-a3a3-a3a3-a3a3a3a3a3a3';

const BANK_A_ID = 'b01a1a1a-a1a1-a1a1-a1a1-a1a1a1a1a1a1';
const BANK_B_ID = 'b02a2a2a-a2a2-a2a2-a2a2-a2a2-a2a2a2a2a2a2';
const BANK_C_ID = 'b03a3a3a-a3a3-a3a3-a3a3-a3a3a3a3a3a3';

const DOC_A_ID = 'e01d1d1d-d1d1-d1d1-d1d1-d1d1d1d1d1d1';
const DOC_B_ID = 'e02d2d2d-d2d2-d2d2-d2d2-d2d2d2d2d2d2';
const DOC_C_ID = 'e03d3d3d-d3d3-d3d3-d3d3-d3d3d3d3d3d3';

const KYC_A_ID = 'k01a1a1a-a1a1-a1a1-a1a1-a1a1a1a1a1a1';
const KYC_B_ID = 'k02a2a2a-a2a2-a2a2-a2a2-a2a2a2a2a2a2';
const KYC_C_ID = 'k03a3a3a-a3a3-a3a3-a3a3-a3a3a3a3a3a3';

const TRIP_1_ID = 't01a1a1a-a1a1-a1a1-a1a1-a1a1a1a1a1a1';
const TRIP_2_ID = 't02a2a2a-a2a2-a2a2-a2a2-a2a2a2a2a2a2';
const TRIP_3_ID = 't03a3a3a-a3a3-a3a3-a3a3-a3a3a3a3a3a3';
const TRIP_4_ID = 't04a4a4a-a4a4-a4a4-a4a4-a4a4a4a4a4a4';
const TRIP_5_ID = 't05a5a5a-a5a5-a5a5-a5a5-a5a5a5a5a5a5';

const PAYMENT_1_ID = 'p01a1a1a-a1a1-a1a1-a1a1-a1a1a1a1a1a1';
const PAYMENT_2_ID = 'p02a2a2a-a2a2-a2a2-a2a2-a2a2a2a2a2a2';
const PAYMENT_3_ID = 'p03a3a3a-a3a3-a3a3-a3a3-a3a3a3a3a3a3';

const PAYOUT_1_ID = 'w01a1a1a-a1a1-a1a1-a1a1-a1a1a1a1a1a1';
const PAYOUT_2_ID = 'w02a2a2a-a2a2-a2a2-a2a2-a2a2a2a2a2a2';
const PAYOUT_3_ID = 'w03a3a3a-a3a3-a3a3-a3a3-a3a3a3a3a3a3';
const PAYOUT_4_ID = 'w04a4a4a-a4a4-a4a4-a4a4-a4a4a4a4a4a4';

const WALLET_RIDER_A_ID = 'wl01a1a1a-a1a1-a1a1-a1a1-a1a1a1a1a1a1';
const WALLET_RIDER_B_ID = 'wl02a2a2a-a2a2-a2a2-a2a2-a2a2a2a2a2a2';
const WALLET_RIDER_C_ID = 'wl03a3a3a-a3a3-a3a3-a3a3-a3a3-a3a3a3a3a3a3';
const WALLET_DRIVER_A_ID = 'wl11a1a1a-a1a1-a1a1-a1a1-a1a1a1a1a1a1';
const WALLET_DRIVER_B_ID = 'wl12a2a2a-a2a2-a2a2-a2a2-a2a2a2a2a2a2';
const WALLET_DRIVER_C_ID = 'wl13a3a3a-a3a3-a3a3-a3a3-a3a3-a3a3a3a3a3a3';

const FT_1_ID = 'f01a1a1a-a1a1-a1a1-a1a1-a1a1a1a1a1a1';
const ENTRY_1_ID = 'e01a1a1a-a1a1-a1a1-a1a1-a1a1a1a1a1a1';
const ENTRY_2_ID = 'e02a2a2a-a2a2-a2a2-a2a2-a2a2a2a2a2a2';
const ENTRY_3_ID = 'e03a3a3a-a3a3-a3a3-a3a3-a3a3a3a3a3a3';

const SOS_1_ID = 's01a1a1a-a1a1-a1a1-a1a1-a1a1a1a1a1a1';
const INCIDENT_1_ID = 'i01a1a1a-a1a1-a1a1-a1a1-a1a1a1a1a1a1';

const TICKET_1_ID = 'tk01a1a1a-a1a1-a1a1-a1a1-a1a1a1a1a1a1';
const TICKET_2_ID = 'tk02a2a2a-a2a2-a2a2-a2a2-a2a2a2a2a2a2';
const MSG_1_ID = 'm01a1a1a-a1a1-a1a1-a1a1-a1a1a1a1a1a1';
const MSG_2_ID = 'm02a2a2a-a2a2-a2a2-a2a2-a2a2a2a2a2a2';
const MSG_3_ID = 'm03a3a3a-a3a3-a3a3-a3a3-a3a3a3a3a3a3';

const ATTACHMENT_STAGING_A_ID = 'at01a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1';

async function main() {
  console.log('=== STARTING SAFE STAGING OPERATIONS SEED ===');

  const passwordHash = bcrypt.hashSync('StagingOpsPass123!', 10);
  let userCount = 0;
  let profileCount = 0;
  let vehicleCount = 0;
  let bankAccountCount = 0;
  let documentCount = 0;
  let kycCount = 0;
  let walletCount = 0;
  let tripCount = 0;
  let paymentCount = 0;
  let payoutCount = 0;
  let ledgerAccountCount = 0;
  let ledgerTransactionCount = 0;
  let ledgerEntryCount = 0;
  let supportTicketCount = 0;
  let supportMessageCount = 0;
  let safetyIncidentCount = 0;
  let sosCount = 0;
  let auditLogCount = 0;

  // 1. Seed Riders
  const riders = [
    {
      id: RIDER_A_USER_ID,
      email: 'rider.alpha.staging@rydalux.test',
      phone: '+2349000000001',
      firstName: 'Alpha',
      lastName: 'StagingRider',
      displayName: 'Alpha Rider',
      profileId: RIDER_A_PROFILE_ID
    },
    {
      id: RIDER_B_USER_ID,
      email: 'rider.beta.staging@rydalux.test',
      phone: '+2349000000002',
      firstName: 'Beta',
      lastName: 'StagingRider',
      displayName: 'Beta Rider',
      profileId: RIDER_B_PROFILE_ID
    },
    {
      id: RIDER_C_USER_ID,
      email: 'rider.gamma.staging@rydalux.test',
      phone: '+2349000000003',
      firstName: 'Gamma',
      lastName: 'StagingRider',
      displayName: 'Gamma Rider',
      profileId: RIDER_C_PROFILE_ID
    }
  ];

  for (const rider of riders) {
    const user = await prisma.user.upsert({
      where: { email: rider.email },
      update: {
        firstName: rider.firstName,
        lastName: rider.lastName,
        displayName: rider.displayName,
        phone: rider.phone
      },
      create: {
        id: rider.id,
        email: rider.email,
        phone: rider.phone,
        passwordHash,
        firstName: rider.firstName,
        lastName: rider.lastName,
        displayName: rider.displayName,
        userType: UserType.RIDER,
        isEmailVerified: true,
        isPhoneVerified: true
      }
    });
    userCount++;

    await prisma.riderProfile.upsert({
      where: { userId: user.id },
      update: { isActive: true },
      create: {
        id: rider.profileId,
        userId: user.id,
        isActive: true,
        defaultPaymentMethod: 'CARD'
      }
    });
    profileCount++;

    // Create wallet for riders
    const walletId = rider.id === RIDER_A_USER_ID ? WALLET_RIDER_A_ID :
                     rider.id === RIDER_B_USER_ID ? WALLET_RIDER_B_ID : WALLET_RIDER_C_ID;
    
    await prisma.wallet.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        id: walletId,
        userId: user.id,
        balance: 5000.00,
        currency: 'NGN',
        isBlocked: false
      }
    });
    walletCount++;
  }

  // 2. Seed Drivers
  const drivers = [
    {
      id: DRIVER_A_USER_ID,
      email: 'driver.alpha.staging@rydalux.test',
      phone: '+2349000000004',
      firstName: 'DriverAlpha',
      lastName: 'StagingDriver',
      displayName: 'Driver Alpha',
      profileId: DRIVER_A_PROFILE_ID,
      licenseNumber: 'DL-STAGING-AAA01',
      licensePlate: 'LAG-900-AA',
      status: DriverStatus.AVAILABLE,
      isOnline: true
    },
    {
      id: DRIVER_B_USER_ID,
      email: 'driver.beta.staging@rydalux.test',
      phone: '+2349000000005',
      firstName: 'DriverBeta',
      lastName: 'StagingDriver',
      displayName: 'Driver Beta',
      profileId: DRIVER_B_PROFILE_ID,
      licenseNumber: 'DL-STAGING-BBB02',
      licensePlate: 'LAG-900-BB',
      status: DriverStatus.OFFLINE,
      isOnline: false
    },
    {
      id: DRIVER_C_USER_ID,
      email: 'driver.gamma.staging@rydalux.test',
      phone: '+2349000000006',
      firstName: 'DriverGamma',
      lastName: 'StagingDriver',
      displayName: 'Driver Gamma',
      profileId: DRIVER_C_PROFILE_ID,
      licenseNumber: 'DL-STAGING-CCC03',
      licensePlate: 'LAG-900-CC',
      status: DriverStatus.SUSPENDED,
      isOnline: false
    }
  ];

  for (const driver of drivers) {
    const user = await prisma.user.upsert({
      where: { email: driver.email },
      update: {
        firstName: driver.firstName,
        lastName: driver.lastName,
        displayName: driver.displayName,
        phone: driver.phone
      },
      create: {
        id: driver.id,
        email: driver.email,
        phone: driver.phone,
        passwordHash,
        firstName: driver.firstName,
        lastName: driver.lastName,
        displayName: driver.displayName,
        userType: UserType.DRIVER,
        isEmailVerified: true,
        isPhoneVerified: true
      }
    });
    userCount++;

    await prisma.driverProfile.upsert({
      where: { userId: user.id },
      update: {
        currentStatus: driver.status,
        isOnline: driver.isOnline,
        licenseNumber: driver.licenseNumber,
        licensePlate: driver.licensePlate
      },
      create: {
        id: driver.profileId,
        userId: user.id,
        currentStatus: driver.status,
        isOnline: driver.isOnline,
        licenseNumber: driver.licenseNumber,
        licensePlate: driver.licensePlate,
        averageRating: 4.90
      }
    });
    profileCount++;

    // Create wallet for drivers
    const walletId = driver.id === DRIVER_A_USER_ID ? WALLET_DRIVER_A_ID :
                     driver.id === DRIVER_B_USER_ID ? WALLET_DRIVER_B_ID : WALLET_DRIVER_C_ID;
    
    await prisma.wallet.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        id: walletId,
        userId: user.id,
        balance: 25000.00,
        currency: 'NGN',
        isBlocked: false
      }
    });
    walletCount++;
  }

  // 3. Seed Driver Bank Accounts (NGN / fake Paystack recipient codes)
  const bankAccounts = [
    {
      id: BANK_A_ID,
      profileId: DRIVER_A_PROFILE_ID,
      bankCode: '058',
      bankName: 'Guaranty Trust Bank',
      accountName: 'DriverAlpha StagingDriver',
      accountNumberLast4: '0011',
      recipientCode: 'RCP_staging_driver_alpha'
    },
    {
      id: BANK_B_ID,
      profileId: DRIVER_B_PROFILE_ID,
      bankCode: '011',
      bankName: 'First Bank of Nigeria',
      accountName: 'DriverBeta StagingDriver',
      accountNumberLast4: '0022',
      recipientCode: 'RCP_staging_driver_beta'
    },
    {
      id: BANK_C_ID,
      profileId: DRIVER_C_PROFILE_ID,
      bankCode: '033',
      bankName: 'United Bank for Africa',
      accountName: 'DriverGamma StagingDriver',
      accountNumberLast4: '0033',
      recipientCode: 'RCP_staging_driver_gamma'
    }
  ];

  for (const acct of bankAccounts) {
    await prisma.driverBankAccount.upsert({
      where: { driverProfileId: acct.profileId },
      update: {
        bankCode: acct.bankCode,
        bankName: acct.bankName,
        accountName: acct.accountName,
        accountNumberLast4: acct.accountNumberLast4,
        paystackRecipientCode: acct.recipientCode
      },
      create: {
        id: acct.id,
        driverProfileId: acct.profileId,
        bankCode: acct.bankCode,
        bankName: acct.bankName,
        accountName: acct.accountName,
        accountNumberLast4: acct.accountNumberLast4,
        currency: 'NGN',
        provider: 'paystack',
        paystackRecipientCode: acct.recipientCode,
        verifiedAt: new Date()
      }
    });
    bankAccountCount++;
  }

  // 4. Seed Vehicles
  const vehicles = [
    {
      id: VEHICLE_A_ID,
      driverProfileId: DRIVER_A_PROFILE_ID,
      registrationNumber: 'LAG-900-AA',
      make: 'Toyota',
      model: 'Corolla',
      year: 2021,
      color: 'White',
      vehicleType: 'REGULAR',
      status: VehicleStatus.ACTIVE
    },
    {
      id: VEHICLE_B_ID,
      driverProfileId: DRIVER_B_PROFILE_ID,
      registrationNumber: 'LAG-900-BB',
      make: 'Lexus',
      model: 'ES350',
      year: 2020,
      color: 'Dark Grey',
      vehicleType: 'PREMIUM',
      status: VehicleStatus.ACTIVE
    },
    {
      id: VEHICLE_C_ID,
      driverProfileId: DRIVER_C_PROFILE_ID,
      registrationNumber: 'LAG-900-CC',
      make: 'Hyundai',
      model: 'Accent',
      year: 2019,
      color: 'Black',
      vehicleType: 'REGULAR',
      status: VehicleStatus.MAINTENANCE
    }
  ];

  for (const v of vehicles) {
    await prisma.vehicle.upsert({
      where: { registrationNumber: v.registrationNumber },
      update: {
        make: v.make,
        model: v.model,
        color: v.color,
        status: v.status
      },
      create: {
        id: v.id,
        driverProfileId: v.driverProfileId,
        registrationNumber: v.registrationNumber,
        make: v.make,
        model: v.model,
        year: v.year,
        color: v.color,
        capacity: 4,
        vehicleType: v.vehicleType,
        status: v.status,
        approvedAt: new Date(),
        verifiedAt: new Date()
      }
    });
    vehicleCount++;

    // Link vehicle as active activeVehicleId for driver profile
    await prisma.driverProfile.update({
      where: { id: v.driverProfileId },
      data: { activeVehicleId: v.id }
    });
  }

  // 5. Seed KYC Checks & Documents
  const kycRecords = [
    {
      id: KYC_A_ID,
      userId: DRIVER_A_USER_ID,
      status: KycStatus.APPROVED,
      notes: 'Cleared - staging testing verification.'
    },
    {
      id: KYC_B_ID,
      userId: DRIVER_B_USER_ID,
      status: KycStatus.SUBMITTED,
      notes: 'Awaiting support agent document validation.'
    },
    {
      id: KYC_C_ID,
      userId: DRIVER_C_USER_ID,
      status: KycStatus.PENDING,
      notes: 'KYC check generated. Awaiting user details submission.'
    }
  ];

  for (const k of kycRecords) {
    await prisma.kycCheck.upsert({
      where: { id: k.id },
      update: { status: k.status, notes: k.notes },
      create: {
        id: k.id,
        userId: k.userId,
        status: k.status,
        provider: 'smile_identity',
        notes: k.notes,
        submittedAt: new Date(Date.now() - 24 * 3600 * 1000)
      }
    });
    kycCount++;
  }

  const driverDocs = [
    {
      id: DOC_A_ID,
      userId: DRIVER_A_USER_ID,
      documentType: 'DRIVERS_LICENSE',
      status: DocumentStatus.APPROVED,
      url: 'https://staging.rydalux.test/documents/license_alpha.pdf'
    },
    {
      id: DOC_B_ID,
      userId: DRIVER_B_USER_ID,
      documentType: 'DRIVERS_LICENSE',
      status: DocumentStatus.PENDING,
      url: 'https://staging.rydalux.test/documents/license_beta.pdf'
    },
    {
      id: DOC_C_ID,
      userId: DRIVER_C_USER_ID,
      documentType: 'DRIVERS_LICENSE',
      status: DocumentStatus.REJECTED,
      url: 'https://staging.rydalux.test/documents/license_gamma.pdf'
    }
  ];

  for (const doc of driverDocs) {
    await prisma.driverDocument.upsert({
      where: { id: doc.id },
      update: { status: doc.status, documentUrl: doc.url },
      create: {
        id: doc.id,
        userId: doc.userId,
        documentType: doc.documentType,
        status: doc.status,
        documentUrl: doc.url,
        issuedAt: new Date(Date.now() - 365 * 24 * 3600 * 1000),
        expiresAt: new Date(Date.now() + 365 * 24 * 3600 * 1000),
        verifiedAt: doc.status === DocumentStatus.APPROVED ? new Date() : null
      }
    });
    documentCount++;
  }

  // 6. Seed Trips across multiple statuses
  const trips = [
    {
      id: TRIP_1_ID,
      reference: 'TRIP-STAGING-001',
      riderProfileId: RIDER_A_PROFILE_ID,
      driverProfileId: DRIVER_A_PROFILE_ID,
      vehicleId: VEHICLE_A_ID,
      serviceType: ServiceType.REGULAR,
      status: TripStatus.COMPLETED,
      pickup: '24 Campbell Street, Lagos Island, Lagos',
      dropoff: '88 Bode Thomas Street, Surulere, Lagos',
      pickupLat: 6.4521,
      pickupLon: 3.3950,
      dropoffLat: 6.5015,
      dropoffLon: 3.3582,
      distance: 12000,
      duration: 1200,
      startedAt: new Date(Date.now() - 4 * 3600 * 1000),
      completedAt: new Date(Date.now() - 4 * 3600 * 1000 + 1200000)
    },
    {
      id: TRIP_2_ID,
      reference: 'TRIP-STAGING-002',
      riderProfileId: RIDER_B_PROFILE_ID,
      driverProfileId: DRIVER_B_PROFILE_ID,
      vehicleId: VEHICLE_B_ID,
      serviceType: ServiceType.PREMIUM,
      status: TripStatus.IN_PROGRESS,
      pickup: 'Radisson Blu Hotel, Victoria Island, Lagos',
      dropoff: 'Murtala Muhammed International Airport, Ikeja, Lagos',
      pickupLat: 6.4258,
      pickupLon: 3.4095,
      dropoffLat: 6.5774,
      dropoffLon: 3.3210,
      distance: 28000,
      duration: 2700,
      startedAt: new Date(Date.now() - 15 * 60 * 1000)
    },
    {
      id: TRIP_3_ID,
      reference: 'TRIP-STAGING-003',
      riderProfileId: RIDER_C_PROFILE_ID,
      driverProfileId: DRIVER_A_PROFILE_ID,
      vehicleId: VEHICLE_A_ID,
      serviceType: ServiceType.REGULAR,
      status: TripStatus.CANCELLED_BY_RIDER,
      pickup: 'Federal Palace Hotel, Victoria Island, Lagos',
      dropoff: 'Silverbird Galleria, Victoria Island, Lagos',
      pickupLat: 6.4239,
      pickupLon: 3.4042,
      dropoffLat: 6.4302,
      dropoffLon: 3.4079,
      distance: 2100,
      duration: 300,
      cancelledAt: new Date(Date.now() - 1 * 3600 * 1000),
      cancellationReason: 'Rider changed plans'
    },
    {
      id: TRIP_4_ID,
      reference: 'TRIP-STAGING-004',
      riderProfileId: RIDER_A_PROFILE_ID,
      driverProfileId: null,
      vehicleId: null,
      serviceType: ServiceType.REGULAR,
      status: TripStatus.REQUESTED,
      pickup: 'Chevron Drive, Lekki, Lagos',
      dropoff: 'Spar Supermarket, Lekki, Lagos',
      pickupLat: 6.4385,
      pickupLon: 3.5241,
      dropoffLat: 6.4442,
      dropoffLon: 3.4908,
      distance: 5500,
      duration: 900
    },
    {
      id: TRIP_5_ID,
      reference: 'TRIP-STAGING-005',
      riderProfileId: RIDER_B_PROFILE_ID,
      driverProfileId: DRIVER_C_PROFILE_ID,
      vehicleId: VEHICLE_C_ID,
      serviceType: ServiceType.REGULAR,
      status: TripStatus.DRIVER_ASSIGNED,
      pickup: 'Shoprite Circle Mall, Jakande, Lekki, Lagos',
      dropoff: 'Orchid Road, Lekki, Lagos',
      pickupLat: 6.4350,
      pickupLon: 3.5012,
      dropoffLat: 6.4390,
      dropoffLon: 3.5420,
      distance: 6800,
      duration: 1100
    }
  ];

  for (const t of trips) {
    await prisma.trip.upsert({
      where: { id: t.id },
      update: {
        status: t.status,
        driverProfileId: t.driverProfileId,
        vehicleId: t.vehicleId,
        startedAt: t.startedAt || null,
        completedAt: t.completedAt || null,
        cancelledAt: t.cancelledAt || null,
        cancellationReason: t.cancellationReason || null
      },
      create: {
        id: t.id,
        reference: t.reference,
        riderProfileId: t.riderProfileId,
        driverProfileId: t.driverProfileId,
        vehicleId: t.vehicleId,
        serviceType: t.serviceType,
        status: t.status,
        pickupAddress: t.pickup,
        dropoffAddress: t.dropoff,
        pickupLatitude: t.pickupLat,
        pickupLongitude: t.pickupLon,
        dropoffLatitude: t.dropoffLat,
        dropoffLongitude: t.dropoffLon,
        distanceMeters: t.distance,
        durationSeconds: t.duration,
        pinCode: '7788',
        createdAt: new Date(Date.now() - 5 * 3600 * 1000),
        startedAt: t.startedAt || null,
        completedAt: t.completedAt || null,
        cancelledAt: t.cancelledAt || null,
        cancellationReason: t.cancellationReason || null
      }
    });
    tripCount++;
  }

  // 7. Seed Payments across multiple statuses
  const payments = [
    {
      id: PAYMENT_1_ID,
      userId: RIDER_A_USER_ID,
      tripId: TRIP_1_ID,
      amount: 8500.00,
      status: PaymentStatus.CAPTURED,
      reference: 'PAY-STAGING-001',
      externalId: 'chg_staging_alpha_981'
    },
    {
      id: PAYMENT_2_ID,
      userId: RIDER_B_USER_ID,
      tripId: TRIP_2_ID,
      amount: 15200.00,
      status: PaymentStatus.PENDING,
      reference: 'PAY-STAGING-002',
      externalId: 'chg_staging_beta_342'
    },
    {
      id: PAYMENT_3_ID,
      userId: RIDER_C_USER_ID,
      tripId: TRIP_3_ID,
      amount: 2500.00,
      status: PaymentStatus.FAILED,
      reference: 'PAY-STAGING-003',
      externalId: 'chg_staging_gamma_112'
    }
  ];

  for (const pay of payments) {
    await prisma.payment.upsert({
      where: { id: pay.id },
      update: { status: pay.status },
      create: {
        id: pay.id,
        userId: pay.userId,
        tripId: pay.tripId,
        amount: pay.amount,
        currency: 'NGN',
        provider: 'paystack',
        status: pay.status,
        reference: pay.reference,
        externalId: pay.externalId,
        createdAt: new Date(Date.now() - 4 * 3600 * 1000)
      }
    });
    paymentCount++;
  }

  // 8. Seed Payouts across multiple statuses
  const payouts = [
    {
      id: PAYOUT_1_ID,
      driverProfileId: DRIVER_A_PROFILE_ID,
      amount: 45000.00,
      status: PayoutStatus.PAID,
      providerReference: 'TRF-STAGING-PAID-001',
      transferCode: 'trf_code_staging_alpha_101',
      processedAt: new Date(Date.now() - 24 * 3600 * 1000)
    },
    {
      id: PAYOUT_2_ID,
      driverProfileId: DRIVER_B_PROFILE_ID,
      amount: 18000.00,
      status: PayoutStatus.PROCESSING,
      providerReference: 'TRF-STAGING-PROC-002',
      transferCode: 'trf_code_staging_beta_202',
      processedAt: null
    },
    {
      id: PAYOUT_3_ID,
      driverProfileId: DRIVER_C_PROFILE_ID,
      amount: 9500.00,
      status: PayoutStatus.REQUESTED,
      providerReference: null,
      transferCode: null,
      processedAt: null
    },
    {
      id: PAYOUT_4_ID,
      driverProfileId: DRIVER_A_PROFILE_ID,
      amount: 60000.00,
      status: PayoutStatus.FAILED,
      providerReference: 'TRF-STAGING-FAIL-004',
      transferCode: 'trf_code_staging_fail_404',
      processedAt: null
    }
  ];

  for (const po of payouts) {
    await prisma.payout.upsert({
      where: { id: po.id },
      update: { status: po.status },
      create: {
        id: po.id,
        driverProfileId: po.driverProfileId,
        amount: po.amount,
        currency: 'NGN',
        status: po.status,
        provider: 'paystack',
        providerReference: po.providerReference,
        providerTransferCode: po.transferCode,
        requestedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000),
        processedAt: po.processedAt
      }
    });
    payoutCount++;
  }

  // 9. Seed Ledger Accounts
  const ledgerAccounts = [
    { code: '1010', name: 'Bank Settlement Account', accountType: 'ASSET' },
    { code: '1200', name: 'Rider Receivables', accountType: 'ASSET' },
    { code: '2100', name: 'Driver Payables', accountType: 'LIABILITY' },
    { code: '4000', name: 'Platform Commission Revenue', accountType: 'REVENUE' }
  ];

  const spawnedLedgerAccounts: Record<string, any> = {};

  for (const la of ledgerAccounts) {
    const record = await prisma.ledgerAccount.upsert({
      where: { code: la.code },
      update: {},
      create: {
        code: la.code,
        name: la.name,
        accountType: la.accountType,
        currency: 'NGN',
        balance: 1000000.00,
        isSystem: true
      }
    });
    ledgerAccountCount++;
    spawnedLedgerAccounts[la.code] = record;
  }

  // 10. Seed Double-entry Ledger Transactions for Trip 1
  const ledgerCashAcct = spawnedLedgerAccounts['1010'];
  const ledgerPayableAcct = spawnedLedgerAccounts['2100'];
  const ledgerRevenueAcct = spawnedLedgerAccounts['4000'];

  if (ledgerCashAcct && ledgerPayableAcct && ledgerRevenueAcct) {
    const ft = await prisma.financialTransaction.upsert({
      where: { id: FT_1_ID },
      update: {},
      create: {
        id: FT_1_ID,
        eventType: LedgerEventType.RIDER_PAYMENT_CAPTURED,
        reference: 'FT-STAGING-OPS-CAPTURED-001',
        referenceType: 'PAYMENT',
        referenceId: PAYMENT_1_ID,
        paymentId: PAYMENT_1_ID,
        tripId: TRIP_1_ID,
        amount: 8500.00,
        totalDebit: 8500.00,
        totalCredit: 8500.00,
        status: 'POSTED',
        postedAt: new Date(Date.now() - 4 * 3600 * 1000)
      }
    });
    ledgerTransactionCount++;

    // Debit Cash (NGN 8500)
    await prisma.ledgerEntry.upsert({
      where: { id: ENTRY_1_ID },
      update: {},
      create: {
        id: ENTRY_1_ID,
        ledgerAccountId: ledgerCashAcct.id,
        financialTransactionId: FT_1_ID,
        eventType: LedgerEventType.RIDER_PAYMENT_CAPTURED,
        transactionType: TransactionType.DEBIT,
        amount: 8500.00,
        balanceAfter: 1008500.00,
        referenceType: 'PAYMENT',
        referenceId: PAYMENT_1_ID,
        description: 'Debit Bank cash settlement for Staging Rider Payment captured.'
      }
    });
    ledgerEntryCount++;

    // Credit Driver Payables (NGN 6800 - 80% to driver)
    await prisma.ledgerEntry.upsert({
      where: { id: ENTRY_2_ID },
      update: {},
      create: {
        id: ENTRY_2_ID,
        ledgerAccountId: ledgerPayableAcct.id,
        financialTransactionId: FT_1_ID,
        eventType: LedgerEventType.RIDER_PAYMENT_CAPTURED,
        transactionType: TransactionType.CREDIT,
        amount: 6800.00,
        balanceAfter: 1006800.00,
        referenceType: 'PAYMENT',
        referenceId: PAYMENT_1_ID,
        description: 'Credit Driver payable staging balance (80%).'
      }
    });
    ledgerEntryCount++;

    // Credit Platform Commission Revenue (NGN 1700 - 20% commission)
    await prisma.ledgerEntry.upsert({
      where: { id: ENTRY_3_ID },
      update: {},
      create: {
        id: ENTRY_3_ID,
        ledgerAccountId: ledgerRevenueAcct.id,
        financialTransactionId: FT_1_ID,
        eventType: LedgerEventType.RIDER_PAYMENT_CAPTURED,
        transactionType: TransactionType.CREDIT,
        amount: 1700.00,
        balanceAfter: 1001700.00,
        referenceType: 'PAYMENT',
        referenceId: PAYMENT_1_ID,
        description: 'Credit Platform commission staging revenue (20%).'
      }
    });
    ledgerEntryCount++;
  }

  // 11. Seed Support Tickets & Messages
  // Let's resolve the Support Agent/AdminUser context dynamically
  const supportUser = await prisma.user.findFirst({
    where: { email: 'support@rydalux.local' }
  });
  const adminUser = await prisma.adminUser.findFirst({
    where: { userId: supportUser?.id || '' }
  });

  const supportTickets = [
    {
      id: TICKET_1_ID,
      createdById: RIDER_A_USER_ID,
      title: 'Staging Payment Dispute - Charged Double',
      description: 'Staging environment showed error but my card was debited twice NGN 8,500.',
      type: SupportTicketType.PAYMENT_ISSUE,
      status: SupportStatus.OPEN,
      priority: SupportTicketPriority.HIGH,
      tripId: TRIP_1_ID,
      paymentId: PAYMENT_1_ID
    },
    {
      id: TICKET_2_ID,
      createdById: RIDER_B_USER_ID,
      title: 'Active Premium Ride Telemetry Issue',
      description: 'Active premium staging trip from Radisson shows slight navigation lags.',
      type: SupportTicketType.SAFETY_ISSUE,
      status: SupportStatus.IN_REVIEW,
      priority: SupportTicketPriority.URGENT,
      tripId: TRIP_2_ID,
      paymentId: PAYMENT_2_ID
    }
  ];

  for (const st of supportTickets) {
    await prisma.supportTicket.upsert({
      where: { id: st.id },
      update: { status: st.status, priority: st.priority },
      create: {
        id: st.id,
        createdById: st.createdById,
        assignedToId: adminUser?.id || null,
        title: st.title,
        description: st.description,
        type: st.type,
        status: st.status,
        priority: st.priority,
        tripId: st.tripId,
        paymentId: st.paymentId,
        createdAt: new Date(Date.now() - 10 * 3600 * 1000)
      }
    });
    supportTicketCount++;
  }

  const messages = [
    {
      id: MSG_1_ID,
      ticketId: TICKET_1_ID,
      authorId: RIDER_A_USER_ID,
      content: 'Hello, please review this captured transaction. Staging Payment reference is PAY-STAGING-001.',
      isInternal: false
    },
    {
      id: MSG_2_ID,
      ticketId: TICKET_1_ID,
      authorId: supportUser?.id || RIDER_A_USER_ID, // Use support User if found, fallback to Rider
      content: 'Investigation started. Telemetry logs and mock Paystack API payload are being reviewed.',
      isInternal: true
    },
    {
      id: MSG_3_ID,
      ticketId: TICKET_1_ID,
      authorId: supportUser?.id || RIDER_A_USER_ID,
      content: 'We noticed a mock retry payload was sent. An adjustment has been initiated.',
      isInternal: false
    }
  ];

  for (const m of messages) {
    await prisma.supportTicketMessage.upsert({
      where: { id: m.id },
      update: {},
      create: {
        id: m.id,
        ticketId: m.ticketId,
        authorId: m.authorId,
        content: m.content,
        isInternal: m.isInternal,
        createdAt: new Date(Date.now() - 9 * 3600 * 1000)
      }
    });
    supportMessageCount++;
  }

  // Add a support ticket attachment mock
  await prisma.supportTicketAttachment.upsert({
    where: { id: ATTACHMENT_STAGING_A_ID },
    update: {},
    create: {
      id: ATTACHMENT_STAGING_A_ID,
      ticketId: TICKET_1_ID,
      uploadedById: RIDER_A_USER_ID,
      fileName: 'staging_payment_error_receipt.png',
      fileSize: 45280,
      mimeType: 'image/png',
      storageKey: 'staging/tickets/PAY-STAGING-001-err.png',
      uploadedAt: new Date()
    }
  });

  // 12. Seed Safety Incidents and SOS events
  await prisma.sosEvent.upsert({
    where: { id: SOS_1_ID },
    update: { status: SosStatus.ACKNOWLEDGED },
    create: {
      id: SOS_1_ID,
      userId: RIDER_B_USER_ID,
      tripId: TRIP_2_ID,
      type: SosEventType.PANIC,
      status: SosStatus.ACKNOWLEDGED,
      latitude: 6.4258,
      longitude: 3.4095,
      notes: 'Staging premium trip B SOS test alert triggered.',
      triggeredAt: new Date(Date.now() - 10 * 60 * 1000)
    }
  });
  sosCount++;

  await prisma.incidentReport.upsert({
    where: { id: INCIDENT_1_ID },
    update: { status: IncidentStatus.INVESTIGATING },
    create: {
      id: INCIDENT_1_ID,
      tripId: TRIP_1_ID,
      reportedById: RIDER_A_USER_ID,
      severity: IncidentSeverity.MEDIUM,
      status: IncidentStatus.INVESTIGATING,
      description: 'Sudden braking incident during completed trip #001 Lekki scheme route.',
      createdAt: new Date(Date.now() - 3 * 3600 * 1000)
    }
  });
  safetyIncidentCount++;

  // 13. Seed Audit Logs
  const auditLogs = [
    {
      actorId: RIDER_A_USER_ID,
      action: 'TRIP_CANCELLED',
      entity: 'Trip',
      entityId: TRIP_3_ID,
      payload: { reason: 'Rider cancelled from active operations seed script' }
    },
    {
      actorId: DRIVER_A_USER_ID,
      action: 'DRIVER_ONLINE',
      entity: 'DriverProfile',
      entityId: DRIVER_A_PROFILE_ID,
      payload: { mode: 'AVAILABLE' }
    },
    {
      actorId: supportUser?.id || RIDER_B_USER_ID,
      action: 'KYC_APPROVED',
      entity: 'KycCheck',
      entityId: KYC_A_ID,
      payload: { verification: 'SmileID Staging Mock Clean' }
    }
  ];

  for (const al of auditLogs) {
    await prisma.auditLog.create({
      data: {
        actorId: al.actorId,
        action: al.action,
        entity: al.entity,
        entityId: al.entityId,
        payload: al.payload,
        createdAt: new Date()
      }
    });
    auditLogCount++;
  }

  console.log('\n=== STAGING OPERATIONS DATABASE SEEDING COMPLETED ===');
  console.log(`- Created/Upserted Users: ${userCount}`);
  console.log(`- Created/Upserted Profiles: ${profileCount}`);
  console.log(`- Created/Upserted Wallets: ${walletCount}`);
  console.log(`- Created/Upserted Vehicles: ${vehicleCount}`);
  console.log(`- Created/Upserted Bank Accounts: ${bankAccountCount}`);
  console.log(`- Created/Upserted KYC Checks: ${kycCount}`);
  console.log(`- Created/Upserted Driver Documents: ${documentCount}`);
  console.log(`- Created/Upserted Trips: ${tripCount}`);
  console.log(`- Created/Upserted Payments: ${paymentCount}`);
  console.log(`- Created/Upserted Payouts: ${payoutCount}`);
  console.log(`- Created/Upserted Ledger Accounts: ${ledgerAccountCount}`);
  console.log(`- Created/Upserted Ledger Transactions: ${ledgerTransactionCount}`);
  console.log(`- Created/Upserted Ledger Entries: ${ledgerEntryCount}`);
  console.log(`- Created/Upserted Support Tickets: ${supportTicketCount}`);
  console.log(`- Created/Upserted Support Messages: ${supportMessageCount}`);
  console.log(`- Created/Upserted SOS Events: ${sosCount}`);
  console.log(`- Created/Upserted Safety Incidents: ${safetyIncidentCount}`);
  console.log(`- Created/Upserted Audit Logs: ${auditLogCount}`);
  console.log('=====================================================\n');
}

main()
  .catch((error) => {
    console.error('Error during staging operations seed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
