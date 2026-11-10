import { DEFAULT_LOCALE, LOCALIZED_SEGMENTS, isLocale, type Locale } from './config';

const reverse: Record<string, string> = {};
for (const [internal, map] of Object.entries(LOCALIZED_SEGMENTS)) {
  for (const seg of Object.values(map)) if (seg) reverse[seg] = internal;
}

/** '/offices/x' + 'es' -> '/es/oficinas/x' */
export function localizePath(locale: Locale, internalPath: string): string {
  const [pathPart, query = ''] = internalPath.split(/(?=[?#])/);
  const parts = pathPart.split('/').filter(Boolean);
  if (parts.length > 0) {
    const localized = LOCALIZED_SEGMENTS[parts[0]]?.[locale];
    if (localized) parts[0] = localized;
  }
  return `/${locale}${parts.length ? '/' + parts.join('/') : ''}${query}`;
}

/** Map a localized first segment back to the internal one. */
export function internalSegment(segment: string): string {
  return reverse[segment] ?? segment;
}

/** Split '/es/oficinas/x' into { locale: 'es', internalPath: '/offices/x' } */
export function parsePath(pathname: string): { locale: Locale | null; internalPath: string } {
  const parts = pathname.split('/').filter(Boolean);
  const first = parts[0];
  if (!isLocale(first)) return { locale: null, internalPath: pathname || '/' };
  const rest = parts.slice(1);
  if (rest.length) rest[0] = internalSegment(rest[0]);
  return { locale: first, internalPath: '/' + rest.join('/') };
}

/** Equivalent URL of the current page in another language. */
export function switchLocalePath(pathname: string, target: Locale, search = ''): string {
  const { internalPath } = parsePath(pathname);
  return localizePath(target, internalPath === '/' ? '' : internalPath) + search;
}

export function canonicalLocale(value: string | undefined): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}
