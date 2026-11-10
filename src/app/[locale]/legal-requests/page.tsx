import type { Metadata } from 'next';
import { LegalRequestForm } from '@/components/forms/request-forms';
import { PageHeader } from '@/components/ui/primitives';
import { getDictionary, isLocale, type Locale } from '@/lib/i18n';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const l = isLocale(locale) ? locale : 'en';
  return pageMetadata(l, '/legal-requests', { title: getDictionary(l).legalRequest.title });
}

export default async function LegalRequestsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ review?: string }> }) {
  const locale = (await params).locale as Locale;
  const t = getDictionary(locale);
  return (
    <>
      <PageHeader title={t.legalRequest.title} body={t.legalRequest.intro} />
      <div className="container-x max-w-2xl py-12">
        <div className="rounded-[var(--radius-lg)] border border-line bg-white p-6 md:p-8">
          <LegalRequestForm defaultReview={(await searchParams).review} />
        </div>
      </div>
    </>
  );
}
