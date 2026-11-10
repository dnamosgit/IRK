import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { ReviewWizard } from '@/components/forms/review-wizard';
import { getCurrentUser } from '@/lib/auth/session';
import { appDb } from '@/lib/db';
import { monthOptions, wizardOffices } from '@/lib/queries/wizard';
import { getDictionary, isLocale, localizePath, type Locale } from '@/lib/i18n';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: string; id: string }> }): Promise<Metadata> {
  const { locale, id } = await params;
  const l = isLocale(locale) ? locale : 'en';
  return pageMetadata(l, `/account/reviews/${id}/edit`, { title: getDictionary(l).account.editReview, noindex: true });
}

export default async function EditReviewPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale: l, id } = await params;
  const locale = l as Locale;
  const t = getDictionary(locale);
  const user = await getCurrentUser();
  if (!user) redirect(localizePath(locale, '/auth/sign-in'));
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const r = await appDb.query(
    `SELECT r.*, (SELECT json_object_agg(dimension, score) FROM public.review_ratings WHERE review_id = r.id) AS ratings
       FROM public.reviews r WHERE r.id = $1 AND r.user_id = $2 AND r.status IN ('pending','needs_clarification','approved')`,
    [id, user.id],
  );
  const review = r.rows[0];
  if (!review) notFound();
  const offices = await wizardOffices(locale);
  const months = monthOptions(locale);
  const visitMonth = new Date(review.visit_month).toISOString().slice(0, 7);
  if (!months.some((m) => m.value === visitMonth)) months.push({ value: visitMonth, label: visitMonth });
  return (
    <div className="container-x max-w-3xl py-12 md:py-16">
      <h1 className="text-4xl font-semibold">{t.account.editReview}</h1>
      <p className="mt-3 text-muted-text">{offices.find((o) => o.id === review.office_id)?.name} — {t.account.editNote}</p>
      <div className="mt-10">
        <ReviewWizard offices={offices} months={months} initial={{
          reviewId: review.id, officeId: review.office_id, service: review.service_category, visitMonth,
          usedAppointment: review.used_appointment, receivedService: review.received_service, language: review.original_language,
          title: review.title ?? '', body: review.body, ratings: review.ratings ?? {},
        }} />
      </div>
    </div>
  );
}
