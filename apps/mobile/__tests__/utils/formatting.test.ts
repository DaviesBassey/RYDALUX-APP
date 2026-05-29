import {
  formatCurrency,
  formatDate,
  formatTime,
  formatDistance,
  formatDuration,
  formatPhone,
  formatTripStatus,
  maskCardNumber,
  truncateText,
} from '../../src/utils/formatting';

describe('formatting utilities', () => {
  describe('formatCurrency', () => {
    it('should format currency with two decimal places', () => {
      expect(formatCurrency(1000)).toMatch(/₦.*1,000\.00/);
      expect(formatCurrency(1500.5)).toMatch(/₦.*1,500\.50/);
    });

    it('should handle zero', () => {
      expect(formatCurrency(0)).toMatch(/₦.*0\.00/);
    });

    it('should handle null/undefined', () => {
      expect(formatCurrency(null as any)).toMatch(/₦.*0\.00/);
      expect(formatCurrency(undefined as any)).toMatch(/₦.*0\.00/);
    });

    it('should support custom currency', () => {
      const result = formatCurrency(1000, 'USD');
      expect(result).toContain('USD');
    });
  });

  describe('formatDate', () => {
    it('should format date correctly', () => {
      const date = new Date('2026-05-29');
      const result = formatDate(date);
      expect(result).toContain('May');
      expect(result).toContain('29');
      expect(result).toContain('2026');
    });

    it('should handle ISO string', () => {
      const result = formatDate('2026-05-29T10:30:00Z');
      expect(result).toContain('May');
    });

    it('should handle null/undefined', () => {
      expect(formatDate(null)).toBe('-');
      expect(formatDate(undefined)).toBe('-');
    });

    it('should handle invalid dates', () => {
      expect(formatDate('invalid')).toBe('-');
    });
  });

  describe('formatDistance', () => {
    it('should format meters as meters when less than 1000', () => {
      expect(formatDistance(500)).toBe('500 m');
      expect(formatDistance(999)).toBe('999 m');
    });

    it('should format kilometers when 1000 or more', () => {
      expect(formatDistance(1000)).toBe('1.0 km');
      expect(formatDistance(1500)).toBe('1.5 km');
      expect(formatDistance(5000)).toBe('5.0 km');
    });

    it('should handle null/undefined', () => {
      expect(formatDistance(null)).toBe('-');
      expect(formatDistance(undefined)).toBe('-');
    });
  });

  describe('formatDuration', () => {
    it('should format seconds only when less than 60', () => {
      expect(formatDuration(30)).toBe('30s');
      expect(formatDuration(59)).toBe('59s');
    });

    it('should format minutes and seconds', () => {
      expect(formatDuration(90)).toBe('1m 30s');
      expect(formatDuration(300)).toBe('5m 0s');
    });

    it('should format hours and minutes', () => {
      expect(formatDuration(3600)).toBe('1h 0m');
      expect(formatDuration(3660)).toBe('1h 1m');
      expect(formatDuration(5400)).toBe('1h 30m');
    });

    it('should handle null/undefined', () => {
      expect(formatDuration(null)).toBe('-');
      expect(formatDuration(undefined)).toBe('-');
    });
  });

  describe('formatPhone', () => {
    it('should format 10-digit phone number', () => {
      const result = formatPhone('8012345678');
      expect(result).toContain('234');
      expect(result).toContain('801');
    });

    it('should format 11-digit phone number (with leading 0)', () => {
      const result = formatPhone('08012345678');
      expect(result).toContain('801');
    });

    it('should handle null/undefined', () => {
      expect(formatPhone(null)).toBe('-');
      expect(formatPhone(undefined)).toBe('-');
    });
  });

  describe('formatTripStatus', () => {
    it('should format trip status by capitalizing words', () => {
      expect(formatTripStatus('DRIVER_ASSIGNED')).toBe('Driver Assigned');
      expect(formatTripStatus('IN_PROGRESS')).toBe('In Progress');
      expect(formatTripStatus('COMPLETED')).toBe('Completed');
    });

    it('should handle single word status', () => {
      expect(formatTripStatus('PENDING')).toBe('Pending');
    });

    it('should handle null/undefined', () => {
      expect(formatTripStatus(null)).toBe('-');
      expect(formatTripStatus(undefined)).toBe('-');
    });
  });

  describe('maskCardNumber', () => {
    it('should mask card number with last 4 digits visible', () => {
      const result = maskCardNumber('4532123456789012');
      expect(result).toBe('•••• •••• •••• 9012');
    });

    it('should handle short card numbers', () => {
      expect(maskCardNumber('123')).toBe('••••');
    });

    it('should handle null/undefined', () => {
      expect(maskCardNumber(null)).toBe('-');
      expect(maskCardNumber(undefined)).toBe('-');
    });
  });

  describe('truncateText', () => {
    it('should not truncate text shorter than max length', () => {
      expect(truncateText('Hello')).toBe('Hello');
    });

    it('should truncate text longer than max length', () => {
      const longText = 'This is a very long text that should be truncated';
      const result = truncateText(longText, 20);
      expect(result).toBe('This is a very long ...');
      expect(result.length).toBeLessThanOrEqual(26); // 20 + '...'
    });

    it('should use default max length of 50', () => {
      const text = 'a'.repeat(51);
      const result = truncateText(text);
      expect(result).toContain('...');
    });

    it('should handle null/undefined', () => {
      expect(truncateText(null)).toBe('-');
      expect(truncateText(undefined)).toBe('-');
    });
  });
});
