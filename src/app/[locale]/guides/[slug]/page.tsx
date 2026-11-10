import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ChevronRight, External } from '@/components/ui/icons';
import { Notice } from '@/components/ui/primitives';
import { GUIDES, getGuide } from '@/lib/content/guides';
import { listOfficialResources } from '@/lib/queries/offices';
import { fmt, formatDate, getDictionary, isLocale, localizePath, type Locale } from '@/lib/i18n';
import { pageMetadata } from '@/lib/seo';

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: l, slug } = await params;
  const locale = isLocale(l) ? l : 'en';
  const g = getGuide(slug);
  if (!g) return {};
  return pageMetadata(locale, `/guides/${slug}`, { title: g.content[locale].title, description: g.content[locale].summary });
}

export default async function GuidePage({ params }: Props) {
  const { locale: l, slug } = await params;
  const locale = l as Locale;
  const t = getDictionary(locale);
  const g = getGuide(slug);
  if (!g) notFound();
  const c = g.content[locale];
  const resources = (await listOfficialResources()).filter((r) => g.officialKeys.includes(r.key));
  return (
    <article>
      <header className="border-b border-line bg-white">
        <div className="container-x max-w-3xl py-12 md:py-16">
          <nav aria-label="Breadcrumb" className="text-sm text-muted-text">
            <Link href={localizePath(locale, '/guides')} className="inline-flex items-center gap-1 hover:text-ink">{t.guides.title}<ChevronRight size={14} /></Link>
          </nav>
          <h1 className="mt-6 text-4xl font-semibold md:text-5xl">{c.title}</h1>
          <p className="mt-4 text-lg text-muted-text">{c.summary}</p>
          <p className="mt-6 text-xs text-muted-text">{fmt(t.guides.lastReviewed, { date: formatDate(locale, g.lastReviewed) })}</p>
        </div>
      </header>
      <div className="container-x grid max-w-5xl gap-12 py-12 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="prose-legal">
          <Notice tone="info" className="mb-8">{t.guides.disclaimer}</Notice>
          {c.sections.map((s) => (
            <section key={s.heading}>
              <h2>{s.heading}</h2>
              {s.paragraphs?.map((p) => <p key={p}>{p}</p>)}
              {s.bullets && <ul>{s.bullets.map((b) => <li key={b}>{b}</li>)}</ul>}
            </section>
          ))}
        </div>
        <aside className="lg:pt-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-text">{t.guides.officialLinks}</h2>
          <ul className="mt-4 space-y-3">
            {resources.map((r) => (
              <li key={r.key} className="rounded-[var(--radius-md)] border border-line bg-white p-4">
                <a href={r.url} target={r.url.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className="inline-flex items-start gap-1.5 font-medium text-accent-text hover:underline">
                  {r.title[locale] ?? r.title.en}{r.url.startsWith('http') && <External size={14} className="mt-1 shrink-0" />}
                </a>
                <p className="mt-1 text-xs text-muted-text">{r.description[locale] ?? r.description.en}</p>
              </li>
            ))}
          </ul>
          <h2 className="mt-10 text-sm font-semibold uppercase tracking-wide text-muted-text">{t.guides.related}</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {GUIDES.filter((x) => x.slug !== g.slug).map((x) => (
              <li key={x.slug}><Link href={localizePath(locale, `/guides/${x.slug}`)} className="text-ink hover:text-accent-text">{x.content[locale].title}</Link></li>
            ))}
          </ul>
        </aside>
      </div>
    </article>
  );
}
