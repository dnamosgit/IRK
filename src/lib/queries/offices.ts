import 'server-only';
import { cache } from 'react';
import { readerDb } from '@/lib/db';
import { config, type OfficeType, type ServiceCategory } from '@/lib/config';
import { getDictionary, LOCALES, type Locale } from '@/lib/i18n';
import { emptyAggregate, starBucket, summarize, type OfficeAggregate, type RatingSummary } from '@/lib/rating';

// All public office queries run as the read-only role. Eligible reviews are
// approved reviews (RLS already hides everything else) — fictional samples
// count only in development sample mode.

const SAMPLE_CLAUSE = config.sampleMode ? 'true' : 'NOT r.is_sample';

export type OfficeCard = {
  id: string;
  slug: string;
  name: string;
  nameKo: string;
  nameEn: string;
  type: OfficeType;
  cityKey: string;
  regionKey: string;
  latitude: number | null;
  longitude: number | null;
  locationPrecision: 'exact' | 'approximate_city' | 'unknown';
  dataStatus: 'verified' | 'unverified' | 'outdated';
  addressLocalized: string | null;
  reviewCount: number;
  verifiedCount: number;
  adjustedRating: number | null;
  hasSampleData: boolean;
};

export type OfficeDetail = OfficeCard & {
  addressKo: string | null;
  phone: string | null;
  websiteUrl: string | null;
  appointmentInfoUrl: string | null;
  services: ServiceCategory[];
  lastVerifiedAt: string | null;
  dataSource: string | null;
  notes: string | null;
  isActive: boolean;
  names: Record<string, string>;
  sources: { id: string; title: string; url: string; sourceType: string; accessedAt: string | null; notes: string | null }[];
};

export const getPlatformAverage = cache(async (): Promise<number | null> => {
  const r = await readerDb.query<{ avg: string | null }>(
    `SELECT avg(r.overall_score)::numeric(4,3) AS avg FROM public.reviews r WHERE r.status = 'approved' AND ${SAMPLE_CLAUSE}`,
  );
  return r.rows[0].avg === null ? null : Number(r.rows[0].avg);
});

function ratingOptions() {
  return {
    m: config.rating.confidenceThreshold,
    minForOverall: config.rating.minReviewsForOverall,
    minForCategories: config.rating.minReviewsForCategories,
  };
}

/** Map a free-text query to city / region keys using every locale's names. */
function matchPlaceKeys(q: string): { cities: string[]; regions: string[] } {
  const needle = q.trim().toLocaleLowerCase();
  const cities = new Set<string>();
  const regions = new Set<string>();
  if (needle.length < 2) return { cities: [], regions: [] };
  for (const loc of LOCALES) {
    const d = getDictionary(loc);
    for (const [k, v] of Object.entries(d.cities)) if (v.toLocaleLowerCase().includes(needle) || k.includes(needle)) cities.add(k);
    for (const [k, v] of Object.entries(d.regions)) if (v.toLocaleLowerCase().includes(needle) || k.includes(needle)) regions.add(k);
  }
  return { cities: [...cities], regions: [...regions] };
}

type ListFilters = { q?: string; region?: string; type?: string; sort?: 'name' | 'reviews' | 'rating'; limit?: number };

export async function listOffices(locale: Locale, filters: ListFilters = {}): Promise<OfficeCard[]> {
  const params: unknown[] = [locale];
  const where: string[] = ['o.is_active'];
  if (filters.q && filters.q.trim()) {
    const q = filters.q.trim().slice(0, 80);
    const { cities, regions } = matchPlaceKeys(q);
    params.push(q, `%${q.replace(/[%_\\]/g, '\\$&')}%`, cities, regions);
    const [qi, li, ci, ri] = [params.length - 3, params.length - 2, params.length - 1, params.length];
    where.push(`(
      o.official_name_ko ILIKE $${li} OR replace(o.official_name_ko, '·', '') ILIKE $${li}
      OR o.slug ILIKE $${li} OR o.address_ko ILIKE $${li}
      OR EXISTS (SELECT 1 FROM public.office_translations t WHERE t.office_id = o.id
                 AND (t.name ILIKE $${li} OR t.address ILIKE $${li} OR similarity(t.name, $${qi}) > 0.35))
      OR similarity(o.official_name_ko, $${qi}) > 0.3
      OR o.city_key = ANY($${ci}::text[]) OR o.region_key = ANY($${ri}::text[])
    )`);
  }
  if (filters.region) {
    params.push(filters.region);
    where.push(`o.region_key = $${params.length}`);
  }
  if (filters.type) {
    params.push(filters.type);
    where.push(`o.office_type::text = $${params.length}`);
  }

  const r = await readerDb.query(
    `SELECT o.id, o.slug, o.office_type, o.official_name_ko, o.city_key, o.region_key, o.latitude, o.longitude,
            o.location_precision, o.data_status,
            coalesce(tl.name, ten.name, o.official_name_ko) AS name, ten.name AS name_en, tl.address AS address_localized,
            coalesce(s.n, 0)::int AS review_count, coalesce(s.verified, 0)::int AS verified_count,
            s.avg_score, coalesce(s.samples, 0)::int AS samples
       FROM public.offices o
       LEFT JOIN public.office_translations tl ON tl.office_id = o.id AND tl.locale = $1
       LEFT JOIN public.office_translations ten ON ten.office_id = o.id AND ten.locale = 'en'
       LEFT JOIN LATERAL (
         SELECT count(*) AS n, count(*) FILTER (WHERE r.verification = 'verified') AS verified,
                avg(r.overall_score) AS avg_score, count(*) FILTER (WHERE r.is_sample) AS samples
           FROM public.reviews r WHERE r.office_id = o.id AND r.status = 'approved' AND ${SAMPLE_CLAUSE}
       ) s ON true
      WHERE ${where.join(' AND ')}`,
    params,
  );

  const G = await getPlatformAverage();
  const opts = ratingOptions();
  const cards: OfficeCard[] = r.rows.map((row) => {
    const agg: OfficeAggregate = { ...emptyAggregate(), count: row.review_count, sumScore: Number(row.avg_score ?? 0) * row.review_count };
    const summary = summarize(agg, G, opts);
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      nameKo: row.official_name_ko,
      nameEn: row.name_en ?? row.name,
      type: row.office_type,
      cityKey: row.city_key,
      regionKey: row.region_key,
      latitude: row.latitude,
      longitude: row.longitude,
      locationPrecision: row.location_precision,
      dataStatus: row.data_status,
      addressLocalized: row.data_status === 'verified' ? row.address_localized : null,
      reviewCount: row.review_count,
      verifiedCount: row.verified_count,
      adjustedRating: summary.adjusted,
      hasSampleData: row.samples > 0,
    };
  });

  const collator = new Intl.Collator(locale);
  const sort = filters.sort ?? 'name';
  cards.sort((a, b) => {
    if (sort === 'reviews') return b.reviewCount - a.reviewCount || collator.compare(a.name, b.name);
    if (sort === 'rating') {
      // only offices meeting the sample requirement are ranked; the rest follow alphabetically
      if (a.adjustedRating !== null && b.adjustedRating !== null) return b.adjustedRating - a.adjustedRating;
      if (a.adjustedRating !== null) return -1;
      if (b.adjustedRating !== null) return 1;
      return collator.compare(a.name, b.name);
    }
    return collator.compare(a.name, b.name);
  });
  return filters.limit ? cards.slice(0, filters.limit) : cards;
}

export const getOfficeBySlug = cache(async (locale: Locale, slug: string): Promise<OfficeDetail | null> => {
  const r = await readerDb.query(
    `SELECT o.*, (SELECT json_object_agg(t.locale, t.name) FROM public.office_translations t WHERE t.office_id = o.id) AS names,
            tl.address AS address_localized, tl.notes
       FROM public.offices o
       LEFT JOIN public.office_translations tl ON tl.office_id = o.id AND tl.locale = $1
      WHERE o.slug = $2`,
    [locale, slug],
  );
  const row = r.rows[0];
  if (!row) return null;
  const sources = await readerDb.query(
    'SELECT id, title, url, source_type, accessed_at, notes FROM public.office_sources WHERE office_id = $1 ORDER BY created_at',
    [row.id],
  );
  const verified = row.data_status !== 'unverified';
  const names: Record<string, string> = row.names ?? {};
  return {
    id: row.id,
    slug: row.slug,
    name: names[locale] ?? names.en ?? row.official_name_ko,
    nameKo: row.official_name_ko,
    nameEn: names.en ?? row.official_name_ko,
    names,
    type: row.office_type,
    cityKey: row.city_key,
    regionKey: row.region_key,
    latitude: row.latitude,
    longitude: row.longitude,
    locationPrecision: row.location_precision,
    dataStatus: row.data_status,
    // contact details are only shown once a record has been verified
    addressKo: verified ? row.address_ko : null,
    addressLocalized: verified ? row.address_localized : null,
    phone: verified ? row.phone : null,
    websiteUrl: verified ? row.website_url : null,
    appointmentInfoUrl: verified ? row.appointment_info_url : null,
    services: verified ? row.services : [],
    lastVerifiedAt: row.last_verified_at ? new Date(row.last_verified_at).toISOString().slice(0, 10) : null,
    dataSource: row.data_source,
    notes: row.notes,
    isActive: row.is_active,
    reviewCount: 0,
    verifiedCount: 0,
    adjustedRating: null,
    hasSampleData: false,
    sources: sources.rows.map((s) => ({
      id: s.id, title: s.title, url: s.url, sourceType: s.source_type,
      accessedAt: s.accessed_at ? new Date(s.accessed_at).toISOString().slice(0, 10) : null, notes: s.notes,
    })),
  };
});

export async function getOfficeRating(officeId: string): Promise<RatingSummary & { hasSampleData: boolean }> {
  const r = await readerDb.query(
    `SELECT r.overall_score, r.verification, r.visit_month, r.is_sample,
            (SELECT json_object_agg(rr.dimension, rr.score) FROM public.review_ratings rr WHERE rr.review_id = r.id) AS scores
       FROM public.reviews r WHERE r.office_id = $1 AND r.status = 'approved' AND ${SAMPLE_CLAUSE}`,
    [officeId],
  );
  const agg = emptyAggregate();
  let samples = false;
  for (const row of r.rows) {
    const score = Number(row.overall_score);
    agg.count++;
    agg.sumScore += score;
    if (row.verification === 'verified') agg.verifiedCount++;
    if (row.is_sample) samples = true;
    for (const [d, v] of Object.entries(row.scores ?? {})) {
      (agg.dimensionSums as Record<string, number>)[d] += Number(v);
    }
    agg.distribution[starBucket(score) - 1]++;
    const month = new Date(row.visit_month).toISOString().slice(0, 10);
    if (!agg.firstVisit || month < agg.firstVisit) agg.firstVisit = month;
    if (!agg.lastVisit || month > agg.lastVisit) agg.lastVisit = month;
  }
  return { ...summarize(agg, await getPlatformAverage(), ratingOptions()), hasSampleData: samples };
}

export type Suggestion = { slug: string; name: string; secondary: string; cityKey: string };

export async function searchSuggestions(locale: Locale, q: string): Promise<Suggestion[]> {
  if (!q.trim()) return [];
  const offices = await listOffices(locale, { q, limit: 8 });
  return offices.map((o) => ({
    slug: o.slug,
    name: o.name,
    secondary: locale === 'ko' ? o.nameEn : o.nameKo,
    cityKey: o.cityKey,
  }));
}

export const getPublicStats = cache(async () => {
  const r = await readerDb.query(
    `SELECT (SELECT count(*) FROM public.offices WHERE is_active)::int AS offices,
            (SELECT count(*) FROM public.reviews r WHERE r.status = 'approved' AND NOT r.is_sample)::int AS reviews,
            (SELECT count(*) FROM public.reviews r WHERE r.status = 'approved' AND NOT r.is_sample AND r.verification = 'verified')::int AS verified`,
  );
  return { ...r.rows[0], languages: LOCALES.length } as { offices: number; reviews: number; verified: number; languages: number };
});

export async function listOfficialResources() {
  const r = await readerDb.query(
    'SELECT key, url, category, title, description, last_checked_at FROM public.official_resources WHERE is_active ORDER BY sort_order',
  );
  return r.rows as { key: string; url: string; category: string; title: Record<string, string>; description: Record<string, string>; last_checked_at: string | null }[];
}
