export function getLocalDateInputValue(value: Date | string | number = new Date()) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export function parseLocalDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);

  if (!year || !month || !day) {
    return new Date(NaN);
  }

  return new Date(year, month - 1, day);
}

export function isDateOnOrBefore(left: string, right: string) {
  return left <= right;
}

function addMonths(baseDate: Date, months: number) {
  const targetMonthIndex = baseDate.getMonth() + months;
  const targetYear =
    baseDate.getFullYear() + Math.floor(targetMonthIndex / 12);
  const normalizedMonth =
    ((targetMonthIndex % 12) + 12) % 12;
  const daysInTargetMonth = new Date(
    targetYear,
    normalizedMonth + 1,
    0,
  ).getDate();

  return new Date(
    targetYear,
    normalizedMonth,
    Math.min(baseDate.getDate(), daysInTargetMonth),
  );
}

export function addRecurringInterval(
  value: string,
  frequency: RecurringFrequency,
) {
  const baseDate = parseLocalDate(value);

  if (Number.isNaN(baseDate.getTime())) {
    return value;
  }

  switch (frequency) {
    case 'daily':
      baseDate.setDate(baseDate.getDate() + 1);
      return getLocalDateInputValue(baseDate);
    case 'weekly':
      baseDate.setDate(baseDate.getDate() + 7);
      return getLocalDateInputValue(baseDate);
    case 'monthly':
      return getLocalDateInputValue(addMonths(baseDate, 1));
    case 'yearly':
      return getLocalDateInputValue(addMonths(baseDate, 12));
    default:
      return value;
  }
}

export function getMonthDateRange(year: number, month: number) {
  return {
    startDate: getLocalDateInputValue(new Date(year, month - 1, 1)),
    endDate: getLocalDateInputValue(new Date(year, month, 0)),
  };
}

export function getYearDateRange(year: number) {
  return {
    startDate: getLocalDateInputValue(new Date(year, 0, 1)),
    endDate: getLocalDateInputValue(new Date(year, 11, 31)),
  };
}
