import { colors } from './colors';

export type TripStatus =
  | 'DRAFT'
  | 'QUOTED'
  | 'REQUESTED'
  | 'DRIVER_ASSIGNED'
  | 'DRIVER_ARRIVING'
  | 'DRIVER_ARRIVED'
  | 'PIN_VERIFIED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED_BY_RIDER'
  | 'CANCELLED_BY_DRIVER'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'DISPUTED';

export interface TripStatusConfig {
  label: string;
  color: string;
  icon: string;
  isActive: boolean;
  isCompleted: boolean;
  isCancelled: boolean;
}

export const TRIP_STATUS_CONFIG: Record<TripStatus, TripStatusConfig> = {
  DRAFT: {
    label: 'Draft',
    color: colors.gray500,
    icon: '📝',
    isActive: false,
    isCompleted: false,
    isCancelled: false,
  },
  QUOTED: {
    label: 'Quoted',
    color: colors.quoted,
    icon: '💬',
    isActive: true,
    isCompleted: false,
    isCancelled: false,
  },
  REQUESTED: {
    label: 'Requested',
    color: colors.requested,
    icon: '🔔',
    isActive: true,
    isCompleted: false,
    isCancelled: false,
  },
  DRIVER_ASSIGNED: {
    label: 'Driver Assigned',
    color: colors.driverAssigned,
    icon: '✅',
    isActive: true,
    isCompleted: false,
    isCancelled: false,
  },
  DRIVER_ARRIVING: {
    label: 'Driver Arriving',
    color: colors.driverArriving,
    icon: '🚗',
    isActive: true,
    isCompleted: false,
    isCancelled: false,
  },
  DRIVER_ARRIVED: {
    label: 'Driver Arrived',
    color: colors.driverArrived,
    icon: '📍',
    isActive: true,
    isCompleted: false,
    isCancelled: false,
  },
  PIN_VERIFIED: {
    label: 'PIN Verified',
    color: colors.driverArrived,
    icon: '🔐',
    isActive: true,
    isCompleted: false,
    isCancelled: false,
  },
  IN_PROGRESS: {
    label: 'In Progress',
    color: colors.inProgress,
    icon: '🏃',
    isActive: true,
    isCompleted: false,
    isCancelled: false,
  },
  COMPLETED: {
    label: 'Completed',
    color: colors.success,
    icon: '✨',
    isActive: false,
    isCompleted: true,
    isCancelled: false,
  },
  CANCELLED_BY_RIDER: {
    label: 'Cancelled by Rider',
    color: colors.cancelled,
    icon: '❌',
    isActive: false,
    isCompleted: false,
    isCancelled: true,
  },
  CANCELLED_BY_DRIVER: {
    label: 'Cancelled by Driver',
    color: colors.cancelled,
    icon: '❌',
    isActive: false,
    isCompleted: false,
    isCancelled: true,
  },
  CANCELLED: {
    label: 'Cancelled',
    color: colors.cancelled,
    icon: '❌',
    isActive: false,
    isCompleted: false,
    isCancelled: true,
  },
  EXPIRED: {
    label: 'Expired',
    color: colors.gray500,
    icon: '⏰',
    isActive: false,
    isCompleted: false,
    isCancelled: true,
  },
  DISPUTED: {
    label: 'Disputed',
    color: colors.disputed,
    icon: '⚠️',
    isActive: true,
    isCompleted: false,
    isCancelled: false,
  },
};

export function getTripStatusConfig(status: string): TripStatusConfig {
  return TRIP_STATUS_CONFIG[status as TripStatus] || TRIP_STATUS_CONFIG.DRAFT;
}

export function isTripActive(status: string): boolean {
  const config = getTripStatusConfig(status);
  return config.isActive;
}

export function isTripCompleted(status: string): boolean {
  const config = getTripStatusConfig(status);
  return config.isCompleted;
}

export function isTripCancelled(status: string): boolean {
  const config = getTripStatusConfig(status);
  return config.isCancelled;
}
