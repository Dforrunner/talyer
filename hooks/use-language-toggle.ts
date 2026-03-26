'use client';

import { useLanguage } from '@/lib/language-context';
import type { Language } from '@/lib/translations';

type ToggleLanguageOption = {
  value: Language;
  label: string;
  shortLabel: string;
  flag: string
};

export function useLanguageToggle() {
  const { language, languages, setLanguage, toggleLanguage, t } = useLanguage();

  const options = (Object.entries(languages) as [
    Language,
    (typeof languages)[Language],
  ][]).map(([value, config]) => ({
    value,
    label: t(config.labelKey),
    shortLabel: config.shortLabel,
    flag: config.flag,
  })) satisfies ToggleLanguageOption[];

  const currentIndex = options.findIndex((option) => option.value === language);
  const normalizedIndex = currentIndex >= 0 ? currentIndex : 0;
  const currentLanguage = options[normalizedIndex];
  const nextLanguage = options[(normalizedIndex + 1) % options.length];

  return {
    language,
    languages: options,
    currentLanguage,
    nextLanguage,
    setLanguage,
    toggleLanguage,
  };
}
