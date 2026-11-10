import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowRight } from '@/components/ui/icons';
import { Notice, PageHeader } from '@/components/ui/primitives';
import { GUIDES } from '@/lib/content/guides';
import { getDictionary, isLocale, localizePath, type Locale } from '@/lib/i18n';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const l = isLocale(locale) ? locale : 'en';
  const t = getDictionary(l);
  return pageMetadata(l, '/guides', { title: t.guides.title, description: t.guides.subtitle });
}

export default async function GuidesPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = (await params).locale as Locale;
  const t = getDictionary(locale);
  return (
    <>
      <PageHeader eyebrow={t.home.educationEyebrow} title={t.guides.title} body={t.guides.subtitle} />
      <div className="container-x py-12">
        <Notice tone="info" className="mb-10 max-w-3xl">{t.guides.disclaimer}</Notice>
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {GUIDES.map((g, i) => (
            <li key={g.slug}>
              <Link href={localizePath(locale, `/guides/${g.slug}`)} className="group flex h-full flex-col rounded-[var(--radius-lg)] border border-line bg-white p-6 transition-shadow hover:shadow-[var(--shadow-lift)]">
                <span className="text-sm font-semibold tabular-nums text-muted">{String(i + 1).padStart(2, '0')}</span>
                <span className="mt-4 text-xl font-semibold">{g.content[locale].title}</span>
                <span className="mt-2 flex-1 text-sm leading-relaxed text-muted-text">{g.content[locale].summary}</span>
                <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-accent-text">{t.guides.readGuide}<ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" /></span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
