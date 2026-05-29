export const colors = {
  // Brand
  primary: '#e94560',
  secondary: '#d2b16d',
  accent: '#f4f1eb',

  // Grayscale
  white: '#ffffff',
  black: '#000000',
  darkNavy: '#111111',
  gray100: '#f5f5f5',
  gray200: '#e0e0e0',
  gray300: '#d0d0d0',
  gray500: '#777777',
  gray700: '#333333',
  gray900: '#1a1a1a',

  // Status colors
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',

  // Status-specific
  pending: '#fbbf24',
  approved: '#10b981',
  rejected: '#ef4444',
  cancelled: '#6b7280',

  // Trip statuses
  draft: '#9ca3af',
  quoted: '#3b82f6',
  requested: '#3b82f6',
  driverAssigned: '#8b5cf6',
  driverArriving: '#8b5cf6',
  driverArrived: '#8b5cf6',
  inProgress: '#3b82f6',
  completed: '#10b981',
  cancelledByRider: '#ef4444',
  cancelledByDriver: '#ef4444',
  disputed: '#f97316',

  // Transparency
  transparent: 'rgba(0, 0, 0, 0)',
  overlay: 'rgba(0, 0, 0, 0.5)',
};

export type ColorKey = keyof typeof colors;
