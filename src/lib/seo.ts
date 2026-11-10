import type { Metadata } from 'next';
import { config } from '@/lib/config';
import { LOCALES, LOCALE_LABELS, getDictionary, type Locale } from '@/lib/i18n';
import { localizePath } from '@/lib/i18n/paths';

type Options = { title?: string; description?: string; noindex?: boolean; absoluteTitle?: boolean };

/** Canonical URL, hreflang alternates, Open Graph and robots for a page. */
export function pageMetadata(locale: Locale, internalPath: string, opts: Options = {}): Metadata {
  const t = getDictionary(locale);
  const path = internalPath === '/' ? '' : internalPath;
  const languages: Record<string, string> = {};
  for (const l of LOCALES) languages[LOCALE_LABELS[l].htmlLang] = `${config.siteUrl}${localizePath(l, path)}`;
  languages['x-default'] = `${config.siteUrl}${localizePath('en', path)}`;
  const title = opts.title ? (opts.absoluteTitle ? opts.title : `${opts.title} | ${t.meta.siteName}`) : `${t.meta.siteName} — ${t.meta.tagline}`;
  const description = opts.description ?? t.meta.description;
  const url = `${config.siteUrl}${localizePath(locale, path)}`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url, languages },
    openGraph: {
      title,
      description,
      url,
      siteName: t.meta.siteName,
      locale: LOCALE_LABELS[locale].og,
      alternateLocale: LOCALES.filter((l) => l !== locale).map((l) => LOCALE_LABELS[l].og),
      type: 'website',
    },
    twitter: { card: 'summary_large_image', title, description },
    robots: opts.noindex ? { index: false, follow: false, nocache: true } : { index: true, follow: true },
  };
}
