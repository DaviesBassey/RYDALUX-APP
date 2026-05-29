import { colors } from './colors';

export type DriverStatus =
  | 'PENDING_ONBOARDING'
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'SUSPENDED'
  | 'REJECTED';

export interface DriverStatusConfig {
  label: string;
  color: string;
  icon: string;
  isActive: boolean;
  canGoOnline: boolean;
}

export const DRIVER_STATUS_CONFIG: Record<DriverStatus, DriverStatusConfig> = {
  PENDING_ONBOARDING: {
    label: 'Completing Profile',
    color: colors.warning,
    icon: '📋',
    isActive: false,
    canGoOnline: false,
  },
  PENDING_REVIEW: {
    label: 'Under Review',
    color: colors.info,
    icon: '⏳',
    isActive: false,
    canGoOnline: false,
  },
  APPROVED: {
    label: 'Approved',
    color: colors.success,
    icon: '✅',
    isActive: true,
    canGoOnline: true,
  },
  SUSPENDED: {
    label: 'Suspended',
    color: colors.error,
    icon: '🚫',
    isActive: false,
    canGoOnline: false,
  },
  REJECTED: {
    label: 'Rejected',
    color: colors.error,
    icon: '❌',
    isActive: false,
    canGoOnline: false,
  },
};

export function getDriverStatusConfig(status: string): DriverStatusConfig {
  return DRIVER_STATUS_CONFIG[status as DriverStatus] || DRIVER_STATUS_CONFIG.PENDING_ONBOARDING;
}

export function canDriverGoOnline(status: string): boolean {
  return status === 'APPROVED';
}

export function isDriverApproved(status: string): boolean {
  return status === 'APPROVED';
}
