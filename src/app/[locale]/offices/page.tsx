import Link from 'next/link';
import type { Metadata } from 'next';
import { OfficeCard } from '@/components/offices/office-card';
import { OfficeMap } from '@/components/offices/office-map';
import { AutoSubmitForm } from '@/components/offices/auto-submit';
import { ListIcon, MapIcon, SearchIcon, Building } from '@/components/ui/icons';
import { EmptyState, Notice, PageHeader, buttonClass, cx } from '@/components/ui/primitives';
import { listOffices } from '@/lib/queries/offices';
import { config, OFFICE_TYPES, REGIONS } from '@/lib/config';
import { fmt, getDictionary, isLocale, localizePath, plural, type Locale } from '@/lib/i18n';
import { pageMetadata } from '@/lib/seo';

type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const l = isLocale(locale) ? locale : 'en';
  const t = getDictionary(l);
  return pageMetadata(l, '/offices', { title: t.directory.title, description: t.directory.subtitle });
}

export default async function OfficesPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: SP }) {
  const locale = (await params).locale as Locale;
  const sp = await searchParams;
  const t = getDictionary(locale);
  const q = one(sp.q).slice(0, 80);
  const region = (REGIONS as readonly string[]).includes(one(sp.region)) ? one(sp.region) : '';
  const type = (OFFICE_TYPES as readonly string[]).includes(one(sp.type)) ? one(sp.type) : '';
  const sort = (['name', 'reviews', 'rating'] as const).find((s) => s === one(sp.sort)) ?? 'name';
  const view = one(sp.view) === 'map' ? 'map' : 'list';
  const offices = await listOffices(locale, { q, region, type, sort });
  const base = localizePath(locale, '/offices');
  const qs = (v: string) => {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (region) p.set('region', region);
    if (type) p.set('type', type);
    if (sort !== 'name') p.set('sort', sort);
    if (v === 'map') p.set('view', 'map');
    const s = p.toString();
    return s ? `${base}?${s}` : base;
  };
  const filtered = !!(q || region || type);

  return (
    <>
      <PageHeader eyebrow={t.home.featuredEyebrow} title={t.directory.title} body={t.directory.subtitle} />
      <div className="container-x py-10">
        <AutoSubmitForm action={base} className="grid gap-3 rounded-[var(--radius-lg)] border border-line bg-white p-3 md:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))_auto]">
          {view === 'map' && <input type="hidden" name="view" value="map" />}
          <label className="relative">
            <span className="sr-only">{t.search.label}</span>
            <SearchIcon size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-text" />
            <input type="search" name="q" defaultValue={q} placeholder={t.search.placeholder} className="h-11 w-full rounded-[var(--radius-md)] border border-line-strong bg-white pl-10 pr-3 text-[0.95rem] focus:outline-none focus:ring-2 focus:ring-accent/40" />
          </label>
          <label>
            <span className="sr-only">{t.directory.filterRegion}</span>
            <select name="region" defaultValue={region} className="h-11 w-full rounded-[var(--radius-md)] border border-line-strong bg-white px-3 text-[0.95rem]">
              <option value="">{t.directory.allRegions}</option>
              {REGIONS.map((r) => <option key={r} value={r}>{t.regions[r]}</option>)}
            </select>
          </label>
          <label>
            <span className="sr-only">{t.directory.filterType}</span>
            <select name="type" defaultValue={type} className="h-11 w-full rounded-[var(--radius-md)] border border-line-strong bg-white px-3 text-[0.95rem]">
              <option value="">{t.directory.allTypes}</option>
              {OFFICE_TYPES.map((o) => <option key={o} value={o}>{t.officeTypes[o]}</option>)}
            </select>
          </label>
          <label>
            <span className="sr-only">{t.common.sortBy}</span>
            <select name="sort" defaultValue={sort} className="h-11 w-full rounded-[var(--radius-md)] border border-line-strong bg-white px-3 text-[0.95rem]">
              <option value="name">{t.directory.sortName}</option>
              <option value="reviews">{t.directory.sortReviews}</option>
              <option value="rating">{t.directory.sortRating}</option>
            </select>
          </label>
          <button type="submit" className={buttonClass('primary', 'md')}>{t.common.search}</button>
        </AutoSubmitForm>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-muted-text" aria-live="polite">{plural(locale, t.common.results, offices.length)}</p>
          <div className="flex items-center gap-3">
            {filtered && <Link href={view === 'map' ? `${base}?view=map` : base} className="text-sm text-accent-text hover:underline">{t.directory.resetFilters}</Link>}
            <div className="inline-flex rounded-[var(--radius-md)] border border-line-strong bg-white p-1" role="group" aria-label={`${t.directory.listView} / ${t.directory.mapView}`}>
              <Link href={qs('list')} aria-current={view === 'list' ? 'page' : undefined} className={cx('inline-flex items-center gap-1.5 rounded-[6px] px-3 py-1.5 text-sm', view === 'list' ? 'bg-ink text-white' : 'text-muted-text hover:text-ink')}>
                <ListIcon size={16} /> {t.directory.listView}
              </Link>
              <Link href={qs('map')} aria-current={view === 'map' ? 'page' : undefined} className={cx('inline-flex items-center gap-1.5 rounded-[6px] px-3 py-1.5 text-sm', view === 'map' ? 'bg-ink text-white' : 'text-muted-text hover:text-ink')}>
                <MapIcon size={16} /> {t.directory.mapView}
              </Link>
            </div>
          </div>
        </div>
        {sort === 'rating' && <p className="mt-3 text-xs text-muted-text">{fmt(t.directory.sortRatingNote, { min: config.rating.minReviewsForOverall })}</p>}
        {config.sampleMode && offices.some((o) => o.hasSampleData) && <Notice tone="warning" className="mt-4">{t.common.sampleNotice}</Notice>}

        <div className="mt-6">
          {offices.length === 0 ? (
            <EmptyState icon={<Building size={20} />} title={t.directory.empty} action={<Link href={base} className={buttonClass('secondary')}>{t.directory.resetFilters}</Link>} />
          ) : view === 'map' ? (
            <>
              <OfficeMap
                offices={offices.filter((o) => o.latitude !== null).map((o) => ({
                  slug: o.slug, name: o.name, lat: o.latitude!, lng: o.longitude!, approximate: o.locationPrecision !== 'exact',
                  href: localizePath(locale, `/offices/${o.slug}`),
                }))}
              />
              {offices.some((o) => o.locationPrecision !== 'exact') && <p className="mt-3 text-xs text-muted-text">{t.directory.approximateLocation}.</p>}
              <ul className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {offices.map((o) => (
                  <li key={o.id}><Link href={localizePath(locale, `/offices/${o.slug}`)} className="block rounded-[var(--radius-md)] border border-line bg-white px-4 py-3 text-sm hover:border-ink/30">{o.name}</Link></li>
                ))}
              </ul>
            </>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {offices.map((o) => <OfficeCard key={o.id} office={o} locale={locale} />)}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
