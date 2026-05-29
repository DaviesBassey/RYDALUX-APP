import { colors } from './colors';

export type VehicleStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'SUSPENDED';

export interface VehicleStatusConfig {
  label: string;
  color: string;
  icon: string;
  isApproved: boolean;
  requiresAction: boolean;
}

export const VEHICLE_STATUS_CONFIG: Record<VehicleStatus, VehicleStatusConfig> = {
  PENDING: {
    label: 'Pending Review',
    color: colors.warning,
    icon: '⏳',
    isApproved: false,
    requiresAction: false,
  },
  APPROVED: {
    label: 'Approved',
    color: colors.success,
    icon: '✅',
    isApproved: true,
    requiresAction: false,
  },
  REJECTED: {
    label: 'Rejected',
    color: colors.error,
    icon: '❌',
    isApproved: false,
    requiresAction: true,
  },
  EXPIRED: {
    label: 'Expired',
    color: colors.error,
    icon: '⚠️',
    isApproved: false,
    requiresAction: true,
  },
  SUSPENDED: {
    label: 'Suspended',
    color: colors.error,
    icon: '🚫',
    isApproved: false,
    requiresAction: true,
  },
};

export function getVehicleStatusConfig(status: string): VehicleStatusConfig {
  return VEHICLE_STATUS_CONFIG[status as VehicleStatus] || VEHICLE_STATUS_CONFIG.PENDING;
}

export function isVehicleApproved(status: string): boolean {
  const config = getVehicleStatusConfig(status);
  return config.isApproved;
}

export function doesVehicleRequireAction(status: string): boolean {
  const config = getVehicleStatusConfig(status);
  return config.requiresAction;
}
