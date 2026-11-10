import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { OfficeArt } from '@/components/offices/office-art';
import { OfficeMap } from '@/components/offices/office-map';
import { RatingSummaryPanel } from '@/components/reviews/rating-summary';
import { ReviewsSection } from '@/components/reviews/reviews-section';
import { Alert, ChevronRight, External, Info, MapPin, PenLine, Phone } from '@/components/ui/icons';
import { Badge, ButtonLink, Notice } from '@/components/ui/primitives';
import { getOfficeBySlug, getOfficeRating } from '@/lib/queries/offices';
import { config } from '@/lib/config';
import { fmt, formatDate, getDictionary, isLocale, localizePath, type Locale } from '@/lib/i18n';
import { pageMetadata } from '@/lib/seo';
import { jsonForScript } from '@/lib/safe-url';

type Props = { params: Promise<{ locale: string; slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: l, slug } = await params;
  const locale = isLocale(l) ? l : 'en';
  const office = await getOfficeBySlug(locale, slug);
  if (!office) return { title: 'Not found', robots: { index: false } };
  const t = getDictionary(locale);
  const city = (t.cities as Record<string, string>)[office.cityKey] ?? office.cityKey;
  return pageMetadata(locale, `/offices/${slug}`, {
    title: fmt(t.meta.officeTitle, { office: office.name }),
    description: fmt(t.meta.officeDescription, { office: office.name, city }),
  });
}

export default async function OfficePage({ params, searchParams }: Props) {
  const { locale: l, slug } = await params;
  const locale = l as Locale;
  const t = getDictionary(locale);
  const office = await getOfficeBySlug(locale, slug);
  if (!office) notFound();
  const [rating, sp] = await Promise.all([getOfficeRating(office.id), searchParams]);
  const city = (t.cities as Record<string, string>)[office.cityKey] ?? office.cityKey;
  const region = (t.regions as Record<string, string>)[office.regionKey] ?? office.regionKey;
  const writeHref = `${localizePath(locale, '/write-review')}?office=${office.slug}`;
  const unverified = office.dataStatus === 'unverified';
  const nv = <span className="text-muted-text">{t.common.notVerified}</span>;

  // Structured data only for verified facts (no ratings markup, no unverified addresses)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'GovernmentOffice',
    name: office.nameEn,
    alternateName: office.nameKo,
    ...(office.addressKo ? { address: { '@type': 'PostalAddress', streetAddress: office.addressKo, addressCountry: 'KR' } } : {}),
    ...(office.phone ? { telephone: office.phone } : {}),
    ...(office.websiteUrl ? { url: office.websiteUrl } : {}),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonForScript(jsonLd) }} />
      <section className="relative overflow-hidden bg-ink text-white">
        <OfficeArt seed={office.slug} className="absolute inset-0 opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/70 to-ink/30" />
        <div className="container-x relative pb-12 pt-10 md:pb-16 md:pt-14">
          <nav aria-label="Breadcrumb" className="text-sm text-white/60">
            <ol className="flex items-center gap-1.5">
              <li><Link href={localizePath(locale, '/offices')} className="hover:text-white">{t.office.breadcrumb}</Link></li>
              <li aria-hidden="true"><ChevronRight size={14} /></li>
              <li aria-current="page" className="truncate text-white/85">{office.name}</li>
            </ol>
          </nav>
          <div className="mt-10 flex flex-wrap items-end justify-between gap-8">
            <div className="max-w-3xl">
              <Badge tone="dark">{t.officeTypes[office.type]}</Badge>
              <h1 className="mt-4 text-4xl font-semibold md:text-6xl">{office.name}</h1>
              {locale !== 'ko' && <p className="mt-3 text-lg text-white/70" lang="ko">{office.nameKo}</p>}
              <p className="mt-4 flex items-center gap-2 text-white/70"><MapPin size={17} />{city === region ? city : `${city}, ${region}`}</p>
            </div>
            {office.isActive && (
              <ButtonLink href={writeHref} variant="light" size="lg"><PenLine size={18} />{t.nav.writeReview}</ButtonLink>
            )}
          </div>
        </div>
      </section>

      <div className="container-x py-12 md:py-16">
        {!office.isActive && <Notice tone="warning" className="mb-8">{t.office.archived}</Notice>}
        {unverified && <Notice tone="warning" className="mb-8" title={t.common.notVerified}>{t.office.unverifiedBanner}</Notice>}
        {office.dataStatus === 'outdated' && <Notice tone="warning" className="mb-8">{t.office.outdated}</Notice>}
        {config.sampleMode && rating.hasSampleData && <Notice tone="warning" className="mb-8">{t.common.sampleNotice}</Notice>}

        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="min-w-0 space-y-16">
            <section aria-labelledby="ratings-title">
              <h2 id="ratings-title" className="mb-6 text-2xl font-semibold">{t.office.ratingsTitle}</h2>
              <RatingSummaryPanel summary={rating} locale={locale} />
            </section>
            <section aria-labelledby="reviews-title">
              <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                <h2 id="reviews-title" className="text-2xl font-semibold">{t.office.reviewsTitle}</h2>
              </div>
              <ReviewsSection locale={locale} searchParams={sp} basePath={`/offices/${office.slug}`} officeId={office.id} writeHref={writeHref} />
            </section>
          </div>

          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start" aria-labelledby="official-title">
            <div className="rounded-[var(--radius-lg)] border border-line bg-white p-6">
              <h2 id="official-title" className="flex items-center gap-2 text-lg font-semibold"><Info size={18} className="text-accent-text" />{t.office.officialInfo}</h2>
              <p className="mt-2 text-xs leading-relaxed text-muted-text">{t.office.officialInfoNote}</p>
              <dl className="mt-5 space-y-4 text-sm">
                <div><dt className="text-xs text-muted-text">{t.office.category}</dt><dd className="mt-0.5 font-medium">{t.officeTypes[office.type]}</dd></div>
                <div>
                  <dt className="text-xs text-muted-text">{t.office.address}</dt>
                  <dd className="mt-0.5">{office.addressKo ? <><span lang="ko" className="block">{office.addressKo}</span>{office.addressLocalized && locale !== 'ko' && <span className="block text-muted-text">{office.addressLocalized}</span>}</> : nv}</dd>
                </div>
                <div><dt className="text-xs text-muted-text">{t.office.phone}</dt><dd className="mt-0.5">{office.phone ? <a href={`tel:${office.phone}`} className="inline-flex items-center gap-1.5 text-accent-text hover:underline"><Phone size={14} />{office.phone}</a> : nv}</dd></div>
                <div><dt className="text-xs text-muted-text">{t.office.website}</dt><dd className="mt-0.5">{office.websiteUrl ? <a href={office.websiteUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 break-all text-accent-text hover:underline">{new URL(office.websiteUrl).host}<External size={13} /><span className="sr-only">{t.common.externalLink}</span></a> : nv}</dd></div>
                <div><dt className="text-xs text-muted-text">{t.office.appointmentsSource}</dt><dd className="mt-0.5">{office.appointmentInfoUrl ? <a href={office.appointmentInfoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 break-all text-accent-text hover:underline">{new URL(office.appointmentInfoUrl).host}<External size={13} /><span className="sr-only">{t.common.externalLink}</span></a> : nv}</dd></div>
                <div><dt className="text-xs text-muted-text">{t.office.services}</dt><dd className="mt-1">{office.services.length ? <ul className="flex flex-wrap gap-1.5">{office.services.map((s) => <li key={s}><Badge>{t.services[s]}</Badge></li>)}</ul> : nv}</dd></div>
                <div><dt className="text-xs text-muted-text">{t.office.lastVerified}</dt><dd className="mt-0.5">{office.lastVerifiedAt ? formatDate(locale, office.lastVerifiedAt) : <span className="inline-flex items-center gap-1 text-warning"><Alert size={14} />{t.office.neverVerified}</span>}</dd></div>
                {office.dataSource && <div><dt className="text-xs text-muted-text">{t.office.dataSource}</dt><dd className="mt-0.5 text-xs leading-relaxed text-muted-text" lang="en">{office.dataSource}</dd></div>}
              </dl>
              {office.sources.length > 0 && (
                <div className="mt-5 border-t border-line pt-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-text">{t.office.sources}</h3>
                  <ul className="mt-2 space-y-2 text-sm">
                    {office.sources.map((s) => (
                      <li key={s.id}>
                        <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-start gap-1 text-accent-text hover:underline">{s.title}<External size={13} className="mt-1 shrink-0" /><span className="sr-only">{t.common.externalLink}</span></a>
                        {s.accessedAt && <span className="block text-xs text-muted-text">{formatDate(locale, s.accessedAt)}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {office.latitude !== null && office.longitude !== null && (
              <div>
                <h2 className="sr-only">{t.office.location}</h2>
                <OfficeMap offices={[{ slug: office.slug, name: office.name, lat: office.latitude, lng: office.longitude, approximate: office.locationPrecision !== 'exact', href: '#' }]} heightClass="h-64" />
                {office.locationPrecision !== 'exact' && <p className="mt-2 text-xs text-muted-text">{t.directory.approximateLocation}</p>}
              </div>
            )}

            {office.isActive && (
              <div className="rounded-[var(--radius-lg)] bg-ink p-6 text-white">
                <p className="text-lg font-semibold">{t.office.share}</p>
                <p className="mt-2 text-sm text-white/65">{t.office.shareBody}</p>
                <ButtonLink href={writeHref} variant="light" className="mt-5 w-full"><PenLine size={16} />{t.nav.writeReview}</ButtonLink>
              </div>
            )}
          </aside>
        </div>
      </div>
    </>
  );
}
