// Locale configuration. To add a language: add it to LOCALES, create a
// dictionary file satisfying `Dictionary`, register it in dictionaries/index.ts,
// and (optionally) add localized path segments below.

export const LOCALES = ['en', 'es', 'ko'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALE_COOKIE = 'NEXT_LOCALE';

export const LOCALE_LABELS: Record<Locale, { short: string; native: string; htmlLang: string; og: string }> = {
  en: { short: 'EN', native: 'English', htmlLang: 'en', og: 'en_US' },
  es: { short: 'ES', native: 'Español', htmlLang: 'es', og: 'es_ES' },
  ko: { short: '한국어', native: '한국어', htmlLang: 'ko', og: 'ko_KR' },
};

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}

/**
 * Localized first path segments. Internal routes always use the English
 * segment (app/[locale]/offices/...); the proxy rewrites localized URLs.
 */
export const LOCALIZED_SEGMENTS: Record<string, Partial<Record<Locale, string>>> = {
  offices: { es: 'oficinas' },
  reviews: { es: 'resenas' },
  guides: { es: 'guias' },
  about: { es: 'acerca-de' },
  resources: { es: 'recursos' },
  contact: { es: 'contacto' },
  'write-review': { es: 'escribir-resena' },
  account: { es: 'cuenta' },
};
