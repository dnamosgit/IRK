import Link from 'next/link';
import type { Metadata } from 'next';
import { ContactForm } from '@/components/forms/request-forms';
import { PageHeader } from '@/components/ui/primitives';
import { getDictionary, isLocale, localizePath, type Locale } from '@/lib/i18n';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const l = isLocale(locale) ? locale : 'en';
  return pageMetadata(l, '/contact', { title: getDictionary(l).contact.title });
}

export default async function ContactPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ kind?: string }> }) {
  const locale = (await params).locale as Locale;
  const kindParam = (await searchParams).kind;
  const kind = kindParam === 'problem' || kindParam === 'deletion_request' ? kindParam : 'contact';
  const t = getDictionary(locale);
  return (
    <>
      <PageHeader title={kind === 'problem' ? t.contact.problemTitle : t.contact.title} body={kind === 'problem' ? t.contact.problemIntro : t.contact.intro} />
      <div className="container-x grid max-w-5xl gap-12 py-12 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="rounded-[var(--radius-lg)] border border-line bg-white p-6 md:p-8"><ContactForm defaultKind={kind} /></div>
        <aside>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-text">{t.contact.otherRoutes}</h2>
          <ul className="mt-4 space-y-3 text-sm">
            <li><Link className="text-accent-text hover:underline" href={localizePath(locale, '/appeals')}>{t.contact.appealLink}</Link></li>
            <li><Link className="text-accent-text hover:underline" href={localizePath(locale, '/legal-requests')}>{t.contact.legalLink}</Link></li>
            <li><Link className="text-accent-text hover:underline" href={localizePath(locale, '/resources')}>{t.footer.officialResources}</Link></li>
          </ul>
        </aside>
      </div>
    </>
  );
}
