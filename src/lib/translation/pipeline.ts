import 'server-only';
import { appDb } from '@/lib/db';
import { LOCALES } from '@/lib/i18n/config';
import { getTranslationProvider } from './providers';

/**
 * (Re)generate machine translations for a review into every other locale.
 * The original text is never modified. Reviews that went through legal
 * review or carry serious screening flags get status `needs_human_review`
 * and are not shown until a person approves the translation.
 */
export async function translateReview(reviewId: string, opts: { force?: boolean } = {}): Promise<void> {
  const r = await appDb.query(
    `SELECT r.id, r.title, r.body, r.original_language, r.content_hash,
            coalesce(mc.screening_flags, '[]'::jsonb) AS flags,
            EXISTS (SELECT 1 FROM private.moderation_actions a WHERE a.review_id = r.id AND a.to_status = 'legal_review') AS was_legal
       FROM public.reviews r LEFT JOIN private.moderation_cases mc ON mc.review_id = r.id
      WHERE r.id = $1`,
    [reviewId],
  );
  const review = r.rows[0];
  if (!review) return;
  const sensitive =
    review.was_legal ||
    (review.flags as { type: string }[]).some((f) => ['criminal_allegation', 'threat', 'hate'].includes(f.type));
  const provider = getTranslationProvider();

  for (const target of LOCALES) {
    if (target === review.original_language) continue;
    const existing = await appDb.query(
      'SELECT source_hash, status FROM public.review_translations WHERE review_id = $1 AND target_language = $2',
      [reviewId, target],
    );
    const ex = existing.rows[0];
    if (!opts.force && ex && ex.source_hash === review.content_hash && ['completed', 'approved_manual', 'needs_human_review'].includes(ex.status)) continue;

    const result = await provider.translate({ texts: [review.title ?? '', review.body], source: review.original_language, target });
    const status = result.ok ? (sensitive ? 'needs_human_review' : 'completed') : result.status;
    await appDb.query(
      `INSERT INTO public.review_translations (review_id, source_language, target_language, translated_title, translated_body,
         engine, status, source_hash, error, translated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7::translation_status,$8,$9, CASE WHEN $10 THEN now() END)
       ON CONFLICT (review_id, target_language) DO UPDATE SET
         translated_title = EXCLUDED.translated_title, translated_body = EXCLUDED.translated_body, engine = EXCLUDED.engine,
         status = EXCLUDED.status, source_hash = EXCLUDED.source_hash, error = EXCLUDED.error,
         translated_at = EXCLUDED.translated_at, reviewed_by = NULL, reviewed_at = NULL`,
      [reviewId, review.original_language, target,
        result.ok ? result.texts[0] || null : null, result.ok ? result.texts[1] : null,
        provider.name, status, review.content_hash, result.ok ? null : result.error, result.ok],
    );
  }
}
