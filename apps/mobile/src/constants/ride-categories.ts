export interface RideCategory {
  id: string;
  name: string;
  displayName: string;
  description: string;
  icon: string;
  basePriceMultiplier: number;
  capacity: number;
  estimatedTime: string;
}

export const RIDE_CATEGORIES: Record<string, RideCategory> = {
  STANDARD: {
    id: 'STANDARD',
    name: 'Standard',
    displayName: 'Standard',
    description: 'Affordable rides for solo riders',
    icon: '🚗',
    basePriceMultiplier: 1.0,
    capacity: 4,
    estimatedTime: '4-6 min',
  },
  COMFORT: {
    id: 'COMFORT',
    name: 'Comfort',
    displayName: 'Comfort',
    description: 'More spacious and comfortable',
    icon: '🏎️',
    basePriceMultiplier: 1.3,
    capacity: 4,
    estimatedTime: '4-6 min',
  },
  EXECUTIVE: {
    id: 'EXECUTIVE',
    name: 'Executive',
    displayName: 'Executive',
    description: 'Premium sedans for business',
    icon: '🚙',
    basePriceMultiplier: 1.8,
    capacity: 4,
    estimatedTime: '6-8 min',
  },
  XL: {
    id: 'XL',
    name: 'XL',
    displayName: 'XL',
    description: 'Large vehicles for groups',
    icon: '🚐',
    basePriceMultiplier: 2.0,
    capacity: 6,
    estimatedTime: '6-8 min',
  },
};

export const RIDE_CATEGORY_LIST = Object.values(RIDE_CATEGORIES);
