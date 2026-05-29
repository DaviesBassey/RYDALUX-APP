import { colors } from './colors';

export type PayoutStatus =
  | 'REQUESTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'PROCESSING'
  | 'PAID'
  | 'FAILED'
  | 'CANCELLED';

export interface PayoutStatusConfig {
  label: string;
  color: string;
  icon: string;
  isFinal: boolean;
  isSuccess: boolean;
}

export const PAYOUT_STATUS_CONFIG: Record<PayoutStatus, PayoutStatusConfig> = {
  REQUESTED: {
    label: 'Requested',
    color: colors.info,
    icon: '📬',
    isFinal: false,
    isSuccess: false,
  },
  APPROVED: {
    label: 'Approved',
    color: colors.success,
    icon: '✅',
    isFinal: false,
    isSuccess: true,
  },
  REJECTED: {
    label: 'Rejected',
    color: colors.error,
    icon: '❌',
    isFinal: true,
    isSuccess: false,
  },
  PROCESSING: {
    label: 'Processing',
    color: colors.warning,
    icon: '⏳',
    isFinal: false,
    isSuccess: false,
  },
  PAID: {
    label: 'Paid',
    color: colors.success,
    icon: '💰',
    isFinal: true,
    isSuccess: true,
  },
  FAILED: {
    label: 'Failed',
    color: colors.error,
    icon: '⚠️',
    isFinal: true,
    isSuccess: false,
  },
  CANCELLED: {
    label: 'Cancelled',
    color: colors.gray500,
    icon: '🚫',
    isFinal: true,
    isSuccess: false,
  },
};

export function getPayoutStatusConfig(status: string): PayoutStatusConfig {
  return PAYOUT_STATUS_CONFIG[status as PayoutStatus] || PAYOUT_STATUS_CONFIG.REQUESTED;
}

export function isPayoutFinal(status: string): boolean {
  const config = getPayoutStatusConfig(status);
  return config.isFinal;
}

export function isPayoutSuccess(status: string): boolean {
  const config = getPayoutStatusConfig(status);
  return config.isSuccess;
}

export function canCancelPayout(status: string): boolean {
  // Can only cancel if not yet processing
  return !['PROCESSING', 'PAID', 'FAILED', 'CANCELLED'].includes(status);
}
