import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Notice } from '@/components/ui/primitives';
import { LEGAL, type LegalSlug } from '@/lib/content/legal';
import { fmt, formatDate, getDictionary, isLocale, type Locale } from '@/lib/i18n';
import { pageMetadata } from '@/lib/seo';

type Props = { params: Promise<{ locale: string; doc: string }> };
const isDoc = (d: string): d is LegalSlug => d in LEGAL;

export function generateStaticParams() {
  return Object.keys(LEGAL).map((doc) => ({ doc }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: l, doc } = await params;
  const locale = isLocale(l) ? l : 'en';
  if (!isDoc(doc)) return {};
  const d = LEGAL[doc].sections[locale];
  return pageMetadata(locale, `/legal/${doc}`, { title: d.title, description: d.intro });
}

export default async function LegalPage({ params }: Props) {
  const { locale: l, doc } = await params;
  const locale = l as Locale;
  if (!isDoc(doc)) notFound();
  const t = getDictionary(locale);
  const d = LEGAL[doc];
  const c = d.sections[locale];
  return (
    <article className="container-x max-w-3xl py-12 md:py-16">
      <p className="eyebrow">{t.legal.draft}</p>
      <h1 className="mt-3 text-4xl font-semibold md:text-5xl">{c.title}</h1>
      <p className="mt-3 text-sm text-muted-text">{fmt(t.legal.updated, { date: formatDate(locale, d.updated) })}</p>
      {locale !== 'en' && <Notice tone="warning" className="mt-6">{t.common.draftTranslation}</Notice>}
      <div className="prose-legal mt-8">
        <p className="text-[1.08rem]">{c.intro}</p>
        {c.sections.map((s) => (
          <section key={s.h}>
            <h2>{s.h}</h2>
            {s.p?.map((p) => <p key={p}>{p}</p>)}
            {s.ul && <ul>{s.ul.map((x) => <li key={x}>{x}</li>)}</ul>}
          </section>
        ))}
      </div>
    </article>
  );
}
