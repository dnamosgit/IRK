import { RATING_DIMENSIONS, config } from '@/lib/config';
import type { RatingSummary as Summary } from '@/lib/rating';
import { fmt, formatMonth, formatNumber, getDictionary, plural, type Locale } from '@/lib/i18n';
import { Info, ShieldCheck } from '@/components/ui/icons';

export function ScoreMeter({ value, label }: { value: number; label: string }) {
  const pct = Math.max(0, Math.min(100, ((value - 1) / 4) * 100));
  return (
    <div role="img" aria-label={label} className="h-1.5 w-full overflow-hidden rounded-full bg-mist">
      <div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(pct, 3)}%` }} />
    </div>
  );
}

export function RatingSummaryPanel({ summary, locale }: { summary: Summary; locale: Locale }) {
  const t = getDictionary(locale);
  const maxDist = Math.max(1, ...summary.distribution);
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <div className="rounded-[var(--radius-lg)] bg-ink p-6 text-white md:p-8">
        <p className="text-sm text-white/60">{t.ratings.overall}</p>
        {summary.adjusted !== null ? (
          <>
            <p className="mt-2 flex items-baseline gap-2">
              <span className="text-6xl font-semibold tabular-nums tracking-tight">{formatNumber(locale, summary.adjusted, 1)}</span>
              <span className="text-white/50">/ 5</span>
            </p>
            <p className="mt-1 text-xs uppercase tracking-[0.12em] text-[#a9c0d6]">{t.ratings.adjusted}</p>
            <p className="mt-4 text-sm text-white/75">{plural(locale, t.ratings.basedOn, summary.count)}</p>
            {summary.rawAverage !== null && <p className="text-sm text-white/55">{fmt(t.ratings.rawAverage, { avg: formatNumber(locale, summary.rawAverage, 2) })}</p>}
          </>
        ) : (
          <p className="mt-3 text-[0.95rem] leading-relaxed text-white/80">
            {fmt(t.ratings.notEnoughOverall, { min: config.rating.minReviewsForOverall, count: summary.count })}
          </p>
        )}
        <div className="mt-6 space-y-1.5 border-t border-white/10 pt-5 text-sm text-white/70">
          <p className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-[#7fd1b3]" />
            {fmt(t.ratings.verifiedSplit, { verified: summary.verifiedCount, unverified: summary.unverifiedCount })}
          </p>
          {summary.firstVisit && summary.lastVisit && (
            <p>{fmt(t.ratings.dateRange, { from: formatMonth(locale, summary.firstVisit), to: formatMonth(locale, summary.lastVisit) })}</p>
          )}
        </div>
        <details className="group mt-5 text-sm">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[#a9c0d6] hover:text-white">
            <Info size={15} /> {t.ratings.methodology}
          </summary>
          <p className="mt-3 leading-relaxed text-white/70">{fmt(t.ratings.methodologyBody, { m: config.rating.confidenceThreshold })}</p>
        </details>
      </div>

      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold">{t.ratings.categoryAverages}</h3>
          {summary.categories ? (
            <dl className="mt-4 space-y-4">
              {RATING_DIMENSIONS.map((d) => (
                <div key={d}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                    <dt className="text-muted-text">{t.ratings.dimensions[d]}</dt>
                    <dd className="font-semibold tabular-nums">{formatNumber(locale, summary.categories![d], 1)}</dd>
                  </div>
                  <ScoreMeter value={summary.categories![d]} label={fmt(t.ratings.outOf, { value: formatNumber(locale, summary.categories![d], 1) })} />
                </div>
              ))}
            </dl>
          ) : (
            <p className="mt-3 text-sm text-muted-text">{fmt(t.ratings.notEnoughCategories, { min: config.rating.minReviewsForCategories })}</p>
          )}
        </div>
        <div>
          <h3 className="text-sm font-semibold">{t.ratings.distribution}</h3>
          <ul className="mt-4 space-y-2.5">
            {[5, 4, 3, 2, 1].map((star) => {
              const n = summary.distribution[star - 1];
              return (
                <li key={star} className="grid grid-cols-[1.5rem_1fr_2rem] items-center gap-3 text-sm" aria-label={fmt(t.ratings.distributionLabel, { stars: star, count: n })}>
                  <span aria-hidden="true" className="tabular-nums text-muted-text">{star}</span>
                  <span aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-mist">
                    <span className="block h-full rounded-full bg-ink/80" style={{ width: `${(n / maxDist) * 100}%` }} />
                  </span>
                  <span aria-hidden="true" className="text-right tabular-nums text-muted-text">{n}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
