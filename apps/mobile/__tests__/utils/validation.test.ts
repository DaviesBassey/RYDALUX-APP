import {
  validatePhone,
  validateEmail,
  validateOTP,
  validateFullName,
  validatePassword,
  validateCardNumber,
  validateCVV,
} from '../../src/utils/validation';

describe('validation utilities', () => {
  describe('validatePhone', () => {
    it('should validate 10-digit Nigerian phone numbers', () => {
      expect(validatePhone('8012345678')).toBe(true);
      expect(validatePhone('8087654321')).toBe(true);
    });

    it('should validate 11-digit Nigerian phone numbers (with leading 0)', () => {
      expect(validatePhone('08012345678')).toBe(true);
      expect(validatePhone('08087654321')).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      expect(validatePhone('123')).toBe(false);
      expect(validatePhone('12345678901234')).toBe(false);
      expect(validatePhone('not-a-phone')).toBe(false);
    });

    it('should handle null/undefined', () => {
      expect(validatePhone(null)).toBe(false);
      expect(validatePhone(undefined)).toBe(false);
    });
  });

  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      expect(validateEmail('user@example.com')).toBe(true);
      expect(validateEmail('john.doe@domain.co.uk')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(validateEmail('not-an-email')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('user@')).toBe(false);
      expect(validateEmail('user @example.com')).toBe(false);
    });

    it('should handle null/undefined', () => {
      expect(validateEmail(null)).toBe(false);
      expect(validateEmail(undefined)).toBe(false);
    });
  });

  describe('validateOTP', () => {
    it('should validate 4-6 digit OTPs', () => {
      expect(validateOTP('1234')).toBe(true);
      expect(validateOTP('12345')).toBe(true);
      expect(validateOTP('123456')).toBe(true);
    });

    it('should reject invalid OTPs', () => {
      expect(validateOTP('123')).toBe(false);
      expect(validateOTP('1234567')).toBe(false);
      expect(validateOTP('abcd')).toBe(false);
    });

    it('should handle null/undefined', () => {
      expect(validateOTP(null)).toBe(false);
      expect(validateOTP(undefined)).toBe(false);
    });
  });

  describe('validateFullName', () => {
    it('should validate full names with at least 3 characters', () => {
      expect(validateFullName('John Doe')).toBe(true);
      expect(validateFullName('Mary Jane')).toBe(true);
      expect(validateFullName("O'Brien")).toBe(true);
      expect(validateFullName('Jean-Paul')).toBe(true);
    });

    it('should reject short names', () => {
      expect(validateFullName('Jo')).toBe(false);
      expect(validateFullName('A')).toBe(false);
    });

    it('should reject names with invalid characters', () => {
      expect(validateFullName('John123')).toBe(false);
      expect(validateFullName('John@Doe')).toBe(false);
    });

    it('should handle null/undefined', () => {
      expect(validateFullName(null)).toBe(false);
      expect(validateFullName(undefined)).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('should validate passwords with at least 8 characters', () => {
      expect(validatePassword('password123')).toBe(true);
      expect(validatePassword('MySecurePass1!')).toBe(true);
      expect(validatePassword('12345678')).toBe(true);
    });

    it('should reject short passwords', () => {
      expect(validatePassword('pass123')).toBe(false);
      expect(validatePassword('abc')).toBe(false);
    });

    it('should handle null/undefined', () => {
      expect(validatePassword(null)).toBe(false);
      expect(validatePassword(undefined)).toBe(false);
    });
  });

  describe('validateCardNumber', () => {
    it('should validate card numbers with Luhn algorithm', () => {
      // Valid test card number: 4532015112830366
      expect(validateCardNumber('4532015112830366')).toBe(true);
    });

    it('should reject invalid card numbers', () => {
      expect(validateCardNumber('4532015112830367')).toBe(false); // Invalid checksum
      expect(validateCardNumber('123')).toBe(false); // Too short
    });

    it('should handle null/undefined', () => {
      expect(validateCardNumber(null)).toBe(false);
      expect(validateCardNumber(undefined)).toBe(false);
    });
  });

  describe('validateCVV', () => {
    it('should validate 3-4 digit CVVs', () => {
      expect(validateCVV('123')).toBe(true);
      expect(validateCVV('1234')).toBe(true);
    });

    it('should reject invalid CVVs', () => {
      expect(validateCVV('12')).toBe(false);
      expect(validateCVV('12345')).toBe(false);
      expect(validateCVV('abc')).toBe(false);
    });

    it('should handle null/undefined', () => {
      expect(validateCVV(null)).toBe(false);
      expect(validateCVV(undefined)).toBe(false);
    });
  });
});
