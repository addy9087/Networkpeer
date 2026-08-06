export function normalizePhoneNumber(rawValue) {
  return (rawValue || "").replace(/\D/g, "");
}

export function isPhoneNumberValid(rawValue) {
  return normalizePhoneNumber(rawValue).length >= 7;
}

export function formatPhoneNumber(rawValue, countryCode) {
  const digits = normalizePhoneNumber(rawValue);

  if (!digits) {
    return countryCode;
  }

  if (countryCode === "+1") {
    const compact = digits.slice(0, 10);
    if (compact.length <= 3) {
      return `${countryCode} ${compact}`.trim();
    }

    if (compact.length <= 6) {
      return `${countryCode} ${compact.slice(0, 3)} ${compact.slice(3)}`.trim();
    }

    return `${countryCode} ${compact.slice(0, 3)} ${compact.slice(3, 6)} ${compact.slice(6)}`.trim();
  }

  return `${countryCode} ${digits}`.trim();
}

export function isOtpCodeValid(value) {
  return /^\d{6}$/.test(value || "");
}

export function getDemoOtp() {
  return "123456";
}
