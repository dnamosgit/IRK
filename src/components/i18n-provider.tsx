'use client';
import { createContext, useContext, type ReactNode } from 'react';
import type { Dictionary } from '@/lib/i18n/dictionaries/en';
import type { Locale } from '@/lib/i18n/config';
import { localizePath } from '@/lib/i18n/paths';

type Ctx = { locale: Locale; t: Dictionary; href: (internalPath: string) => string };
const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ locale, dictionary, children }: { locale: Locale; dictionary: Dictionary; children: ReactNode }) {
  return (
    <I18nContext.Provider value={{ locale, t: dictionary, href: (p) => localizePath(locale, p) }}>{children}</I18nContext.Provider>
  );
}

export function useI18n(): Ctx {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider');
  return ctx;
}
