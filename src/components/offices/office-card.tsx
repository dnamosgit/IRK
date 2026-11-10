import Link from 'next/link';
import type { OfficeCard as Office } from '@/lib/queries/offices';
import { formatNumber, getDictionary, localizePath, plural, type Locale } from '@/lib/i18n';
import { OfficeArt } from './office-art';
import { ArrowRight, MapPin, ShieldCheck } from '@/components/ui/icons';
import { Badge } from '@/components/ui/primitives';

export function OfficeCard({ office, locale }: { office: Office; locale: Locale }) {
  const t = getDictionary(locale);
  const city = (t.cities as Record<string, string>)[office.cityKey] ?? office.cityKey;
  const region = (t.regions as Record<string, string>)[office.regionKey] ?? office.regionKey;
  const href = localizePath(locale, `/offices/${office.slug}`);
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-line bg-white transition-[box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]">
      <OfficeArt seed={office.slug} label={t.officeTypes[office.type]} sublabel={locale === 'ko' ? undefined : office.nameKo} className="aspect-[2/1]" />
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg font-semibold leading-snug">
          <Link href={href} className="after:absolute after:inset-0 focus-visible:outline-none">
            {office.name}
          </Link>
        </h3>
        <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-text">
          <MapPin size={15} />
          {city === region ? city : `${city}, ${region}`}
        </p>
        <p className="mt-1 text-xs text-muted-text">{office.addressLocalized ?? t.common.notVerified}</p>

        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-4 text-sm">
          {office.adjustedRating !== null ? (
            <span className="font-semibold tabular-nums">{formatNumber(locale, office.adjustedRating, 1)}<span className="font-normal text-muted-text"> / 5</span></span>
          ) : null}
          <span className="text-muted-text">
            {office.reviewCount > 0 ? plural(locale, t.directory.reviewCount, office.reviewCount) : t.directory.noReviewsYet}
          </span>
          {office.verifiedCount > 0 && (
            <Badge tone="verified"><ShieldCheck size={13} />{plural(locale, t.directory.verifiedCount, office.verifiedCount)}</Badge>
          )}
          {office.hasSampleData && <Badge tone="sample">{t.common.sampleBadge}</Badge>}
        </div>
        <span aria-hidden="true" className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-accent-text">
          {t.directory.viewOffice}
          <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </article>
  );
}
