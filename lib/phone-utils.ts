export interface PhilippinePhoneResult {
  display: string;
  e164: string | null;
  nationalNumber: string;
  isComplete: boolean;
  type: 'mobile' | 'landline' | 'international' | 'unknown';
}

function sanitizePhoneInput(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return '';
  }

  if (trimmed.startsWith('+')) {
    return `+${trimmed.slice(1).replace(/\D/g, '')}`;
  }

  return trimmed.replace(/\D/g, '').replace(/^00/, '+');
}

function joinPhoneParts(parts: string[]) {
  return parts.filter(Boolean).join(' ');
}

function groupDigits(digits: string, groups: number[]) {
  const parts: string[] = [];
  let cursor = 0;

  for (const group of groups) {
    if (cursor >= digits.length) {
      break;
    }

    parts.push(digits.slice(cursor, cursor + group));
    cursor += group;
  }

  if (cursor < digits.length) {
    parts.push(digits.slice(cursor));
  }

  return parts.filter(Boolean);
}

function formatPhilippineMobile(nationalNumber: string, international: boolean) {
  const mobile = nationalNumber.slice(0, 10);

  return {
    display: international
      ? joinPhoneParts(['+63', ...groupDigits(mobile, [3, 3, 4])])
      : joinPhoneParts([`0${mobile.slice(0, 3)}`, mobile.slice(3, 6), mobile.slice(6, 10)]),
    e164: mobile.length === 10 ? `+63${mobile}` : null,
    nationalNumber: mobile,
    isComplete: mobile.length === 10,
    type: 'mobile' as const,
  };
}

function formatPhilippineLandline(
  nationalNumber: string,
  international: boolean,
) {
  const landline = nationalNumber.slice(0, 9);
  const isMetroManila = landline.startsWith('2');
  const areaLength = isMetroManila ? 1 : 2;
  const areaCode = landline.slice(0, areaLength);
  const subscriber = landline.slice(areaLength);
  const subscriberGroups = isMetroManila ? [4, 4] : [3, 4];

  return {
    display: international
      ? joinPhoneParts([`+63 ${areaCode}`, ...groupDigits(subscriber, subscriberGroups)])
      : joinPhoneParts([`0${areaCode}`, ...groupDigits(subscriber, subscriberGroups)]),
    e164: landline.length === 9 ? `+63${landline}` : null,
    nationalNumber: landline,
    isComplete: landline.length === 9,
    type: 'landline' as const,
  };
}

function formatInternationalNumber(sanitized: string): PhilippinePhoneResult {
  const digits = sanitized.startsWith('+') ? sanitized.slice(1) : sanitized;

  if (!digits) {
    return {
      display: sanitized,
      e164: null,
      nationalNumber: '',
      isComplete: false,
      type: 'unknown',
    };
  }

  const countryCodeLength =
    digits.length > 10 ? Math.min(3, Math.max(1, digits.length - 10)) : 1;
  const countryCode = digits.slice(0, countryCodeLength);
  const subscriber = digits.slice(countryCodeLength, 17);
  const subscriberGroups = groupDigits(subscriber, [3, 3, 4, 4]);

  return {
    display: joinPhoneParts([`+${countryCode}`, ...subscriberGroups]),
    e164: `+${digits}`,
    nationalNumber: subscriber,
    isComplete: subscriber.length >= 6,
    type: 'international',
  };
}

export function formatPhilippinePhone(value: string): PhilippinePhoneResult {
  const sanitized = sanitizePhoneInput(value);

  if (!sanitized) {
    return {
      display: '',
      e164: null,
      nationalNumber: '',
      isComplete: false,
      type: 'unknown',
    };
  }

  if (sanitized.startsWith('+') && !sanitized.startsWith('+63')) {
    return formatInternationalNumber(sanitized);
  }

  const isInternationalPhilippines =
    sanitized.startsWith('+63') || /^63\d*$/.test(sanitized);

  let digits = sanitized.startsWith('+') ? sanitized.slice(1) : sanitized;

  if (isInternationalPhilippines) {
    digits = digits.replace(/^63/, '');
  } else if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  if (digits.startsWith('9')) {
    return formatPhilippineMobile(digits, isInternationalPhilippines);
  }

  if (/^[2-8]/.test(digits)) {
    return formatPhilippineLandline(digits, isInternationalPhilippines);
  }

  if (sanitized.startsWith('+')) {
    return formatInternationalNumber(sanitized);
  }

  if (/^\d+$/.test(digits)) {
    const fallback = digits.slice(0, 12);

    return {
      display: joinPhoneParts(groupDigits(`0${fallback}`, [4, 3, 4, 4])),
      e164: null,
      nationalNumber: fallback,
      isComplete: false,
      type: 'unknown',
    };
  }

  return {
    display: sanitized,
    e164: null,
    nationalNumber: digits,
    isComplete: false,
    type: 'unknown',
  };
}

export function normalizePhilippinePhone(value: string) {
  return formatPhilippinePhone(value).display;
}
