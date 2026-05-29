// Driver-specific validation functions

export function validatePlateNumber(plate: string | undefined | null): boolean {
  if (!plate) return false;
  // Nigerian format: e.g., "ABC 123XY"
  const plateRegex = /^[A-Z]{3}\s?\d{3}[A-Z]{2}$/;
  return plateRegex.test(plate.toUpperCase().trim());
}

export function validatePinCode(pin: string | undefined | null): boolean {
  if (!pin) return false;
  // 4-6 digit PIN for trip PIN verification
  const pinRegex = /^\d{4,6}$/;
  return pinRegex.test(pin.trim());
}

export function validatePayoutAccount(account: string | undefined | null): boolean {
  if (!account) return false;
  // Placeholder: Nigerian bank accounts are typically 10 digits
  const accountRegex = /^\d{10}$/;
  return accountRegex.test(account.trim());
}

export function validateDriverLicenseNumber(license: string | undefined | null): boolean {
  if (!license) return false;
  // Placeholder: Driver licence format - alphanumeric
  const licenseRegex = /^[A-Z0-9]{5,20}$/;
  return licenseRegex.test(license.toUpperCase().trim());
}

export function validateVehicleYear(year: number | undefined | null): boolean {
  if (year === undefined || year === null) return false;
  const currentYear = new Date().getFullYear();
  // Vehicle must be between 1990 and current year (allow some flexibility)
  return year >= 1990 && year <= currentYear + 1;
}

export function validateBankName(name: string | undefined | null): boolean {
  if (!name) return false;
  // At least 3 characters
  return name.trim().length >= 3;
}

export function validatePayoutAmount(amount: number | undefined | null, maxAmount?: number): boolean {
  if (amount === undefined || amount === null) return false;
  // Minimum 1000 NGN, maximum 1M NGN (or custom max)
  const max = maxAmount || 1000000;
  return amount >= 1000 && amount <= max;
}

export function validateDocumentFileSize(fileSizeBytes: number): boolean {
  // Maximum 5MB for documents
  const maxSizeBytes = 5 * 1024 * 1024;
  return fileSizeBytes <= maxSizeBytes;
}

export function validateOnlineToggle(driverStatus: string, vehicleStatus: string): boolean {
  // Can only go online if driver is APPROVED and vehicle is APPROVED
  return driverStatus === 'APPROVED' && vehicleStatus === 'APPROVED';
}

export function validateTripAcceptance(driverStatus: string, vehicleStatus: string): boolean {
  // Can only accept trips if driver is APPROVED and vehicle is APPROVED and online
  return validateOnlineToggle(driverStatus, vehicleStatus);
}
