import 'server-only';
import { readerDb } from '@/lib/db';
import { config, type RatingDimension, type ServiceCategory } from '@/lib/config';
import type { Locale } from '@/lib/i18n';

const SAMPLE_CLAUSE = config.sampleMode ? 'true' : 'NOT r.is_sample';

export type PublicReview = {
  id: string;
  officeSlug: string;
  officeName: string;
  service: ServiceCategory;
  visitMonth: string;
  usedAppointment: 'yes' | 'no' | 'unsure';
  receivedService: 'yes' | 'partially' | 'no' | 'unsure';
  language: string;
  title: string | null;
  body: string;
  verified: boolean;
  overall: number;
  helpfulCount: number;
  isRedacted: boolean;
  isSample: boolean;
  authorDeleted: boolean;
  authorName: string | null;
  publishedAt: string;
  editedAt: string | null;
  scores: Record<RatingDimension, number>;
  translation: { id: string; title: string | null; body: string; engine: string } | null;
  responses: { organization: string; body: string; language: string; publishedAt: string }[];
};

export type ReviewSort = 'recent' | 'helpful' | 'verified' | 'highest' | 'lowest';
export type ReviewFilters = {
  officeId?: string;
  sort?: ReviewSort;
  service?: string;
  language?: string;
  periodMonths?: number;
  verifiedOnly?: boolean;
  page?: number;
  pageSize?: number;
};

const ORDER: Record<ReviewSort, string> = {
  recent: 'r.published_at DESC',
  helpful: 'r.helpful_count DESC, r.published_at DESC',
  verified: "(r.verification = 'verified') DESC, r.published_at DESC",
  highest: 'r.overall_score DESC, r.published_at DESC',
  lowest: 'r.overall_score ASC, r.published_at DESC',
};

export async function listPublishedReviews(locale: Locale, f: ReviewFilters = {}) {
  const params: unknown[] = [locale];
  const where = [`r.status = 'approved'`, SAMPLE_CLAUSE];
  if (f.officeId) {
    params.push(f.officeId);
    where.push(`r.office_id = $${params.length}`);
  }
  if (f.service) {
    params.push(f.service);
    where.push(`r.service_category::text = $${params.length}`);
  }
  if (f.language) {
    params.push(f.language);
    where.push(`r.original_language = $${params.length}`);
  }
  if (f.periodMonths) {
    params.push(f.periodMonths);
    where.push(`r.visit_month >= date_trunc('month', now()) - make_interval(months => $${params.length}::int)`);
  }
  if (f.verifiedOnly) where.push(`r.verification = 'verified'`);

  const pageSize = Math.min(f.pageSize ?? 10, 50);
  const page = Math.max(1, f.page ?? 1);
  const whereSql = where.join(' AND ');

  // $1 (locale) is only used by the main query; reference it so parameter numbering stays shared
  const total = await readerDb.query<{ n: number }>(`SELECT count(*)::int AS n FROM public.reviews r WHERE ${whereSql} AND $1::text IS NOT NULL`, params);
  params.push(pageSize, (page - 1) * pageSize);
  const r = await readerDb.query(
    `SELECT r.id, r.service_category, r.visit_month, r.used_appointment, r.received_service, r.original_language,
            r.title, r.body, r.verification, r.overall_score, r.helpful_count, r.is_redacted, r.is_sample,
            r.author_deleted, r.published_at, r.edited_at,
            public.review_author_name(r.id) AS author_name,
            o.slug AS office_slug, coalesce(tl.name, ten.name, o.official_name_ko) AS office_name,
            (SELECT json_object_agg(rr.dimension, rr.score) FROM public.review_ratings rr WHERE rr.review_id = r.id) AS scores,
            (SELECT json_build_object('id', t.id, 'title', t.translated_title, 'body', t.translated_body, 'engine', t.engine)
               FROM public.review_translations t WHERE t.review_id = r.id AND t.target_language = $1) AS translation,
            (SELECT coalesce(json_agg(json_build_object('organization', x.organization_name, 'body', x.body,
                     'language', x.language, 'publishedAt', x.published_at) ORDER BY x.published_at), '[]'::json)
               FROM public.review_responses x WHERE x.review_id = r.id) AS responses
       FROM public.reviews r
       JOIN public.offices o ON o.id = r.office_id
       LEFT JOIN public.office_translations tl ON tl.office_id = o.id AND tl.locale = $1
       LEFT JOIN public.office_translations ten ON ten.office_id = o.id AND ten.locale = 'en'
      WHERE ${whereSql}
      ORDER BY ${ORDER[f.sort ?? 'recent']}
      LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );

  const reviews: PublicReview[] = r.rows.map((row) => ({
    id: row.id,
    officeSlug: row.office_slug,
    officeName: row.office_name,
    service: row.service_category,
    visitMonth: new Date(row.visit_month).toISOString().slice(0, 10),
    usedAppointment: row.used_appointment,
    receivedService: row.received_service,
    language: row.original_language,
    title: row.title,
    body: row.body,
    verified: row.verification === 'verified',
    overall: Number(row.overall_score),
    helpfulCount: row.helpful_count,
    isRedacted: row.is_redacted,
    isSample: row.is_sample,
    authorDeleted: row.author_deleted,
    authorName: row.author_name,
    publishedAt: new Date(row.published_at).toISOString(),
    editedAt: row.edited_at ? new Date(row.edited_at).toISOString() : null,
    scores: row.scores ?? {},
    translation: row.translation && row.original_language !== locale && row.translation.body ? row.translation : null,
    responses: row.responses ?? [],
  }));

  return { reviews, total: total.rows[0].n, page, pageSize, pages: Math.max(1, Math.ceil(total.rows[0].n / pageSize)) };
}

export function parseReviewFilters(sp: Record<string, string | string[] | undefined>): ReviewFilters {
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k]![0] : (sp[k] as string | undefined));
  const sort = one('sort');
  const period = Number(one('period'));
  return {
    sort: sort && sort in ORDER ? (sort as ReviewSort) : 'recent',
    service: one('service') || undefined,
    language: ['en', 'es', 'ko'].includes(one('lang') ?? '') ? one('lang') : undefined,
    periodMonths: [3, 6, 12].includes(period) ? period : undefined,
    verifiedOnly: one('verified') === '1',
    page: Math.max(1, Number(one('page')) || 1),
  };
}

/** Which of these reviews the signed-in user already marked helpful. */
export async function getUserVotes(userId: string | undefined, reviewIds: string[]): Promise<Set<string>> {
  if (!userId || reviewIds.length === 0) return new Set();
  const { appDb } = await import('@/lib/db');
  const r = await appDb.query<{ review_id: string }>(
    'SELECT review_id FROM public.helpful_votes WHERE user_id = $1 AND review_id = ANY($2::uuid[])',
    [userId, reviewIds],
  );
  return new Set(r.rows.map((x) => x.review_id));
}
