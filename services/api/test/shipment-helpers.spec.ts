// Shipment Helpers Test Suite

// 1. Status Formatting Helpers
function formatTripStatus(status: string | undefined | null): string {
  if (!status) return '-';
  return status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function formatPackageCategory(category: string | undefined | null): string {
  if (!category) return '-';
  return category
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatPriority(priority: string | undefined | null): string {
  if (!priority) return 'Standard';
  return priority.charAt(0).toUpperCase() + priority.slice(1).toLowerCase();
}

function maskPhone(phone: string | undefined | null): string {
  if (!phone) return '-';
  const cleaned = phone.replace(/\s+/g, '');
  if (cleaned.length < 7) return '***-***';
  return `${cleaned.slice(0, 4)}***${cleaned.slice(-3)}`;
}

// 2. Rider Shipment Form Validation Helpers
function validatePhone(phone: string | undefined | null): boolean {
  if (!phone) return false;
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length === 10 || cleaned.length === 11 || (cleaned.length >= 11 && cleaned.startsWith('234'));
}

function validateOTP(otp: string | undefined | null): boolean {
  if (!otp) return false;
  const cleaned = otp.replace(/\D/g, '');
  return cleaned.length === 6; // 6-digit double-blind OTP verification
}

// 3. Driver Next-Action Helpers
function getDriverNextAction(status: string): string {
  switch (status) {
    case 'DRIVER_ASSIGNED':
      return "I've Arrived at Pickup";
    case 'PICKUP_ARRIVED':
      return 'Enter Pickup OTP';
    case 'PICKUP_VERIFIED':
      return 'Start Shipment';
    case 'IN_TRANSIT':
      return "I've Arrived at Delivery";
    case 'DELIVERY_ARRIVED':
      return 'Enter Delivery OTP';
    case 'DELIVERY_VERIFIED':
      return 'Submit Proof & Complete';
    case 'DELIVERED':
      return 'Completed';
    default:
      return 'No Action Required';
  }
}

// 4. Admin Shipment Permission Helpers
function hasAdminPermission(userRoles: string[], permission: string): boolean {
  if (userRoles.includes('admin') || userRoles.includes('super_admin')) {
    return true;
  }
  if (userRoles.includes('ops_manager') && ['read:shipments', 'update:shipments'].includes(permission)) {
    return true;
  }
  if (userRoles.includes('support_agent') && permission === 'read:shipments') {
    return true;
  }
  return false;
}

// Test Executions
describe('Section 24: Shipment Helpers & Validations Spec', () => {
  describe('Status, Category & Phone Formatting', () => {
    it('formats shipment status into user-friendly names', () => {
      expect(formatTripStatus('DRIVER_ASSIGNED')).toBe('Driver Assigned');
      expect(formatTripStatus('DELIVERY_VERIFIED')).toBe('Delivery Verified');
      expect(formatTripStatus('IN_TRANSIT')).toBe('In Transit');
      expect(formatTripStatus('')).toBe('-');
    });

    it('formats package categories correctly', () => {
      expect(formatPackageCategory('SMALL_PACKAGE')).toBe('Small Package');
      expect(formatPackageCategory('HIGH_VALUE')).toBe('High Value');
      expect(formatPackageCategory('DOCUMENT')).toBe('Document');
    });

    it('formats priority tags correctly', () => {
      expect(formatPriority('EXPRESS')).toBe('Express');
      expect(formatPriority('STANDARD')).toBe('Standard');
      expect(formatPriority('SCHEDULED')).toBe('Scheduled');
    });

    it('masks recipient phone numbers to prevent privacy leaks', () => {
      expect(maskPhone('+234 812 345 6789')).toBe('+234***789');
      expect(maskPhone('08031112222')).toBe('0803***222');
      expect(maskPhone('')).toBe('-');
    });
  });

  describe('Form Validation', () => {
    it('validates 10 or 11 digit mobile numbers', () => {
      expect(validatePhone('08031112222')).toBe(true);
      expect(validatePhone('+2348031112222')).toBe(true);
      expect(validatePhone('123')).toBe(false);
    });

    it('enforces 6-digit double-blind numeric OTP validations', () => {
      expect(validateOTP('123456')).toBe(true);
      expect(validateOTP('1234')).toBe(false);
      expect(validateOTP('abcdef')).toBe(false);
    });
  });

  describe('Driver Next-Action Resolution', () => {
    it('resolves correct action label from shipment state machine step', () => {
      expect(getDriverNextAction('DRIVER_ASSIGNED')).toBe("I've Arrived at Pickup");
      expect(getDriverNextAction('PICKUP_ARRIVED')).toBe('Enter Pickup OTP');
      expect(getDriverNextAction('PICKUP_VERIFIED')).toBe('Start Shipment');
      expect(getDriverNextAction('IN_TRANSIT')).toBe("I've Arrived at Delivery");
      expect(getDriverNextAction('DELIVERY_ARRIVED')).toBe('Enter Delivery OTP');
      expect(getDriverNextAction('DELIVERY_VERIFIED')).toBe('Submit Proof & Complete');
    });
  });

  describe('Admin Access Control & RBAC Permissions', () => {
    it('allows super admins full permissions', () => {
      expect(hasAdminPermission(['super_admin'], 'update:shipments')).toBe(true);
      expect(hasAdminPermission(['super_admin'], 'delete:shipments')).toBe(true);
    });

    it('restricts support agents to read-only access', () => {
      expect(hasAdminPermission(['support_agent'], 'read:shipments')).toBe(true);
      expect(hasAdminPermission(['support_agent'], 'update:shipments')).toBe(false);
    });

    it('allows operations managers write transitions but restricts delete permissions', () => {
      expect(hasAdminPermission(['ops_manager'], 'update:shipments')).toBe(true);
      expect(hasAdminPermission(['ops_manager'], 'delete:shipments')).toBe(false);
    });
  });
});
