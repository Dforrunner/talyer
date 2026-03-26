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
