// RBAC (Role-Based Access Control) utilities

export type AdminRole = 'ADMIN' | 'SAFETY_OFFICER' | 'SUPPORT_OFFICER' | 'FINANCE_MANAGER' | 'DRIVER_ONBOARDING';

export type Permission =
  | 'MANAGE_USERS'
  | 'MANAGE_DRIVERS'
  | 'MANAGE_RIDERS'
  | 'MANAGE_KYC'
  | 'MANAGE_DOCUMENTS'
  | 'MANAGE_VEHICLES'
  | 'MANAGE_TRIPS'
  | 'MANAGE_PAYMENTS'
  | 'MANAGE_PAYOUTS'
  | 'MANAGE_LEDGER'
  | 'MANAGE_SAFETY'
  | 'MANAGE_SUPPORT'
  | 'VIEW_AUDIT_LOGS'
  | 'MANAGE_SETTINGS';

const rolePermissions: Record<AdminRole, Permission[]> = {
  ADMIN: [
    'MANAGE_USERS',
    'MANAGE_DRIVERS',
    'MANAGE_RIDERS',
    'MANAGE_KYC',
    'MANAGE_DOCUMENTS',
    'MANAGE_VEHICLES',
    'MANAGE_TRIPS',
    'MANAGE_PAYMENTS',
    'MANAGE_PAYOUTS',
    'MANAGE_LEDGER',
    'MANAGE_SAFETY',
    'MANAGE_SUPPORT',
    'VIEW_AUDIT_LOGS',
    'MANAGE_SETTINGS',
  ],
  SAFETY_OFFICER: ['MANAGE_SAFETY', 'MANAGE_SUPPORT', 'VIEW_AUDIT_LOGS'],
  SUPPORT_OFFICER: ['MANAGE_SUPPORT', 'VIEW_AUDIT_LOGS'],
  FINANCE_MANAGER: ['MANAGE_PAYMENTS', 'MANAGE_PAYOUTS', 'MANAGE_LEDGER', 'VIEW_AUDIT_LOGS'],
  DRIVER_ONBOARDING: ['MANAGE_DRIVERS', 'MANAGE_KYC', 'MANAGE_DOCUMENTS', 'MANAGE_VEHICLES', 'VIEW_AUDIT_LOGS'],
};

const pagePermissions: Record<string, Permission[]> = {
  'dashboard': [],
  'users': ['MANAGE_USERS'],
  'riders': ['MANAGE_RIDERS'],
  'drivers': ['MANAGE_DRIVERS', 'MANAGE_DOCUMENTS'],
  'kyc': ['MANAGE_KYC'],
  'vehicles': ['MANAGE_VEHICLES'],
  'trips': ['MANAGE_TRIPS'],
  'payments': ['MANAGE_PAYMENTS'],
  'payouts': ['MANAGE_PAYOUTS'],
  'ledger': ['MANAGE_LEDGER'],
  'safety': ['MANAGE_SAFETY'],
  'support': ['MANAGE_SUPPORT'],
  'audit-logs': ['VIEW_AUDIT_LOGS'],
  'settings': ['MANAGE_SETTINGS'],
};

export function hasPermission(role: AdminRole, requiredPermissions: Permission[]): boolean {
  const userPermissions = rolePermissions[role] || [];
  return requiredPermissions.every((perm) => userPermissions.includes(perm));
}

export function canAccessPage(role: AdminRole, pageName: string): boolean {
  const requiredPermissions = pagePermissions[pageName] || [];
  if (requiredPermissions.length === 0) return true; // Dashboard is accessible to all
  return hasPermission(role, requiredPermissions);
}

export function getVisiblePages(role: AdminRole): string[] {
  const allPages = Object.keys(pagePermissions);
  return allPages.filter((page) => canAccessPage(role, page));
}

export function getRoleLabel(role: AdminRole): string {
  const labels: Record<AdminRole, string> = {
    ADMIN: 'Administrator',
    SAFETY_OFFICER: 'Safety Officer',
    SUPPORT_OFFICER: 'Support Officer',
    FINANCE_MANAGER: 'Finance Manager',
    DRIVER_ONBOARDING: 'Driver Onboarding',
  };
  return labels[role] || 'Unknown';
}
