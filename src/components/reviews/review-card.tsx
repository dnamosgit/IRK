'use client';
import Link from 'next/link';
import { useActionState, useRef, useState } from 'react';
import { useI18n } from '@/components/i18n-provider';
import { Badge, cx } from '@/components/ui/primitives';
import { Field, Select, SubmitButton, Textarea } from '@/components/ui/form';
import { Flag, Languages, ShieldCheck, ThumbUp } from '@/components/ui/icons';
import { ScoreBar } from './score-bar';
import { fmt, formatMonth, languageName, plural } from '@/lib/i18n/format';
import { RATING_DIMENSIONS, REPORT_REASONS } from '@/lib/config';
import type { PublicReview } from '@/lib/queries/reviews';
import { reportReviewAction, reportTranslationAction } from '@/lib/actions/reviews';
import { initialState } from '@/lib/actions/state';

export function ReviewCard({ review, showOffice = false, signedIn, voted = false }: { review: PublicReview; showOffice?: boolean; signedIn: boolean; voted?: boolean }) {
  const { t, locale, href } = useI18n();
  const hasTranslation = !!review.translation;
  const [showOriginal, setShowOriginal] = useState(!hasTranslation);
  const [expanded, setExpanded] = useState(false);
  const [helpful, setHelpful] = useState({ count: review.helpfulCount, voted, message: '' });
  const reportDialog = useRef<HTMLDialogElement>(null);

  const title = !showOriginal && review.translation ? review.translation.title : review.title;
  const body = !showOriginal && review.translation ? review.translation.body : review.body;
  const textLang = !showOriginal && review.translation ? locale : review.language;
  const long = body.length > 420;
  const author = review.isSample ? t.reviews.sampleReviewer : review.authorDeleted ? t.reviews.deletedAuthor : review.authorName ?? t.reviews.anonymous;

  async function toggleHelpful() {
    if (!signedIn) {
      setHelpful((h) => ({ ...h, message: t.reviews.helpfulSignIn }));
      return;
    }
    const res = await fetch(`/api/reviews/${review.id}/helpful`, { method: 'POST' });
    if (res.ok) {
      const json = (await res.json()) as { count: number; voted: boolean };
      setHelpful({ count: json.count, voted: json.voted, message: json.voted ? t.reviews.helpfulThanks : '' });
    }
  }

  return (
    <article id={`review-${review.id}`} className="@container scroll-mt-28 rounded-[var(--radius-lg)] border border-line bg-white p-5 md:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-mist text-sm font-semibold text-accent-text">
            {author.slice(0, 1)}
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium">{author}</p>
            <p className="text-xs text-muted-text">
              {fmt(t.reviews.visited, { month: formatMonth(locale, review.visitMonth) })} · {t.services[review.service]}
              {showOffice && (
                <>
                  {' · '}
                  <Link href={href(`/offices/${review.officeSlug}`)} className="underline-offset-2 hover:underline">{review.officeName}</Link>
                </>
              )}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {review.isSample && <Badge tone="sample">{t.common.sampleBadge}</Badge>}
          {review.verified ? (
            <Badge tone="verified" title={t.reviews.verifiedTooltip}><ShieldCheck size={13} />{t.reviews.verified}</Badge>
          ) : (
            <Badge tone="neutral">{t.reviews.unverified}</Badge>
          )}
        </div>
      </header>

      <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 @xl:grid-cols-5">
        {RATING_DIMENSIONS.map((d) => (
          <div key={d}>
            <dt className="text-[0.72rem] text-muted-text">{t.ratings.short[d]}</dt>
            <dd className="mt-1"><ScoreBar value={review.scores[d]} label={`${t.ratings.dimensions[d]}: ${fmt(t.ratings.outOf, { value: review.scores[d] })}`} /></dd>
          </div>
        ))}
      </dl>

      <div className="mt-5" lang={textLang}>
        {title && <h3 className="text-[1.05rem] font-semibold">{title}</h3>}
        <p className={cx('mt-1.5 whitespace-pre-line text-[0.97rem] leading-relaxed text-[#2b3542]', !expanded && long && 'line-clamp-5')}>{body}</p>
        {long && (
          <button type="button" onClick={() => setExpanded((e) => !e)} aria-expanded={expanded} className="mt-1 text-sm font-medium text-accent-text hover:underline">
            {expanded ? t.reviews.showLess : t.reviews.readMore}
          </button>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-text">
        <span>{fmt(t.reviews.writtenIn, { language: languageName(t.languages, review.language) })}</span>
        {hasTranslation && (
          <>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1">
              <Languages size={13} />
              {showOriginal ? null : fmt(t.reviews.autoTranslated, { language: languageName(t.languages, review.language) })}
            </span>
            <button type="button" onClick={() => setShowOriginal((s) => !s)} className="font-medium text-accent-text hover:underline">
              {showOriginal ? t.reviews.showTranslation : t.reviews.showOriginal}
            </button>
            {!showOriginal && <TranslationReport translationId={review.translation!.id} />}
          </>
        )}
        {!hasTranslation && review.language !== locale && (
          <>
            <span aria-hidden="true">·</span>
            <span>{t.reviews.translationUnavailable}</span>
          </>
        )}
        {review.editedAt && (<><span aria-hidden="true">·</span><span>{t.reviews.edited}</span></>)}
      </div>
      {review.isRedacted && <p className="mt-2 text-xs italic text-muted-text">{t.reviews.redacted}</p>}

      {review.responses.map((r, i) => (
        <div key={i} className="mt-4 rounded-[var(--radius-md)] border-l-2 border-accent bg-paper px-4 py-3" lang={r.language}>
          <p className="text-xs font-semibold text-accent-text">{fmt(t.reviews.response, { organization: r.organization })}</p>
          <p className="mt-1 whitespace-pre-line text-sm text-[#2b3542]">{r.body}</p>
        </div>
      ))}

      <footer className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleHelpful}
            aria-pressed={helpful.voted}
            className={cx('inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors', helpful.voted ? 'border-ink bg-ink text-white' : 'border-line-strong text-ink hover:border-ink/40')}
          >
            <ThumbUp size={15} /> {t.reviews.helpful}
          </button>
          <span className="text-xs text-muted-text" aria-live="polite">
            {helpful.message || (helpful.count > 0 ? plural(locale, t.reviews.helpfulCount, helpful.count) : '')}
          </span>
        </div>
        {!review.isSample && (
          <button type="button" onClick={() => reportDialog.current?.showModal()} className="inline-flex items-center gap-1.5 text-sm text-muted-text hover:text-ink">
            <Flag size={15} /> {t.reviews.report}
          </button>
        )}
      </footer>
      {!review.isSample && <ReportDialog ref={reportDialog} reviewId={review.id} />}
    </article>
  );
}

function ReportDialog({ reviewId, ref }: { reviewId: string; ref: React.RefObject<HTMLDialogElement | null> }) {
  const { t, locale } = useI18n();
  const [state, action] = useActionState(reportReviewAction, initialState);
  return (
    <dialog ref={ref} aria-labelledby={`report-${reviewId}`} className="m-auto w-[min(92vw,30rem)] rounded-[var(--radius-lg)] p-0 shadow-[var(--shadow-lift)] backdrop:bg-ink/50 backdrop:backdrop-blur-sm">
      <div className="p-6">
        <h2 id={`report-${reviewId}`} className="text-lg font-semibold">{t.report.title}</h2>
        <p className="mt-1 text-sm text-muted-text">{t.report.intro}</p>
        {state.ok ? (
          <div className="mt-5 space-y-4">
            <p role="status" className="rounded-[var(--radius-md)] bg-[#e9f5f0] px-4 py-3 text-sm text-[#174f3d]">
              {state.message} {state.data?.code ? fmt(t.common.reference, { code: String(state.data.code) }) : null}
            </p>
            <button type="button" onClick={() => ref.current?.close()} className="text-sm font-medium text-accent-text">{t.common.close}</button>
          </div>
        ) : (
          <form action={action} className="mt-5 space-y-4">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="reviewId" value={reviewId} />
            <Field label={t.report.reason} required error={state.fieldErrors?.reason}>
              {(p) => (
                <Select id={p.id} name="reason" required defaultValue="" invalid={p.invalid} aria-describedby={p.describedBy}>
                  <option value="" disabled>—</option>
                  {REPORT_REASONS.map((r) => <option key={r} value={r}>{t.report.reasons[r]}</option>)}
                </Select>
              )}
            </Field>
            <Field label={t.report.details} hint={t.report.detailsHint} optionalLabel={t.common.optional}>
              {(p) => <Textarea id={p.id} name="details" maxLength={1000} rows={3} aria-describedby={p.describedBy} />}
            </Field>
            {state.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => ref.current?.close()} className="h-11 px-4 text-sm text-muted-text">{t.common.cancel}</button>
              <SubmitButton>{t.report.submit}</SubmitButton>
            </div>
          </form>
        )}
      </div>
    </dialog>
  );
}

function TranslationReport({ translationId }: { translationId: string }) {
  const { t, locale } = useI18n();
  const [state, action] = useActionState(reportTranslationAction, initialState);
  if (state.ok) return <span className="text-verified-text">{state.message}</span>;
  return (
    <form action={action} className="inline">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="translationId" value={translationId} />
      <button type="submit" className="hover:text-ink hover:underline">{t.reviews.reportTranslation}</button>
    </form>
  );
}
