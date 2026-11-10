import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { VerificationForm } from '@/components/forms/account-forms';
import { Notice } from '@/components/ui/primitives';
import { getCurrentUser } from '@/lib/auth/session';
import { appDb } from '@/lib/db';
import { config } from '@/lib/config';
import { isEvidenceStorageConfigured } from '@/lib/storage/crypto';
import { getDictionary, isLocale, localizePath, type Locale } from '@/lib/i18n';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: string; id: string }> }): Promise<Metadata> {
  const { locale, id } = await params;
  const l = isLocale(locale) ? locale : 'en';
  return pageMetadata(l, `/account/reviews/${id}/verify`, { title: getDictionary(l).verify.title, noindex: true });
}

export default async function VerifyVisitPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale: l, id } = await params;
  const locale = l as Locale;
  const t = getDictionary(locale);
  const user = await getCurrentUser();
  if (!user) redirect(localizePath(locale, '/auth/sign-in'));
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const r = await appDb.query(
    `SELECT r.id, coalesce(tl.name, o.official_name_ko) AS office,
            EXISTS (SELECT 1 FROM private.verification_events v WHERE v.review_id = r.id AND v.status = 'submitted') AS pending
       FROM public.reviews r JOIN public.offices o ON o.id = r.office_id
       LEFT JOIN public.office_translations tl ON tl.office_id = o.id AND tl.locale = $3
      WHERE r.id = $1 AND r.user_id = $2 AND r.status NOT IN ('rejected','removed')`,
    [id, user.id, locale],
  );
  const review = r.rows[0];
  if (!review) notFound();
  return (
    <div className="container-x max-w-2xl py-12 md:py-16">
      <h1 className="text-4xl font-semibold">{t.verify.title}</h1>
      <p className="mt-2 text-muted-text">{review.office}</p>
      <p className="mt-6 text-[1.02rem] leading-relaxed">{t.verify.intro}</p>
      <div className="mt-8 rounded-[var(--radius-lg)] border border-line bg-white p-6 md:p-8">
        {review.pending ? <Notice tone="success">{t.verify.submitted}</Notice>
          : !isEvidenceStorageConfigured() ? <Notice tone="warning">{t.common.pendingApproval}: EVIDENCE_ENCRYPTION_KEY</Notice>
          : <VerificationForm reviewId={review.id} retentionDays={config.verification.retentionDays} />}
      </div>
    </div>
  );
}
