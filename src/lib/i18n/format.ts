// Formatting helpers with no dictionary imports (safe for client bundles).
import { LOCALE_LABELS, type Locale } from './config';

export type Plural = { one: string; other: string };

/** Replace {placeholders}. */
export function fmt(template: string, values: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => (k in values ? String(values[k]) : `{${k}}`));
}

export function formatNumber(locale: Locale, n: number, digits = 0): string {
  return new Intl.NumberFormat(LOCALE_LABELS[locale].htmlLang, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n);
}

export function plural(locale: Locale, entry: Plural, count: number, values: Record<string, string | number> = {}): string {
  const rule = new Intl.PluralRules(LOCALE_LABELS[locale].htmlLang).select(count);
  return fmt(rule === 'one' ? entry.one : entry.other, { count: formatNumber(locale, count), ...values });
}

export function formatMonth(locale: Locale, isoDate: string | Date): string {
  const d = typeof isoDate === 'string' ? new Date(isoDate) : isoDate;
  return new Intl.DateTimeFormat(LOCALE_LABELS[locale].htmlLang, { year: 'numeric', month: 'long', timeZone: 'UTC' }).format(d);
}

export function formatDate(locale: Locale, isoDate: string | Date): string {
  const d = typeof isoDate === 'string' ? new Date(isoDate) : isoDate;
  return new Intl.DateTimeFormat(LOCALE_LABELS[locale].htmlLang, { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Seoul' }).format(d);
}

export function languageName(languages: Record<string, string>, code: string): string {
  return languages[code] ?? code.toUpperCase();
}
