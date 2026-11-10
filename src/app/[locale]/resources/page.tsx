import type { Metadata } from 'next';
import { External } from '@/components/ui/icons';
import { PageHeader } from '@/components/ui/primitives';
import { listOfficialResources } from '@/lib/queries/offices';
import { fmt, formatDate, getDictionary, isLocale, type Locale } from '@/lib/i18n';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const l = isLocale(locale) ? locale : 'en';
  const t = getDictionary(l);
  return pageMetadata(l, '/resources', { title: t.resources.title, description: t.resources.subtitle });
}

export default async function ResourcesPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = (await params).locale as Locale;
  const t = getDictionary(locale);
  const resources = await listOfficialResources();
  return (
    <>
      <PageHeader title={t.resources.title} body={`${t.resources.subtitle} ${t.common.independent}`} />
      <div className="container-x max-w-4xl py-10">
        <ul className="divide-y divide-line rounded-[var(--radius-lg)] border border-line bg-white">
          {resources.map((r) => (
            <li key={r.key} className="p-6">
              <a href={r.url} target={r.url.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-lg font-semibold text-ink hover:text-accent-text">
                {r.title[locale] ?? r.title.en}{r.url.startsWith('http') && <><External size={16} /><span className="sr-only">{t.common.externalLink}</span></>}
              </a>
              <p className="mt-1 text-sm text-muted-text">{r.description[locale] ?? r.description.en}</p>
              <p className="mt-2 text-xs text-muted-text"><span className="font-mono">{r.url.replace(/^https?:\/\//, '')}</span> · {r.last_checked_at ? fmt(t.resources.checked, { date: formatDate(locale, r.last_checked_at) }) : t.resources.notChecked}</p>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
