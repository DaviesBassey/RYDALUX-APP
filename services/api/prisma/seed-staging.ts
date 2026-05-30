import { PrismaClient, UserType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Stable UUID constants for consistent upsert and idempotency
const USER_ADMIN_ID = 'e1e1e1e1-e1e1-e1e1-e1e1-e1e1e1e1e1e1';
const ADMIN_USER_ADMIN_ID = '99999999-9999-9999-9999-999999999991';

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
  console.log('Seeding staging admin roles and permissions...');

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

  console.log('Staging Admin RBAC permissions seeded successfully.');
}

async function main() {
  const adminEmail = process.env.STAGING_ADMIN_EMAIL;
  const adminPassword = process.env.STAGING_ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    throw new Error('FATAL: STAGING_ADMIN_EMAIL and STAGING_ADMIN_PASSWORD environment variables must be defined.');
  }

  if (adminPassword.length < 12) {
    throw new Error('FATAL: STAGING_ADMIN_PASSWORD must be at least 12 characters.');
  }

  // Hash password securely
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  // Seed permissions and roles first
  await seedPermissionsAndRoles();

  console.log('Provisioning minimal Staging Super Admin user...');

  // Create or update Staging Super Admin
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash },
    create: {
      id: USER_ADMIN_ID,
      email: adminEmail,
      phone: '+2348000000001',
      passwordHash,
      firstName: 'Staging',
      lastName: 'Admin',
      displayName: 'Staging Super Admin',
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
      create: {
        id: ADMIN_USER_ADMIN_ID,
        userId: USER_ADMIN_ID,
        roleId: superAdminRole.id,
        isActive: true
      }
    });
  }

  console.log('Idempotent Staging Admin seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
