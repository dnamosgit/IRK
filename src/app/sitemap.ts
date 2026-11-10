import type { MetadataRoute } from 'next';
import { readerDb } from '@/lib/db';
import { config } from '@/lib/config';
import { GUIDES } from '@/lib/content/guides';
import { LEGAL } from '@/lib/content/legal';
import { LOCALES } from '@/lib/i18n/config';
import { localizePath } from '@/lib/i18n/paths';

export const revalidate = 3600;

// Public, indexable pages only (no account, auth, admin or write pages).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const paths = ['', '/offices', '/reviews', '/guides', '/about', '/resources', '/contact', '/legal-requests',
    ...GUIDES.map((g) => `/guides/${g.slug}`), ...Object.keys(LEGAL).map((d) => `/legal/${d}`)];
  let offices: { slug: string; updated_at: Date }[] = [];
  try {
    offices = (await readerDb.query<{ slug: string; updated_at: Date }>('SELECT slug, updated_at FROM public.offices WHERE is_active')).rows;
  } catch {
    /* database unavailable at build time */
  }
  const entry = (p: string, lastModified?: Date): MetadataRoute.Sitemap[number] => ({
    url: `${config.siteUrl}${localizePath('en', p)}`,
    lastModified,
    alternates: { languages: Object.fromEntries(LOCALES.map((l) => [l, `${config.siteUrl}${localizePath(l, p)}`])) },
  });
  return [...paths.map((p) => entry(p)), ...offices.map((o) => entry(`/offices/${o.slug}`, o.updated_at))];
}
