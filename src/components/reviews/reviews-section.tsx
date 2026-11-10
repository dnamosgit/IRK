import Link from 'next/link';
import { AutoSubmitForm } from '@/components/offices/auto-submit';
import { ReviewCard } from './review-card';
import { EmptyState, buttonClass, cx } from '@/components/ui/primitives';
import { ChevronLeft, ChevronRight, PenLine } from '@/components/ui/icons';
import { getUserVotes, listPublishedReviews, parseReviewFilters } from '@/lib/queries/reviews';
import { getCurrentUser } from '@/lib/auth/session';
import { SERVICE_CATEGORIES } from '@/lib/config';
import { fmt, getDictionary, LOCALES, localizePath, plural, type Locale } from '@/lib/i18n';

type SP = Record<string, string | string[] | undefined>;

/** Sorting, filters (service, language, period, verification) and pagination. */
export async function ReviewsSection({ locale, searchParams, basePath, officeId, showOffice = false, writeHref }: {
  locale: Locale; searchParams: SP; basePath: string; officeId?: string; showOffice?: boolean; writeHref: string;
}) {
  const t = getDictionary(locale);
  const f = parseReviewFilters(searchParams);
  const [result, user] = await Promise.all([
    listPublishedReviews(locale, { ...f, officeId, pageSize: 10 }),
    getCurrentUser().catch(() => null),
  ]);
  const votes = await getUserVotes(user?.id, result.reviews.map((r) => r.id));
  const action = localizePath(locale, basePath);
  const filtered = !!(f.service || f.language || f.periodMonths || f.verifiedOnly);

  const pageHref = (page: number) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) if (typeof v === 'string' && k !== 'page') p.set(k, v);
    if (page > 1) p.set('page', String(page));
    const s = p.toString();
    return `${action}${s ? `?${s}` : ''}#reviews`;
  };
  const selectCls = 'h-10 w-full rounded-[var(--radius-md)] border border-line-strong bg-white px-3 text-sm';

  return (
    <div id="reviews" className="scroll-mt-24">
      <AutoSubmitForm action={`${action}#reviews`} className="grid grid-cols-2 gap-3 md:grid-cols-[repeat(5,minmax(0,1fr))_auto] md:items-end">
        <label className="col-span-2 md:col-span-1">
          <span className="mb-1 block text-xs font-medium text-muted-text">{t.common.sortBy}</span>
          <select name="sort" defaultValue={f.sort} className={selectCls}>
            <option value="recent">{t.reviews.sortRecent}</option>
            <option value="helpful">{t.reviews.sortHelpful}</option>
            <option value="verified">{t.reviews.sortVerified}</option>
            <option value="highest">{t.reviews.sortHighest}</option>
            <option value="lowest">{t.reviews.sortLowest}</option>
          </select>
        </label>
        <label>
          <span className="mb-1 block text-xs font-medium text-muted-text">{t.reviews.filterService}</span>
          <select name="service" defaultValue={f.service ?? ''} className={selectCls}>
            <option value="">{t.reviews.allServices}</option>
            {SERVICE_CATEGORIES.map((s) => <option key={s} value={s}>{t.services[s]}</option>)}
          </select>
        </label>
        <label>
          <span className="mb-1 block text-xs font-medium text-muted-text">{t.reviews.filterLanguage}</span>
          <select name="lang" defaultValue={f.language ?? ''} className={selectCls}>
            <option value="">{t.reviews.allLanguages}</option>
            {LOCALES.map((l) => <option key={l} value={l}>{t.languages[l]}</option>)}
          </select>
        </label>
        <label>
          <span className="mb-1 block text-xs font-medium text-muted-text">{t.reviews.filterPeriod}</span>
          <select name="period" defaultValue={f.periodMonths ? String(f.periodMonths) : ''} className={selectCls}>
            <option value="">{t.reviews.anyTime}</option>
            <option value="3">{t.reviews.last3}</option>
            <option value="6">{t.reviews.last6}</option>
            <option value="12">{t.reviews.last12}</option>
          </select>
        </label>
        <label>
          <span className="mb-1 block text-xs font-medium text-muted-text">{t.reviews.filterVerified}</span>
          <select name="verified" defaultValue={f.verifiedOnly ? '1' : ''} className={selectCls}>
            <option value="">{t.reviews.anyVerification}</option>
            <option value="1">{t.reviews.verifiedOnly}</option>
          </select>
        </label>
        <noscript><button type="submit" className={buttonClass('secondary', 'sm')}>{t.common.filters}</button></noscript>
      </AutoSubmitForm>

      <p className="mt-5 text-sm text-muted-text" aria-live="polite">{plural(locale, t.common.results, result.total)}</p>

      {result.reviews.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            title={filtered ? t.reviews.emptyFiltered : t.reviews.empty}
            body={filtered ? undefined : t.reviews.beFirst}
            action={filtered
              ? <Link href={`${action}#reviews`} className={buttonClass('secondary')}>{t.directory.resetFilters}</Link>
              : <Link href={writeHref} className={buttonClass('primary')}><PenLine size={16} />{t.nav.writeReview}</Link>}
          />
        </div>
      ) : (
        <div className="mt-4 space-y-5">
          {result.reviews.map((r) => <ReviewCard key={r.id} review={r} showOffice={showOffice} signedIn={!!user} voted={votes.has(r.id)} />)}
        </div>
      )}

      {result.pages > 1 && (
        <nav aria-label={fmt(t.common.page, { page: result.page, total: result.pages })} className="mt-8 flex items-center justify-between gap-4">
          <Link aria-disabled={result.page <= 1} tabIndex={result.page <= 1 ? -1 : undefined} href={pageHref(result.page - 1)} className={cx(buttonClass('secondary', 'sm'), result.page <= 1 && 'pointer-events-none opacity-40')}>
            <ChevronLeft size={16} /> {t.common.previous}
          </Link>
          <span className="text-sm text-muted-text">{fmt(t.common.page, { page: result.page, total: result.pages })}</span>
          <Link aria-disabled={result.page >= result.pages} tabIndex={result.page >= result.pages ? -1 : undefined} href={pageHref(result.page + 1)} className={cx(buttonClass('secondary', 'sm'), result.page >= result.pages && 'pointer-events-none opacity-40')}>
            {t.common.next} <ChevronRight size={16} />
          </Link>
        </nav>
      )}
    </div>
  );
}
