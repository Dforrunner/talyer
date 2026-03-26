'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { db } from './db';
import {
  defaultLanguage,
  supportedLanguages,
  translations,
  type Language,
  type TranslationKey,
} from './translations';

const LANGUAGE_STORAGE_KEY = 'shop-management-language';

interface LanguageContextType {
  language: Language;
  locale: string;
  languages: typeof supportedLanguages;
  setLanguage: (lang: Language) => Promise<void>;
  toggleLanguage: () => Promise<void>;
  t: (key: TranslationKey) => string;
  formatCurrency: (amount: number, currency?: string) => string;
  formatDate: (
    value: Date | string | number,
    options?: Intl.DateTimeFormatOptions,
  ) => string;
  formatMonth: (
    value: Date | string | number,
    options?: Intl.DateTimeFormatOptions,
  ) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && value in supportedLanguages;
}

function getInitialLanguage(): Language {
  if (typeof window === 'undefined') {
    return defaultLanguage;
  }

  const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return isLanguage(storedLanguage) ? storedLanguage : defaultLanguage;
}

function getLocale(language: Language) {
  return supportedLanguages[language].locale;
}

async function persistLanguage(language: Language) {
  await db.run(
    `INSERT INTO business_settings (id, language)
     VALUES (1, ?)
     ON CONFLICT(id) DO UPDATE SET
       language = excluded.language,
       updated_at = CURRENT_TIMESTAMP`,
    [language],
  );
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage);

  useEffect(() => {
    document.documentElement.lang = getLocale(language);
    document.documentElement.dataset.language = language;
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  }, [language]);

  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const settings = await db.get(
          'SELECT language FROM business_settings LIMIT 1',
        );

        if (isLanguage(settings?.language)) {
          setLanguageState(settings.language);
          window.localStorage.setItem(LANGUAGE_STORAGE_KEY, settings.language);
        }
      } catch (error) {
        console.error('Error loading language:', error);
      }
    };

    void loadLanguage();
  }, []);

  const setLanguage = async (nextLanguage: Language) => {
    setLanguageState(nextLanguage);
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);

    try {
      await persistLanguage(nextLanguage);
    } catch (error) {
      console.error('Error saving language preference:', error);
    }
  };

  const toggleLanguage = async () => {
    const languageKeys = Object.keys(supportedLanguages) as Language[];
    const currentIndex = languageKeys.indexOf(language);
    const nextLanguage =
      languageKeys[(currentIndex + 1) % languageKeys.length] ?? defaultLanguage;

    await setLanguage(nextLanguage);
  };

  const locale = getLocale(language);

  const t = (key: TranslationKey): string => {
    return translations[language][key] ?? translations.en[key] ?? key;
  };

  const formatCurrency = (amount: number, currency = 'PHP') => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (
    value: Date | string | number,
    options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' },
  ) => {
    return new Intl.DateTimeFormat(locale, options).format(new Date(value));
  };

  const formatMonth = (
    value: Date | string | number,
    options: Intl.DateTimeFormatOptions = { month: 'short' },
  ) => {
    return new Intl.DateTimeFormat(locale, options).format(new Date(value));
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        locale,
        languages: supportedLanguages,
        setLanguage,
        toggleLanguage,
        t,
        formatCurrency,
        formatDate,
        formatMonth,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);

  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }

  return context;
};
