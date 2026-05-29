'use client';

interface StatusBadgeProps {
  status: string;
  variant?: 'default' | 'compact';
}

const statusColorMap: Record<string, { bg: string; text: string }> = {
  // KYC statuses
  PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  APPROVED: { bg: 'bg-green-100', text: 'text-green-800' },
  REJECTED: { bg: 'bg-red-100', text: 'text-red-800' },

  // Trip statuses
  DRAFT: { bg: 'bg-gray-100', text: 'text-gray-800' },
  QUOTED: { bg: 'bg-blue-100', text: 'text-blue-800' },
  REQUESTED: { bg: 'bg-blue-100', text: 'text-blue-800' },
  DRIVER_ASSIGNED: { bg: 'bg-purple-100', text: 'text-purple-800' },
  DRIVER_ARRIVING: { bg: 'bg-purple-100', text: 'text-purple-800' },
  DRIVER_ARRIVED: { bg: 'bg-purple-100', text: 'text-purple-800' },
  PIN_VERIFIED: { bg: 'bg-purple-100', text: 'text-purple-800' },
  IN_PROGRESS: { bg: 'bg-blue-100', text: 'text-blue-800' },
  COMPLETED: { bg: 'bg-green-100', text: 'text-green-800' },
  CANCELLED_BY_RIDER: { bg: 'bg-red-100', text: 'text-red-800' },
  CANCELLED_BY_DRIVER: { bg: 'bg-red-100', text: 'text-red-800' },
  CANCELLED: { bg: 'bg-red-100', text: 'text-red-800' },
  EXPIRED: { bg: 'bg-gray-100', text: 'text-gray-800' },
  DISPUTED: { bg: 'bg-orange-100', text: 'text-orange-800' },

  // Payment statuses
  AUTHORIZED: { bg: 'bg-blue-100', text: 'text-blue-800' },
  CAPTURED: { bg: 'bg-green-100', text: 'text-green-800' },
  FAILED: { bg: 'bg-red-100', text: 'text-red-800' },
  REFUNDED: { bg: 'bg-gray-100', text: 'text-gray-800' },

  // Payout statuses
  PROCESSING: { bg: 'bg-blue-100', text: 'text-blue-800' },
  PAID: { bg: 'bg-green-100', text: 'text-green-800' },

  // Support statuses
  OPEN: { bg: 'bg-red-100', text: 'text-red-800' },
  IN_REVIEW: { bg: 'bg-blue-100', text: 'text-blue-800' },
  WAITING_ON_USER: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  WAITING_ON_ADMIN: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  ESCALATED: { bg: 'bg-orange-100', text: 'text-orange-800' },
  RESOLVED: { bg: 'bg-green-100', text: 'text-green-800' },
  CLOSED: { bg: 'bg-gray-100', text: 'text-gray-800' },

  // SOS statuses
  ACKNOWLEDGED: { bg: 'bg-blue-100', text: 'text-blue-800' },
  FALSE_ALARM: { bg: 'bg-gray-100', text: 'text-gray-800' },

  // Default
  ACTIVE: { bg: 'bg-green-100', text: 'text-green-800' },
  INACTIVE: { bg: 'bg-gray-100', text: 'text-gray-800' },
  SUSPENDED: { bg: 'bg-red-100', text: 'text-red-800' },
};

export function StatusBadge({ status, variant = 'default' }: StatusBadgeProps) {
  const colors = statusColorMap[status] || { bg: 'bg-gray-100', text: 'text-gray-800' };
  const displayStatus = status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  return (
    <span className={`inline-block px-3 py-1 text-sm font-medium rounded-full ${colors.bg} ${colors.text}`}>
      {displayStatus}
    </span>
  );
}
