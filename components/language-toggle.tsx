'use client';

import { Languages } from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';
import { useLanguageToggle } from '@/hooks/use-language-toggle';
import { cn } from '@/lib/utils';

interface LanguageToggleProps {
  className?: string;
  showLabel?: boolean;
}

const LanguageToggle: React.FC<LanguageToggleProps> = ({
  className,
  showLabel = true,
}) => {
  const { t } = useLanguage();
  const { language, languages, setLanguage } = useLanguageToggle();

  return (
    <div className={cn('space-y-2', className)}>
      {showLabel && (
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-sidebar-foreground/60">
          <Languages className="h-3.5 w-3.5" />
          <span>{t('language')}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 rounded-xl bg-sidebar-accent/30 p-1">
        {languages.map((option) => {
          const isActive = language === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => void setLanguage(option.value)}
              className={cn(
                'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-xs'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground',
              )}
              aria-pressed={isActive}
              title={option.label}
            >
              {option.flag} {option.shortLabel}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default LanguageToggle;
