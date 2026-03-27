'use client';

import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/hooks/use-language';
import { type SortConfig } from '@/lib/table-sort';

interface SortableTableHeaderProps {
  label: string;
  sortKey: string;
  sortConfig: SortConfig<string>;
  onSort: (sortKey: string) => void;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

const alignClasses = {
  left: 'justify-start text-left',
  center: 'justify-center text-center',
  right: 'justify-end text-right',
} as const;

export function SortableTableHeader({
  label,
  sortKey,
  sortConfig,
  onSort,
  align = 'left',
  className,
}: SortableTableHeaderProps) {
  const { t } = useLanguage();
  const isActive = sortConfig.key === sortKey;
  const title = isActive
    ? sortConfig.direction === 'asc'
      ? `${label}. ${t('sortedAscending')}. ${t('clickToSortDescending')}`
      : `${label}. ${t('sortedDescending')}. ${t('clickToSortAscending')}`
    : `${label}. ${t('clickToSort')}`;

  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className={cn(
        'inline-flex w-full items-center gap-2 rounded-sm text-sm font-semibold text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        alignClasses[align],
        className,
      )}
      title={title}
    >
      <span className="whitespace-nowrap">{label}</span>
      {isActive ? (
        sortConfig.direction === 'asc' ? (
          <ArrowUp className="h-4 w-4 shrink-0" />
        ) : (
          <ArrowDown className="h-4 w-4 shrink-0" />
        )
      ) : (
        <ArrowUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      )}
    </button>
  );
}
