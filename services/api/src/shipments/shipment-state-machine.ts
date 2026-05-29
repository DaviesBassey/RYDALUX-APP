import { ShipmentStatus } from '@prisma/client';

/**
 * Shipment state machine with 13 states and defined valid transitions
 *
 * State Flow:
 * DRAFT → QUOTED → REQUESTED → DRIVER_ASSIGNED → PICKUP_ARRIVED → PICKUP_VERIFIED →
 * IN_TRANSIT → DELIVERY_ARRIVED → DELIVERY_VERIFIED → DELIVERED
 *
 * Can be cancelled/disputed/expired at any point before DELIVERED
 */
export class ShipmentStateMachine {
  // Define all valid transitions
  // Key: current state, Value: array of valid next states
  private static readonly ALLOWED_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
    DRAFT: ['QUOTED', 'CANCELLED'],
    QUOTED: ['REQUESTED', 'CANCELLED', 'EXPIRED'],
    REQUESTED: ['DRIVER_ASSIGNED', 'CANCELLED', 'EXPIRED'],
    DRIVER_ASSIGNED: ['PICKUP_ARRIVED', 'CANCELLED', 'EXPIRED'],
    PICKUP_ARRIVED: ['PICKUP_VERIFIED', 'CANCELLED'],
    PICKUP_VERIFIED: ['IN_TRANSIT', 'CANCELLED'],
    IN_TRANSIT: ['DELIVERY_ARRIVED', 'CANCELLED'],
    DELIVERY_ARRIVED: ['DELIVERY_VERIFIED', 'CANCELLED'],
    DELIVERY_VERIFIED: ['DELIVERED'],
    DELIVERED: [], // Terminal state
    CANCELLED: [], // Terminal state
    DISPUTED: [], // Terminal state
    EXPIRED: [], // Terminal state
  };

  /**
   * Check if transition from current to next state is valid
   */
  static canTransition(currentState: ShipmentStatus, nextState: ShipmentStatus): boolean {
    const allowedNextStates = this.ALLOWED_TRANSITIONS[currentState];
    return allowedNextStates?.includes(nextState) ?? false;
  }

  /**
   * Assert that a transition is valid, throw if not
   */
  static assertTransition(currentState: ShipmentStatus, nextState: ShipmentStatus): void {
    if (!this.canTransition(currentState, nextState)) {
      throw new Error(
        `Invalid state transition: ${currentState} → ${nextState}. ` +
          `Allowed transitions from ${currentState}: ${this.ALLOWED_TRANSITIONS[currentState]?.join(', ') || 'none'}`,
      );
    }
  }

  /**
   * Get all allowed next states for a given current state
   */
  static getAllowedNextStates(currentState: ShipmentStatus): ShipmentStatus[] {
    return this.ALLOWED_TRANSITIONS[currentState] || [];
  }

  /**
   * Check if a state is terminal (no further transitions allowed)
   */
  static isTerminalState(state: ShipmentStatus): boolean {
    return this.ALLOWED_TRANSITIONS[state]?.length === 0;
  }

  /**
   * Get state category for common checks
   */
  static getStateCategory(state: ShipmentStatus): 'draft' | 'active' | 'terminal' {
    if (state === 'DRAFT' || state === 'QUOTED') {
      return 'draft';
    }
    if (state === 'DELIVERED' || state === 'CANCELLED' || state === 'DISPUTED' || state === 'EXPIRED') {
      return 'terminal';
    }
    return 'active';
  }

  /**
   * Check if shipment can still be cancelled
   */
  static canBeCancelled(state: ShipmentStatus): boolean {
    // Can cancel from any non-terminal state except DELIVERY_VERIFIED
    // DELIVERED cannot be cancelled (must be disputed)
    if (state === 'DELIVERED' || state === 'CANCELLED' || state === 'DISPUTED' || state === 'EXPIRED') {
      return false;
    }
    return true;
  }

  /**
   * Check if shipment is in active delivery phase
   */
  static isInDeliveryPhase(state: ShipmentStatus): boolean {
    return (
      state === 'IN_TRANSIT' ||
      state === 'DELIVERY_ARRIVED' ||
      state === 'DELIVERY_VERIFIED'
    );
  }

  /**
   * Check if OTP verification is required for this state
   */
  static requiresOtpVerification(state: ShipmentStatus, otpType: 'PICKUP' | 'DELIVERY'): boolean {
    if (otpType === 'PICKUP') {
      // Pickup OTP needed before transitioning from PICKUP_ARRIVED to PICKUP_VERIFIED
      return state === 'PICKUP_ARRIVED';
    } else {
      // Delivery OTP needed before transitioning from DELIVERY_ARRIVED to DELIVERY_VERIFIED
      return state === 'DELIVERY_ARRIVED';
    }
  }

  /**
   * Get human-readable state label
   */
  static getStateLabel(state: ShipmentStatus): string {
    const labels: Record<ShipmentStatus, string> = {
      DRAFT: 'Draft',
      QUOTED: 'Quote Generated',
      REQUESTED: 'Requested',
      DRIVER_ASSIGNED: 'Driver Assigned',
      PICKUP_ARRIVED: 'Driver at Pickup',
      PICKUP_VERIFIED: 'Pickup Verified',
      IN_TRANSIT: 'In Transit',
      DELIVERY_ARRIVED: 'Driver at Delivery',
      DELIVERY_VERIFIED: 'Delivery Verified',
      DELIVERED: 'Delivered',
      CANCELLED: 'Cancelled',
      DISPUTED: 'Disputed',
      EXPIRED: 'Expired',
    };
    return labels[state];
  }
}
