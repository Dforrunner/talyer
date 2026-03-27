export type SortDirection = 'asc' | 'desc';

export interface SortConfig<Key extends string = string> {
  key: Key;
  direction: SortDirection;
}

const normalizeSortValue = (value: unknown) => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  return String(value).trim().toLowerCase();
};

export const compareSortValues = (left: unknown, right: unknown) => {
  const normalizedLeft = normalizeSortValue(left);
  const normalizedRight = normalizeSortValue(right);

  if (normalizedLeft === normalizedRight) {
    return 0;
  }

  if (normalizedLeft === null) {
    return 1;
  }

  if (normalizedRight === null) {
    return -1;
  }

  if (
    typeof normalizedLeft === 'number' &&
    typeof normalizedRight === 'number'
  ) {
    return normalizedLeft - normalizedRight;
  }

  return String(normalizedLeft).localeCompare(String(normalizedRight), undefined, {
    numeric: true,
    sensitivity: 'base',
  });
};

export const sortRows = <T, Key extends string>(
  rows: T[],
  sortConfig: SortConfig<Key>,
  getValue: (row: T, key: Key) => unknown,
) => {
  const directionMultiplier = sortConfig.direction === 'asc' ? 1 : -1;

  return [...rows].sort((leftRow, rightRow) => {
    const comparison = compareSortValues(
      getValue(leftRow, sortConfig.key),
      getValue(rightRow, sortConfig.key),
    );

    return comparison * directionMultiplier;
  });
};

export const getNextSortConfig = <Key extends string>(
  current: SortConfig<Key>,
  nextKey: Key,
  defaultDirection: SortDirection = 'asc',
): SortConfig<Key> => {
  if (current.key !== nextKey) {
    return { key: nextKey, direction: defaultDirection };
  }

  return {
    key: nextKey,
    direction: current.direction === 'asc' ? 'desc' : 'asc',
  };
};

