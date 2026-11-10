import type { Metadata } from 'next';
import { AppealForm } from '@/components/forms/request-forms';
import { PageHeader } from '@/components/ui/primitives';
import { getCurrentUser } from '@/lib/auth/session';
import { appDb } from '@/lib/db';
import { formatMonth, getDictionary, isLocale, type Locale } from '@/lib/i18n';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const l = isLocale(locale) ? locale : 'en';
  return pageMetadata(l, '/appeals', { title: getDictionary(l).appeal.title, noindex: true });
}

export default async function AppealsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ review?: string }> }) {
  const locale = (await params).locale as Locale;
  const t = getDictionary(locale);
  const user = await getCurrentUser();
  const reviews = user
    ? (await appDb.query(
        `SELECT r.id, r.visit_month, coalesce(tl.name, o.official_name_ko) AS office FROM public.reviews r JOIN public.offices o ON o.id = r.office_id
           LEFT JOIN public.office_translations tl ON tl.office_id = o.id AND tl.locale = $2 WHERE r.user_id = $1 ORDER BY r.created_at DESC`,
        [user.id, locale],
      )).rows.map((r) => ({ id: r.id as string, label: `${r.office} · ${formatMonth(locale, r.visit_month)}` }))
    : [];
  return (
    <>
      <PageHeader title={t.appeal.title} body={t.appeal.intro} />
      <div className="container-x max-w-2xl py-12">
        <div className="rounded-[var(--radius-lg)] border border-line bg-white p-6 md:p-8">
          <AppealForm signedIn={!!user} reviews={reviews} defaultReview={(await searchParams).review} />
        </div>
      </div>
    </>
  );
}
