'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { appDb, transaction } from '@/lib/db';
import { RATING_DIMENSIONS, REPORT_REASONS } from '@/lib/config';
import { getCurrentUser } from '@/lib/auth/session';
import { rateLimit } from '@/lib/rate-limit';
import { clientIpHash, referenceCode, sha256 } from '@/lib/security';
import { audit } from '@/lib/audit';
import { detectAbuseSignals } from '@/lib/abuse';
import { priorityFor, screenText } from '@/lib/screening';
import { reviewScore } from '@/lib/rating';
import { normaliseForHash, reviewInputFromForm, reviewSchema, BODY_MAX, BODY_MIN } from '@/lib/validation';
import { fmt, getDictionary, isLocale, type Locale } from '@/lib/i18n';
import type { ActionState } from './state';

function localeOf(fd: FormData): Locale {
  const l = String(fd.get('locale') ?? '');
  return isLocale(l) ? l : 'en';
}

function fieldErrorsFor(issues: z.ZodIssue[], t: ReturnType<typeof getDictionary>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of issues) {
    const key = i.path[0] === 'ratings' ? `rating_${String(i.path[1])}` : String(i.path[0]);
    if (out[key]) continue;
    if (key === 'body') out[key] = i.code === 'too_big' ? fmt(t.validation.tooLong, { max: BODY_MAX }) : fmt(t.validation.tooShort, { min: BODY_MIN });
    else if (key === 'title') out[key] = fmt(t.validation.tooLong, { max: 120 });
    else if (key === 'visitMonth') out[key] = t.validation.month;
    else if (key === 'officeId') out[key] = t.validation.office;
    else if (key.startsWith('rating_')) out[key] = t.validation.rating;
    else out[key] = t.validation.required;
  }
  return out;
}

export async function submitReviewAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const locale = localeOf(fd);
  const t = getDictionary(locale);
  const user = await getCurrentUser();
  if (!user) return { error: t.write.signInRequired };
  if (!user.emailVerified) return { error: t.write.emailVerificationRequired };
  if (!(await rateLimit('review-submit-user', 5, 86400, user.id)) || !(await rateLimit('review-submit-ip', 10, 86400))) {
    return { error: t.errors.rateLimited };
  }
  if (fd.get('agree') !== 'on') return { error: t.errors.validation, fieldErrors: { agree: t.validation.confirm } };

  const parsed = reviewSchema.safeParse(reviewInputFromForm(fd));
  if (!parsed.success) return { error: t.errors.validation, fieldErrors: fieldErrorsFor(parsed.error.issues, t) };
  const input = parsed.data;

  const office = await appDb.query(`SELECT id FROM public.offices WHERE id = $1 AND is_active AND archived_at IS NULL`, [input.officeId]);
  if (!office.rowCount) return { error: t.validation.office, fieldErrors: { officeId: t.validation.office } };

  const overall = reviewScore(input.ratings);
  const flags = screenText(`${input.title ?? ''}\n${input.body}`);
  const ipHash = await clientIpHash();
  const signals = await detectAbuseSignals({ userId: user.id, officeId: input.officeId, body: input.body, ipHash, accountCreatedAt: user.createdAt });
  const priority = priorityFor(flags, signals);
  const hash = sha256(normaliseForHash(`${input.title ?? ''}\n${input.body}`));

  try {
    const reviewId = await transaction(async (c) => {
      const r = await c.query(
        `INSERT INTO public.reviews (office_id, user_id, service_category, visit_month, used_appointment, received_service,
           original_language, title, body, overall_score, content_hash)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
        [input.officeId, user.id, input.service, `${input.visitMonth}-01`, input.usedAppointment, input.receivedService,
          input.language, input.title, input.body, overall.toFixed(2), hash],
      );
      const id = r.rows[0].id as string;
      for (const d of RATING_DIMENSIONS) {
        await c.query('INSERT INTO public.review_ratings (review_id, dimension, score) VALUES ($1,$2,$3)', [id, d, input.ratings[d]]);
      }
      await c.query(
        `INSERT INTO private.review_revisions (review_id, kind, title, body, actor_user_id) VALUES ($1,'submission',$2,$3,$4)`,
        [id, input.title, input.body, user.id],
      );
      await c.query(
        `INSERT INTO private.moderation_cases (review_id, priority, screening_flags, abuse_signals, submission_ip_hash)
         VALUES ($1,$2,$3,$4,$5)`,
        [id, priority, JSON.stringify(flags), JSON.stringify(signals), ipHash],
      );
      await audit(user.id, 'review.submitted', { type: 'review', id }, { priority, flags: flags.length, signals: signals.length }, c);
      return id;
    });
    revalidatePath(`/${locale}/account`);
    return { ok: true, data: { reviewId, wantsVerification: fd.get('wantsVerification') === 'yes' } };
  } catch (e) {
    if ((e as { code?: string }).code === '23505') return { error: t.write.duplicate };
    console.error('submitReview failed', e);
    return { error: t.errors.server };
  }
}

export async function editReviewAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const locale = localeOf(fd);
  const t = getDictionary(locale);
  const user = await getCurrentUser();
  if (!user) return { error: t.errors.unauthorized };
  if (!(await rateLimit('review-edit', 10, 3600, user.id))) return { error: t.errors.rateLimited };
  const reviewId = String(fd.get('reviewId') ?? '');
  const current = await appDb.query(
    `SELECT id, status, office_id FROM public.reviews WHERE id = $1 AND user_id = $2`,
    [reviewId, user.id],
  );
  const review = current.rows[0];
  // controlled editing: not while under legal review or after removal/rejection (use an appeal instead)
  if (!review || !['pending', 'needs_clarification', 'approved'].includes(review.status)) return { error: t.errors.forbidden };

  const parsed = reviewSchema.safeParse({ ...reviewInputFromForm(fd), officeId: review.office_id });
  if (!parsed.success) return { error: t.errors.validation, fieldErrors: fieldErrorsFor(parsed.error.issues, t) };
  const input = parsed.data;
  const flags = screenText(`${input.title ?? ''}\n${input.body}`);
  const ipHash = await clientIpHash();
  const signals = await detectAbuseSignals({ userId: user.id, officeId: review.office_id, body: input.body, ipHash, accountCreatedAt: user.createdAt, excludeReviewId: reviewId });

  try {
    await transaction(async (c) => {
      await c.query(
        `UPDATE public.reviews SET service_category = $2, visit_month = $3, used_appointment = $4, received_service = $5,
           original_language = $6, title = $7, body = $8, overall_score = $9, content_hash = $10, status = 'pending',
           is_redacted = false, edited_at = now(), updated_at = now()
         WHERE id = $1`,
        [reviewId, input.service, `${input.visitMonth}-01`, input.usedAppointment, input.receivedService, input.language,
          input.title, input.body, reviewScore(input.ratings).toFixed(2), sha256(normaliseForHash(`${input.title ?? ''}\n${input.body}`))],
      );
      for (const d of RATING_DIMENSIONS) {
        await c.query('UPDATE public.review_ratings SET score = $3 WHERE review_id = $1 AND dimension = $2', [reviewId, d, input.ratings[d]]);
      }
      await c.query(`INSERT INTO private.review_revisions (review_id, kind, title, body, actor_user_id) VALUES ($1,'author_edit',$2,$3,$4)`,
        [reviewId, input.title, input.body, user.id]);
      await c.query(
        `UPDATE private.moderation_cases SET is_open = true, screening_flags = $2, abuse_signals = $3, priority = $4, updated_at = now()
          WHERE review_id = $1`,
        [reviewId, JSON.stringify(flags), JSON.stringify(signals), priorityFor(flags, signals)],
      );
      await c.query(
        `INSERT INTO private.moderation_actions (review_id, actor_user_id, action, from_status, to_status, note)
         VALUES ($1,$2,'author_edit',$3,'pending','Edited by author')`,
        [reviewId, user.id, review.status],
      );
      await audit(user.id, 'review.edited', { type: 'review', id: reviewId }, {}, c);
    });
  } catch (e) {
    if ((e as { code?: string }).code === '23505') return { error: t.write.duplicate };
    throw e;
  }
  revalidatePath(`/${locale}/account`);
  return { ok: true, message: t.account.editNote };
}

const reportSchema = z.object({
  reviewId: z.string().uuid(),
  reason: z.enum(REPORT_REASONS),
  details: z.string().trim().max(1000).optional(),
});

export async function reportReviewAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const locale = localeOf(fd);
  const t = getDictionary(locale);
  if (!(await rateLimit('report', 10, 3600))) return { error: t.errors.rateLimited };
  const parsed = reportSchema.safeParse({ reviewId: fd.get('reviewId'), reason: fd.get('reason'), details: fd.get('details') || undefined });
  if (!parsed.success) return { error: t.errors.validation, fieldErrors: { reason: t.validation.required } };
  const user = await getCurrentUser();
  const exists = await appDb.query(`SELECT 1 FROM public.reviews WHERE id = $1 AND status = 'approved'`, [parsed.data.reviewId]);
  if (!exists.rowCount) return { error: t.errors.server };
  const code = referenceCode('RPT');
  await appDb.query(
    `INSERT INTO private.review_reports (reference_code, review_id, reporter_user_id, reporter_ip_hash, reason, details)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [code, parsed.data.reviewId, user?.id ?? null, await clientIpHash(), parsed.data.reason, parsed.data.details ?? null],
  );
  // urgent categories raise the review's moderation priority — they never auto-remove it
  if (['threats', 'personal_info'].includes(parsed.data.reason)) {
    await appDb.query(`UPDATE private.moderation_cases SET priority = 'urgent', updated_at = now() WHERE review_id = $1`, [parsed.data.reviewId]);
  }
  await audit(user?.id ?? null, 'report.created', { type: 'review', id: parsed.data.reviewId }, { reason: parsed.data.reason, code });
  return { ok: true, message: t.report.received, data: { code } };
}

export async function reportTranslationAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const locale = localeOf(fd);
  const t = getDictionary(locale);
  if (!(await rateLimit('translation-report', 10, 3600))) return { error: t.errors.rateLimited };
  const id = z.string().uuid().safeParse(fd.get('translationId'));
  if (!id.success) return { error: t.errors.validation };
  const user = await getCurrentUser();
  await appDb.query(`INSERT INTO private.translation_reports (translation_id, user_id, note) VALUES ($1,$2,$3)`,
    [id.data, user?.id ?? null, String(fd.get('note') ?? '').slice(0, 1000) || null]);
  return { ok: true, message: t.reviews.translationReported };
}
