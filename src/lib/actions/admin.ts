'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { appDb, transaction } from '@/lib/db';
import { config, OFFICE_TYPES, REGIONS, SERVICE_CATEGORIES, type ReviewStatus } from '@/lib/config';
import { requireAdmin } from '@/lib/admin-guard';
import { audit } from '@/lib/audit';
import { sha256 } from '@/lib/security';
import { normaliseForHash } from '@/lib/validation';
import { translateReview } from '@/lib/translation/pipeline';
import { sendEmail } from '@/lib/email';
import { EMAILS } from '@/lib/content/emails';
import { deleteEvidenceForEvent } from '@/lib/evidence';
import { isLocale, localizePath, LOCALES } from '@/lib/i18n';
import { ADMIN_ROLES } from '@/lib/rbac';
import type { ActionState } from './state';

const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();

async function notifyAuthor(reviewId: string, kind: 'published' | 'clarification' | 'decision') {
  const r = await appDb.query(
    `SELECT u.email, u.preferred_locale, o.slug FROM public.reviews r JOIN private.users u ON u.id = r.user_id
       JOIN public.offices o ON o.id = r.office_id WHERE r.id = $1`,
    [reviewId],
  );
  const row = r.rows[0];
  if (!row) return;
  const locale = isLocale(row.preferred_locale) ? row.preferred_locale : 'en';
  const link = kind === 'published'
    ? `${config.siteUrl}${localizePath(locale, `/offices/${row.slug}`)}#review-${reviewId}`
    : `${config.siteUrl}${localizePath(locale, '/account')}`;
  const tpl = EMAILS[kind][locale];
  await sendEmail({ to: row.email, subject: tpl.subject, text: tpl.text(link) }).catch((e) => console.error('notify failed', e.message));
}

// ------------------------------------------------------------------ reviews
const DECISIONS: Record<string, ReviewStatus> = {
  approve: 'approved',
  reject: 'rejected',
  clarify: 'needs_clarification',
  escalate: 'legal_review',
  hide: 'hidden',
  remove: 'removed',
  restore: 'pending',
};

export async function moderateReviewAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin('reviews');
  const reviewId = str(fd, 'reviewId');
  const decision = str(fd, 'decision');
  const reason = str(fd, 'reason').slice(0, 1000);
  const message = str(fd, 'message').slice(0, 2000) || null;
  const to = DECISIONS[decision];
  if (!to) return { error: 'Unknown decision' };
  if (decision !== 'approve' && decision !== 'restore' && reason.length < 3) return { error: 'A reason is required for this decision.' };
  if (decision === 'clarify' && !message) return { error: 'Write the message the author should see.' };

  const current = await appDb.query('SELECT status FROM public.reviews WHERE id = $1', [reviewId]);
  if (!current.rowCount) return { error: 'Review not found' };
  const from = current.rows[0].status as ReviewStatus;

  await transaction(async (c) => {
    await c.query(
      `UPDATE public.reviews SET status = $2::review_status, updated_at = now(),
         published_at = CASE WHEN $2::text = 'approved' THEN coalesce(published_at, now()) ELSE published_at END
       WHERE id = $1`,
      [reviewId, to],
    );
    await c.query(
      `INSERT INTO private.moderation_actions (review_id, actor_user_id, action, from_status, to_status, reason_code, note, message_to_author)
       VALUES ($1,$2,$3,$4::review_status,$5::review_status,$6,$7,$8)`,
      [reviewId, admin.id, decision, from, to, decision, reason || null, message],
    );
    const closes = ['approve', 'reject', 'remove'].includes(decision);
    await c.query(
      `UPDATE private.moderation_cases SET is_open = $2, priority = CASE WHEN $3::boolean THEN 'urgent' ELSE priority END, updated_at = now() WHERE review_id = $1`,
      [reviewId, !closes, decision === 'escalate'],
    );
    await audit(admin.id, `review.${decision}`, { type: 'review', id: reviewId }, { from, to, reason }, c);
  });

  if (to === 'approved') {
    await translateReview(reviewId).catch((e) => console.error('translation failed', e.message));
    await notifyAuthor(reviewId, 'published');
  } else if (to === 'needs_clarification') {
    await notifyAuthor(reviewId, 'clarification');
  } else if (['rejected', 'removed', 'hidden'].includes(to)) {
    await notifyAuthor(reviewId, 'decision');
  }
  revalidatePath('/admin/reviews');
  return { ok: true, message: `Review is now ${to}.` };
}

const REDACTION_MARK: Record<string, string> = { en: '[redacted]', es: '[oculto]', ko: '[가려짐]' };

export async function redactReviewAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin('reviews');
  const reviewId = str(fd, 'reviewId');
  const passage = String(fd.get('passage') ?? '');
  const reason = str(fd, 'reason');
  if (passage.trim().length < 2) return { error: 'Paste the exact passage to redact.' };
  if (reason.length < 3) return { error: 'A reason is required.' };
  const r = await appDb.query('SELECT title, body, original_language, status FROM public.reviews WHERE id = $1', [reviewId]);
  const review = r.rows[0];
  if (!review) return { error: 'Review not found' };
  const mark = REDACTION_MARK[review.original_language] ?? '[redacted]';
  const inBody = review.body.includes(passage);
  const inTitle = (review.title ?? '').includes(passage);
  if (!inBody && !inTitle) return { error: 'Passage not found in the current text (it must match exactly).' };
  const body = review.body.split(passage).join(mark);
  const title = review.title ? review.title.split(passage).join(mark) : null;

  await transaction(async (c) => {
    await c.query(
      `UPDATE public.reviews SET body = $2, title = $3, is_redacted = true, content_hash = $4, updated_at = now() WHERE id = $1`,
      [reviewId, body, title, sha256(normaliseForHash(`${title ?? ''}\n${body}`))],
    );
    await c.query(
      `INSERT INTO private.review_revisions (review_id, kind, title, body, actor_user_id, note) VALUES ($1,'redaction',$2,$3,$4,$5)`,
      [reviewId, title, body, admin.id, reason],
    );
    await c.query(
      `INSERT INTO private.moderation_actions (review_id, actor_user_id, action, from_status, to_status, note) VALUES ($1,$2,'redact',$3::review_status,$3::review_status,$4)`,
      [reviewId, admin.id, review.status, reason],
    );
    await audit(admin.id, 'review.redacted', { type: 'review', id: reviewId }, { reason, length: passage.length }, c);
  });
  if (review.status === 'approved') await translateReview(reviewId).catch(() => {});
  revalidatePath(`/admin/reviews/${reviewId}`);
  return { ok: true, message: 'Passage redacted. The original remains in the private history.' };
}

// ------------------------------------------------------------------ verification
export async function decideVerificationAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin('verifications');
  const eventId = str(fd, 'eventId');
  const decision = str(fd, 'decision');
  const reason = str(fd, 'reason').slice(0, 1000);
  if (!['approve', 'reject'].includes(decision)) return { error: 'Unknown decision' };
  if (decision === 'reject' && reason.length < 3) return { error: 'A reason is required to reject.' };
  const ev = await appDb.query(`SELECT review_id, status FROM private.verification_events WHERE id = $1`, [eventId]);
  if (!ev.rowCount) return { error: 'Not found' };
  if (ev.rows[0].status !== 'submitted') return { error: 'This request was already decided.' };
  const retention = new Date(Date.now() + config.verification.retentionDays * 86400000);
  await transaction(async (c) => {
    await c.query(
      `UPDATE private.verification_events SET status = $2, decision_reason = $3, decided_by = $4, decided_at = now(), retention_until = $5 WHERE id = $1`,
      [eventId, decision === 'approve' ? 'approved' : 'rejected', reason || null, admin.id, retention],
    );
    await c.query(`UPDATE public.reviews SET verification = $2 WHERE id = $1`, [ev.rows[0].review_id, decision === 'approve' ? 'verified' : 'unverified']);
    await audit(admin.id, `verification.${decision}`, { type: 'verification', id: eventId }, { reason }, c);
  });
  revalidatePath('/admin/verifications');
  return { ok: true, message: decision === 'approve' ? 'Marked as verified visit.' : 'Verification rejected.' };
}

export async function adminDeleteEvidenceAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin('verifications');
  const n = await deleteEvidenceForEvent(str(fd, 'eventId'), admin.id, 'admin_request');
  revalidatePath(`/admin/verifications/${str(fd, 'eventId')}`);
  return { ok: true, message: `${n} file(s) deleted.` };
}

// ------------------------------------------------------------------ offices
const officeSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(80),
  type: z.enum(OFFICE_TYPES),
  nameKo: z.string().trim().min(2).max(120),
  nameEn: z.string().trim().min(2).max(160),
  nameEs: z.string().trim().min(2).max(160),
  cityKey: z.string().trim().regex(/^[a-z-]+$/).max(40),
  regionKey: z.enum(REGIONS),
  addressKo: z.string().trim().max(300).optional(),
  addressEn: z.string().trim().max(300).optional(),
  addressEs: z.string().trim().max(300).optional(),
  latitude: z.coerce.number().min(33).max(39).optional(),
  longitude: z.coerce.number().min(124).max(132).optional(),
  precision: z.enum(['exact', 'approximate_city', 'unknown']),
  phone: z.string().trim().max(40).optional(),
  websiteUrl: z.string().trim().url().max(300).optional(),
  appointmentInfoUrl: z.string().trim().url().max(300).optional(),
  dataSource: z.string().trim().max(1000).optional(),
  services: z.array(z.enum(SERVICE_CATEGORIES)),
});

export async function saveOfficeAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin('offices');
  const id = str(fd, 'id') || null;
  const opt = (k: string) => str(fd, k) || undefined;
  const parsed = officeSchema.safeParse({
    slug: str(fd, 'slug'), type: str(fd, 'type'), nameKo: str(fd, 'nameKo'), nameEn: str(fd, 'nameEn'), nameEs: str(fd, 'nameEs'),
    cityKey: str(fd, 'cityKey'), regionKey: str(fd, 'regionKey'), addressKo: opt('addressKo'), addressEn: opt('addressEn'), addressEs: opt('addressEs'),
    latitude: opt('latitude'), longitude: opt('longitude'), precision: str(fd, 'precision'), phone: opt('phone'),
    websiteUrl: opt('websiteUrl'), appointmentInfoUrl: opt('appointmentInfoUrl'), dataSource: opt('dataSource'),
    services: fd.getAll('services').map(String),
  });
  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const i of parsed.error.issues) fe[String(i.path[0])] = i.message;
    return { error: 'Please check the highlighted fields.', fieldErrors: fe };
  }
  const o = parsed.data;
  if ((o.latitude === undefined) !== (o.longitude === undefined)) return { error: 'Provide both latitude and longitude, or neither.' };
  try {
    const officeId = await transaction(async (c) => {
      const values = [o.slug, o.type, o.nameKo, o.cityKey, o.regionKey, o.addressKo ?? null, o.latitude ?? null, o.longitude ?? null,
        o.latitude === undefined ? 'unknown' : o.precision, o.phone ?? null, o.websiteUrl ?? null, o.appointmentInfoUrl ?? null, o.services, o.dataSource ?? null];
      let oid = id;
      if (oid) {
        const before = await c.query('SELECT * FROM public.offices WHERE id = $1', [oid]);
        await c.query(
          `UPDATE public.offices SET slug=$2, office_type=$3, official_name_ko=$4, city_key=$5, region_key=$6, address_ko=$7, latitude=$8,
             longitude=$9, location_precision=$10, phone=$11, website_url=$12, appointment_info_url=$13, services=$14, data_source=$15, updated_at=now()
           WHERE id=$1`,
          [oid, ...values],
        );
        await c.query(`INSERT INTO private.office_updates (office_id, actor_user_id, change_type, changes) VALUES ($1,$2,'edit',$3)`,
          [oid, admin.id, JSON.stringify({ before: before.rows[0], after: o })]);
      } else {
        const r = await c.query(
          `INSERT INTO public.offices (slug, office_type, official_name_ko, city_key, region_key, address_ko, latitude, longitude,
             location_precision, phone, website_url, appointment_info_url, services, data_source)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id`,
          values,
        );
        oid = r.rows[0].id as string;
        await c.query(`INSERT INTO private.office_updates (office_id, actor_user_id, change_type, changes) VALUES ($1,$2,'create',$3)`,
          [oid, admin.id, JSON.stringify(o)]);
      }
      const names = { ko: o.nameKo, en: o.nameEn, es: o.nameEs } as Record<string, string>;
      const addresses = { ko: o.addressKo, en: o.addressEn, es: o.addressEs } as Record<string, string | undefined>;
      for (const l of LOCALES) {
        await c.query(
          `INSERT INTO public.office_translations (office_id, locale, name, address) VALUES ($1,$2,$3,$4)
           ON CONFLICT (office_id, locale) DO UPDATE SET name = EXCLUDED.name, address = EXCLUDED.address, updated_at = now()`,
          [oid, l, names[l], addresses[l] ?? null],
        );
      }
      await audit(admin.id, id ? 'office.updated' : 'office.created', { type: 'office', id: oid! }, { slug: o.slug }, c);
      return oid!;
    });
    revalidatePath('/admin/offices');
    if (!id) redirect(`/admin/offices/${officeId}?created=1`);
    return { ok: true, message: 'Office saved.' };
  } catch (e) {
    if ((e as { code?: string }).code === '23505') return { error: 'That slug is already used.', fieldErrors: { slug: 'Already used' } };
    throw e;
  }
}

export async function officeStatusAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin('offices');
  const id = str(fd, 'id');
  const op = str(fd, 'op');
  const sql: Record<string, string> = {
    verify: `UPDATE public.offices SET data_status = 'verified', last_verified_at = current_date, updated_at = now() WHERE id = $1`,
    outdated: `UPDATE public.offices SET data_status = 'outdated', updated_at = now() WHERE id = $1`,
    archive: `UPDATE public.offices SET is_active = false, archived_at = now(), updated_at = now() WHERE id = $1`,
    unarchive: `UPDATE public.offices SET is_active = true, archived_at = NULL, updated_at = now() WHERE id = $1`,
  };
  if (!sql[op]) return { error: 'Unknown operation' };
  if (op === 'verify') {
    const src = await appDb.query(`SELECT 1 FROM public.office_sources WHERE office_id = $1 AND source_type = 'official' AND accessed_at IS NOT NULL`, [id]);
    if (!src.rowCount) return { error: 'Add an official source with an access date before marking the record as verified.' };
  }
  await appDb.query(sql[op], [id]);
  await appDb.query(`INSERT INTO private.office_updates (office_id, actor_user_id, change_type) VALUES ($1,$2,$3)`, [id, admin.id, op]);
  await audit(admin.id, `office.${op}`, { type: 'office', id });
  revalidatePath(`/admin/offices/${id}`);
  return { ok: true, message: 'Updated.' };
}

export async function addOfficeSourceAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin('offices');
  const parsed = z.object({
    officeId: z.string().uuid(), title: z.string().trim().min(3).max(200), url: z.string().trim().url().max(500),
    sourceType: z.enum(['official', 'other']), accessedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), notes: z.string().max(1000).optional(),
  }).safeParse({ officeId: str(fd, 'officeId'), title: str(fd, 'title'), url: str(fd, 'url'), sourceType: str(fd, 'sourceType'), accessedAt: str(fd, 'accessedAt'), notes: str(fd, 'notes') || undefined });
  if (!parsed.success) return { error: 'Provide a title, a valid URL and the date you accessed it.' };
  const s = parsed.data;
  await appDb.query(`INSERT INTO public.office_sources (office_id, title, url, source_type, accessed_at, notes) VALUES ($1,$2,$3,$4,$5,$6)`,
    [s.officeId, s.title, s.url, s.sourceType, s.accessedAt, s.notes ?? null]);
  await audit(admin.id, 'office.source_added', { type: 'office', id: s.officeId }, { url: s.url });
  revalidatePath(`/admin/offices/${s.officeId}`);
  return { ok: true, message: 'Source added.' };
}

export async function deleteOfficeSourceAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin('offices');
  const r = await appDb.query('DELETE FROM public.office_sources WHERE id = $1 RETURNING office_id', [str(fd, 'sourceId')]);
  if (r.rows[0]) {
    await audit(admin.id, 'office.source_removed', { type: 'office', id: r.rows[0].office_id });
    revalidatePath(`/admin/offices/${r.rows[0].office_id}`);
  }
  return { ok: true };
}

// ------------------------------------------------------------------ translations
export async function correctTranslationAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin('translations');
  const id = str(fd, 'translationId');
  const body = String(fd.get('body') ?? '').trim();
  const title = str(fd, 'title') || null;
  if (body.length < 10) return { error: 'Translation text is required.' };
  await appDb.query(
    `UPDATE public.review_translations SET translated_body = $2, translated_title = $3, status = 'approved_manual',
       reviewed_by = $4, reviewed_at = now(),
       engine = CASE WHEN engine LIKE '%+human' THEN engine ELSE engine || '+human' END
     WHERE id = $1`,
    [id, body, title, admin.id],
  );
  await appDb.query(`UPDATE private.translation_reports SET status = 'resolved' WHERE translation_id = $1`, [id]);
  await audit(admin.id, 'translation.corrected', { type: 'translation', id });
  revalidatePath('/admin/translations');
  return { ok: true, message: 'Translation saved and approved.' };
}

export async function approveTranslationAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin('translations');
  const id = str(fd, 'translationId');
  await appDb.query(`UPDATE public.review_translations SET status = 'completed', reviewed_by = $2, reviewed_at = now() WHERE id = $1 AND status = 'needs_human_review'`, [id, admin.id]);
  await audit(admin.id, 'translation.approved', { type: 'translation', id });
  revalidatePath('/admin/translations');
  return { ok: true, message: 'Approved.' };
}

export async function reprocessTranslationAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin('translations');
  const reviewId = str(fd, 'reviewId');
  await translateReview(reviewId, { force: true });
  await audit(admin.id, 'translation.reprocessed', { type: 'review', id: reviewId });
  revalidatePath('/admin/translations');
  return { ok: true, message: 'Reprocessed.' };
}

// ------------------------------------------------------------------ reports, appeals, legal
export async function resolveReportAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin('reports');
  const id = str(fd, 'reportId');
  const status = str(fd, 'status') === 'actioned' ? 'actioned' : 'dismissed';
  const note = str(fd, 'note');
  if (note.length < 3) return { error: 'Record a resolution note.' };
  await appDb.query(`UPDATE private.review_reports SET status = $2, resolution_note = $3, handled_by = $4, handled_at = now() WHERE id = $1`, [id, status, note, admin.id]);
  await audit(admin.id, `report.${status}`, { type: 'report', id }, { note });
  revalidatePath('/admin/reports');
  return { ok: true, message: 'Report updated.' };
}

export async function decideAppealAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin('reports');
  const id = str(fd, 'appealId');
  const status = str(fd, 'status') === 'overturned' ? 'overturned' : 'upheld';
  const note = str(fd, 'note');
  if (note.length < 3) return { error: 'Record the reasoning for this decision.' };
  await appDb.query(`UPDATE private.appeals SET status = $2, decision_note = $3, decided_by = $4, decided_at = now() WHERE id = $1`, [id, status, note, admin.id]);
  await audit(admin.id, `appeal.${status}`, { type: 'appeal', id }, { note });
  revalidatePath('/admin/reports');
  return { ok: true, message: 'Appeal decided. If overturned, apply the change to the review from its moderation page.' };
}

export async function updateLegalRequestAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin('legal');
  const id = str(fd, 'requestId');
  const status = str(fd, 'status');
  if (!['open', 'in_review', 'resolved', 'declined'].includes(status)) return { error: 'Unknown status' };
  const deadline = str(fd, 'deadline');
  await appDb.query(
    `UPDATE private.legal_requests SET status = $2::text, resolution_note = coalesce(nullif($3,''), resolution_note), handled_by = $4,
       deadline_at = coalesce(nullif($5,'')::timestamptz, deadline_at),
       resolved_at = CASE WHEN $2::text IN ('resolved','declined') THEN now() ELSE NULL END WHERE id = $1`,
    [id, status, str(fd, 'note'), admin.id, deadline],
  );
  await audit(admin.id, 'legal_request.updated', { type: 'legal_request', id }, { status });
  revalidatePath('/admin/reports');
  return { ok: true, message: 'Request updated.' };
}

export async function publishResponseAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin('legal');
  const parsed = z.object({
    reviewId: z.string().uuid(), organization: z.string().trim().min(2).max(160), body: z.string().trim().min(20).max(3000), language: z.enum(['en', 'es', 'ko']),
  }).safeParse({ reviewId: str(fd, 'reviewId'), organization: str(fd, 'organization'), body: str(fd, 'body'), language: str(fd, 'language') });
  if (!parsed.success) return { error: 'Review, organization, language and a response of at least 20 characters are required.' };
  const p = parsed.data;
  await appDb.query(`INSERT INTO public.review_responses (review_id, organization_name, body, language) VALUES ($1,$2,$3,$4)`, [p.reviewId, p.organization, p.body, p.language]);
  await audit(admin.id, 'review.response_published', { type: 'review', id: p.reviewId }, { organization: p.organization });
  return { ok: true, message: 'Response published under the review.' };
}

// ------------------------------------------------------------------ team
export async function grantRoleAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin('team');
  const email = str(fd, 'email').toLowerCase();
  const role = str(fd, 'role');
  if (!(ADMIN_ROLES as readonly string[]).includes(role)) return { error: 'Unknown role' };
  const u = await appDb.query('SELECT id FROM private.users WHERE email = $1', [email]);
  if (!u.rowCount) return { error: 'No account with that email. The person must sign up first.' };
  await appDb.query(`INSERT INTO private.admin_users (user_id, role, granted_by) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`, [u.rows[0].id, role, admin.id]);
  await audit(admin.id, 'role.granted', { type: 'user', id: u.rows[0].id }, { role });
  revalidatePath('/admin/team');
  return { ok: true, message: 'Role granted.' };
}

export async function revokeRoleAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin('team');
  const userId = str(fd, 'userId');
  const role = str(fd, 'role');
  if (userId === admin.id && role === 'super_admin') return { error: 'You cannot remove your own super administrator role.' };
  await appDb.query('DELETE FROM private.admin_users WHERE user_id = $1 AND role = $2', [userId, role]);
  await audit(admin.id, 'role.revoked', { type: 'user', id: userId }, { role });
  revalidatePath('/admin/team');
  return { ok: true, message: 'Role revoked.' };
}
