export function validatePhone(phone: string | undefined | null): boolean {
  if (!phone) return false;
  const cleaned = phone.replace(/\D/g, '');
  // Nigerian phone numbers: 10 or 11 digits (with leading 0)
  return cleaned.length === 10 || cleaned.length === 11;
}

export function validateEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validateOTP(otp: string | undefined | null): boolean {
  if (!otp) return false;
  const cleaned = otp.replace(/\D/g, '');
  // OTP is typically 4-6 digits
  return cleaned.length >= 4 && cleaned.length <= 6;
}

export function validateFullName(name: string | undefined | null): boolean {
  if (!name) return false;
  const trimmed = name.trim();
  // At least 3 characters, can contain spaces and hyphens
  return trimmed.length >= 3 && /^[a-zA-Z\s-']{3,}$/.test(trimmed);
}

export function validatePassword(password: string | undefined | null): boolean {
  if (!password) return false;
  // At least 8 characters
  return password.length >= 8;
}

export function validateCardNumber(card: string | undefined | null): boolean {
  if (!card) return false;
  const cleaned = card.replace(/\D/g, '');
  // Luhn algorithm
  if (cleaned.length < 13 || cleaned.length > 19) return false;

  let sum = 0;
  let isEven = false;

  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned[i], 10);

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
}

export function validateCVV(cvv: string | undefined | null): boolean {
  if (!cvv) return false;
  const cleaned = cvv.replace(/\D/g, '');
  return cleaned.length === 3 || cleaned.length === 4;
}
