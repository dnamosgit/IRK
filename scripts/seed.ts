// Seeds the office directory, official resources and (development only)
// clearly-labelled fictional sample reviews. Idempotent.
import './_env';
import crypto from 'node:crypto';
import pg from 'pg';
import { SEED_OFFICES, SEED_RESOURCES } from '../db/seed/offices';
import { SAMPLE_REVIEWS } from '../db/seed/samples';
import { getTranslationProvider } from '../src/lib/translation/providers';

const url = process.env.DATABASE_OWNER_URL;
if (!url) throw new Error('DATABASE_OWNER_URL is required');
const client = new pg.Client({
  connectionString: url,
  ssl: process.env.DATABASE_SSL === 'require' ? { rejectUnauthorized: true } : undefined,
});
await client.connect();

const DIMENSIONS = ['professionalism', 'communication', 'waiting', 'appointment_process', 'accessibility'];
const LOCALES = ['en', 'es', 'ko'] as const;

try {
  await client.query('BEGIN');
  for (const o of SEED_OFFICES) {
    const r = await client.query(
      `INSERT INTO public.offices (slug, office_type, official_name_ko, city_key, region_key, latitude, longitude,
         location_precision, data_status, data_source)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'approximate_city','unverified',$8)
       ON CONFLICT (slug) DO UPDATE SET official_name_ko = EXCLUDED.official_name_ko
       RETURNING id`,
      [o.slug, o.type, o.nameKo, o.city, o.region, o.approx[0], o.approx[1],
        'Initial directory seed. Name follows the public Korea Immigration Service office list; address, contact details, hours and services have not yet been verified against an official source.'],
    );
    const id = r.rows[0].id;
    const names = { en: o.nameEn, es: o.nameEs, ko: o.nameKo };
    for (const loc of LOCALES) {
      await client.query(
        `INSERT INTO public.office_translations (office_id, locale, name) VALUES ($1,$2,$3)
         ON CONFLICT (office_id, locale) DO UPDATE SET name = EXCLUDED.name`,
        [id, loc, names[loc]],
      );
    }
    const src = await client.query('SELECT 1 FROM public.office_sources WHERE office_id = $1', [id]);
    if (src.rowCount === 0) {
      await client.query(
        `INSERT INTO public.office_sources (office_id, title, url, source_type, notes)
         VALUES ($1, 'Korea Immigration Service — official office directory', 'https://www.immigration.go.kr', 'official',
         'Verification against this source is pending.')`,
        [id],
      );
    }
  }

  for (const res of SEED_RESOURCES) {
    await client.query(
      `INSERT INTO public.official_resources (key, url, category, title, description, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (key) DO UPDATE SET url = EXCLUDED.url, title = EXCLUDED.title, description = EXCLUDED.description`,
      [res.key, res.url, res.category, res.title, res.description, res.sort],
    );
  }

  const wantSamples = process.env.SAMPLE_DATA === 'true' && process.env.NODE_ENV !== 'production';
  if (wantSamples) {
    const existing = await client.query('SELECT count(*)::int AS n FROM public.reviews WHERE is_sample');
    if (existing.rows[0].n === 0) {
      const provider = getTranslationProvider();
      const now = new Date();
      for (const sr of SAMPLE_REVIEWS) {
        const office = await client.query('SELECT id FROM public.offices WHERE slug = $1', [sr.office]);
        const visit = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - sr.monthsAgo, 1));
        const overall = sr.scores.reduce((a, b) => a + b, 0) / 5;
        const published = new Date(visit.getTime() + 12 * 86400000);
        const hash = crypto.createHash('sha256').update(sr.body).digest('hex');
        const rv = await client.query(
          `INSERT INTO public.reviews (office_id, service_category, visit_month, used_appointment, received_service,
             original_language, title, body, status, verification, overall_score, is_sample, content_hash, published_at, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'approved',$9,$10,true,$11,$12,$12) RETURNING id`,
          [office.rows[0].id, sr.service, visit.toISOString().slice(0, 10), sr.appointment, sr.outcome, sr.lang,
            sr.title, sr.body, sr.verified ? 'verified' : 'unverified', overall.toFixed(2), hash, published],
        );
        const reviewId = rv.rows[0].id;
        for (let i = 0; i < 5; i++) {
          await client.query('INSERT INTO public.review_ratings (review_id, dimension, score) VALUES ($1,$2,$3)', [reviewId, DIMENSIONS[i], sr.scores[i]]);
        }
        for (const target of LOCALES) {
          if (target === sr.lang) continue;
          const t = await provider.translate({ texts: [sr.title, sr.body], source: sr.lang, target });
          await client.query(
            `INSERT INTO public.review_translations (review_id, source_language, target_language, translated_title,
               translated_body, engine, status, source_hash, translated_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7::translation_status,$8, CASE WHEN $7::text = 'completed' THEN now() END)`,
            [reviewId, sr.lang, target, t.ok ? t.texts[0] : null, t.ok ? t.texts[1] : null, provider.name,
              t.ok ? 'completed' : 'unavailable', hash],
          );
        }
      }
      console.log(`Inserted ${SAMPLE_REVIEWS.length} FICTIONAL sample reviews (development only).`);
    }
  }
  await client.query('COMMIT');
  console.log(`Seeded ${SEED_OFFICES.length} offices (all marked UNVERIFIED) and ${SEED_RESOURCES.length} official resources.`);
} catch (e) {
  await client.query('ROLLBACK');
  throw e;
} finally {
  await client.end();
}
