import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ChangePasswordForm, DeleteAccountForm, DeleteEvidenceButton, DisplayNameForm } from '@/components/forms/account-forms';
import { ResendVerificationForm } from '@/components/forms/auth-forms';
import { Badge, Notice, buttonClass } from '@/components/ui/primitives';
import { Lock, PenLine, ShieldCheck } from '@/components/ui/icons';
import { getCurrentUser } from '@/lib/auth/session';
import { signOutAction } from '@/lib/actions/auth';
import { appDb } from '@/lib/db';
import { isAdmin } from '@/lib/rbac';
import { config } from '@/lib/config';
import { formatDate, formatMonth, getDictionary, isLocale, localizePath, type Locale } from '@/lib/i18n';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const l = isLocale(locale) ? locale : 'en';
  return pageMetadata(l, '/account', { title: getDictionary(l).account.title, noindex: true });
}

const STATUS_TONE = { pending: 'accent', approved: 'verified', needs_clarification: 'warning', legal_review: 'warning', rejected: 'danger', hidden: 'warning', removed: 'danger' } as const;

export default async function AccountPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ welcome?: string }> }) {
  const locale = (await params).locale as Locale;
  const t = getDictionary(locale);
  const user = await getCurrentUser();
  if (!user) redirect(`${localizePath(locale, '/auth/sign-in')}?next=${encodeURIComponent(localizePath(locale, '/account'))}`);
  const welcome = (await searchParams).welcome;

  // the author's own reviews (private view: includes non-published statuses)
  const reviews = (await appDb.query(
    `SELECT r.id, r.status, r.visit_month, r.service_category, r.title, r.created_at, r.verification, o.slug,
            coalesce(tl.name, o.official_name_ko) AS office,
            (SELECT message_to_author FROM private.moderation_actions a WHERE a.review_id = r.id AND a.message_to_author IS NOT NULL ORDER BY a.created_at DESC LIMIT 1) AS message,
            (SELECT json_build_object('id', v.id, 'status', v.status, 'deleted', v.evidence_deleted_at IS NOT NULL, 'reason', v.decision_reason)
               FROM private.verification_events v WHERE v.review_id = r.id ORDER BY v.created_at DESC LIMIT 1) AS verification_event
       FROM public.reviews r JOIN public.offices o ON o.id = r.office_id
       LEFT JOIN public.office_translations tl ON tl.office_id = o.id AND tl.locale = $2
      WHERE r.user_id = $1 ORDER BY r.created_at DESC`,
    [user.id, locale],
  )).rows;

  const section = 'rounded-[var(--radius-lg)] border border-line bg-white p-6 md:p-8';
  return (
    <div className="container-x max-w-4xl py-12 md:py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-semibold">{t.account.title}</h1>
          <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-text"><Lock size={14} />{t.account.privateNote}</p>
        </div>
        <div className="flex gap-2">
          {isAdmin(user.roles) && <Link href="/admin" className={buttonClass('secondary', 'sm')}>{t.account.adminLink}</Link>}
          <form action={signOutAction}><button type="submit" className={buttonClass('ghost', 'sm')}>{t.nav.signOut}</button></form>
        </div>
      </div>

      {welcome && !user.emailVerified && (
        <Notice tone="info" className="mt-8" title={t.auth.checkEmailTitle}>
          {t.auth.checkEmailBody}
          {!config.isProduction && <> <Link className="underline" href={localizePath(locale, '/dev/outbox')}>Dev outbox</Link></>}
        </Notice>
      )}

      <div className="mt-8 space-y-6">
        <section className={section} aria-labelledby="profile">
          <h2 id="profile" className="text-lg font-semibold">{t.account.profile}</h2>
          <div className="mt-5"><DisplayNameForm current={user.displayName} generated={user.displayNameGenerated} /></div>
          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line pt-5 text-sm">
            <span className="text-muted-text">{t.account.email}:</span>
            <span className="font-medium">{user.email}</span>
            {user.emailVerified ? <Badge tone="verified">{t.account.emailVerified}</Badge> : <><Badge tone="warning">{t.account.emailUnverified}</Badge><ResendVerificationForm /></>}
          </div>
        </section>

        <section className={section} aria-labelledby="my-reviews">
          <div className="flex items-center justify-between gap-4">
            <h2 id="my-reviews" className="text-lg font-semibold">{t.account.myReviews}</h2>
            <Link href={localizePath(locale, '/write-review')} className={buttonClass('primary', 'sm')}><PenLine size={15} />{t.nav.writeReview}</Link>
          </div>
          {reviews.length === 0 ? (
            <p className="mt-5 text-sm text-muted-text">{t.account.noReviews}</p>
          ) : (
            <ul className="mt-5 divide-y divide-line">
              {reviews.map((r) => {
                const ve = r.verification_event as { id: string; status: keyof typeof t.verify.status; deleted: boolean; reason: string | null } | null;
                const status = r.status as keyof typeof t.account.statuses;
                return (
                  <li key={r.id} className="py-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{r.office}</p>
                        <p className="text-sm text-muted-text">{t.services[r.service_category as keyof typeof t.services]} · {formatMonth(locale, r.visit_month)} · {formatDate(locale, r.created_at)}</p>
                        {r.title && <p className="mt-1 text-sm">{r.title}</p>}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge tone={STATUS_TONE[status]}>{t.account.statuses[status]}</Badge>
                        {r.verification === 'verified' && <Badge tone="verified"><ShieldCheck size={13} />{t.reviews.verified}</Badge>}
                        {ve && r.verification !== 'verified' && <Badge>{t.verify.status[ve.status]}</Badge>}
                      </div>
                    </div>
                    {r.message && (
                      <div className="mt-3 rounded-[var(--radius-md)] bg-warning-bg px-4 py-3 text-sm">
                        <p className="font-semibold text-warning">{t.account.moderatorMessage}</p>
                        <p className="mt-1 whitespace-pre-line">{r.message}</p>
                      </div>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
                      {r.status === 'approved' && <Link className="text-accent-text hover:underline" href={`${localizePath(locale, `/offices/${r.slug}`)}#review-${r.id}`}>{t.common.view}</Link>}
                      {['pending', 'needs_clarification', 'approved'].includes(r.status) && <Link className="text-accent-text hover:underline" href={localizePath(locale, `/account/reviews/${r.id}/edit`)}>{t.account.editReview}</Link>}
                      {r.verification === 'unverified' && !['rejected', 'removed'].includes(r.status) && (!ve || ve.status !== 'submitted') && (
                        <Link className="text-accent-text hover:underline" href={localizePath(locale, `/account/reviews/${r.id}/verify`)}>{t.account.verifyVisit}</Link>
                      )}
                      {['rejected', 'removed', 'hidden'].includes(r.status) && <Link className="text-accent-text hover:underline" href={`${localizePath(locale, '/appeals')}?review=${r.id}`}>{t.account.appeal}</Link>}
                      {ve && !ve.deleted && <DeleteEvidenceButton eventId={ve.id} />}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className={section} aria-labelledby="security">
          <h2 id="security" className="text-lg font-semibold">{t.account.security}</h2>
          <div className="mt-5"><ChangePasswordForm /></div>
        </section>

        <section className={`${section} border-[#f1cdc9]`} aria-labelledby="data">
          <h2 id="data" className="text-lg font-semibold">{t.account.dataTitle}</h2>
          <p className="mt-2 text-sm text-muted-text">{t.account.dataBody}</p>
          <h3 className="mt-6 font-semibold text-danger">{t.account.deleteTitle}</h3>
          <div className="mt-3"><DeleteAccountForm /></div>
        </section>
      </div>
    </div>
  );
}
