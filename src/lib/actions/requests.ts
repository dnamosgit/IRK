'use server';
import { z } from 'zod';
import { appDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';
import { rateLimit } from '@/lib/rate-limit';
import { referenceCode } from '@/lib/security';
import { audit } from '@/lib/audit';
import { fmt, getDictionary, isLocale, type Locale } from '@/lib/i18n';
import type { ActionState } from './state';

function localeOf(fd: FormData): Locale {
  const l = String(fd.get('locale') ?? '');
  return isLocale(l) ? l : 'en';
}

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
/** Accept a review id or any URL containing one (e.g. a #review-<id> anchor). */
function extractReviewId(value: FormDataEntryValue | null): string | null {
  return typeof value === 'string' ? (UUID_RE.exec(value)?.[0] ?? null) : null;
}

export async function submitAppealAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const locale = localeOf(fd);
  const t = getDictionary(locale);
  if (!(await rateLimit('appeal', 5, 86400))) return { error: t.errors.rateLimited };
  const user = await getCurrentUser();
  const schema = z.object({
    type: z.enum(['moderation_decision', 'report_outcome', 'verification_decision']),
    message: z.string().trim().min(20).max(3000),
    email: user ? z.string().optional() : z.string().trim().email().max(254),
    reference: z.string().trim().max(40).optional(),
  });
  const parsed = schema.safeParse({
    type: fd.get('type'), message: fd.get('message'), email: fd.get('email') || undefined, reference: fd.get('reference') || undefined,
  });
  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const i of parsed.error.issues) fe[String(i.path[0])] = i.path[0] === 'message' ? fmt(t.validation.tooShort, { min: 20 }) : i.path[0] === 'email' ? t.validation.email : t.validation.required;
    return { error: t.errors.validation, fieldErrors: fe };
  }
  let reviewId = extractReviewId(fd.get('reviewId'));
  if (reviewId && user) {
    const own = await appDb.query('SELECT 1 FROM public.reviews WHERE id = $1 AND user_id = $2', [reviewId, user.id]);
    if (!own.rowCount && parsed.data.type === 'moderation_decision') reviewId = null;
  }
  const code = referenceCode('APL');
  await appDb.query(
    `INSERT INTO private.appeals (reference_code, user_id, contact_email, appeal_type, review_id, related_reference, message)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [code, user?.id ?? null, user ? null : parsed.data.email, parsed.data.type, reviewId, parsed.data.reference ?? null, parsed.data.message],
  );
  await audit(user?.id ?? null, 'appeal.created', { type: 'appeal', id: code });
  return { ok: true, message: t.appeal.received, data: { code } };
}

export async function submitLegalRequestAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const locale = localeOf(fd);
  const t = getDictionary(locale);
  if (!(await rateLimit('legal-request', 5, 86400))) return { error: t.errors.rateLimited };
  const schema = z.object({
    kind: z.enum(['takedown', 'right_of_reply', 'legal_notice', 'other']),
    name: z.string().trim().min(2).max(120),
    organization: z.string().trim().max(160).optional(),
    email: z.string().trim().email().max(254),
    basis: z.string().trim().max(1000).optional(),
    message: z.string().trim().min(20).max(5000),
  });
  const parsed = schema.safeParse({
    kind: fd.get('kind'), name: fd.get('name'), organization: fd.get('organization') || undefined,
    email: fd.get('email'), basis: fd.get('basis') || undefined, message: fd.get('message'),
  });
  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const i of parsed.error.issues) fe[String(i.path[0])] = i.path[0] === 'email' ? t.validation.email : i.path[0] === 'message' ? fmt(t.validation.tooShort, { min: 20 }) : t.validation.required;
    return { error: t.errors.validation, fieldErrors: fe };
  }
  const code = referenceCode('LGL');
  // Default internal response deadline: 14 days (adjust per legal advice; PENDING LEGAL APPROVAL)
  await appDb.query(
    `INSERT INTO private.legal_requests (reference_code, kind, review_id, requester_name, requester_organization, requester_email, legal_basis, message, deadline_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8, now() + interval '14 days')`,
    [code, parsed.data.kind, extractReviewId(fd.get('reviewRef')), parsed.data.name, parsed.data.organization ?? null,
      parsed.data.email, parsed.data.basis ?? null, parsed.data.message],
  );
  await audit(null, 'legal_request.created', { type: 'legal_request', id: code }, { kind: parsed.data.kind });
  return { ok: true, message: t.legalRequest.received, data: { code } };
}

export async function submitContactAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const locale = localeOf(fd);
  const t = getDictionary(locale);
  if (!(await rateLimit('contact', 5, 3600))) return { error: t.errors.rateLimited };
  const schema = z.object({
    kind: z.enum(['contact', 'problem', 'deletion_request']),
    email: z.string().trim().email().max(254).optional(),
    message: z.string().trim().min(10).max(3000),
    pageUrl: z.string().trim().max(500).optional(),
  });
  const parsed = schema.safeParse({
    kind: fd.get('kind'), email: fd.get('email') || undefined, message: fd.get('message'), pageUrl: fd.get('pageUrl') || undefined,
  });
  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const i of parsed.error.issues) fe[String(i.path[0])] = i.path[0] === 'email' ? t.validation.email : i.path[0] === 'message' ? fmt(t.validation.tooShort, { min: 10 }) : t.validation.required;
    return { error: t.errors.validation, fieldErrors: fe };
  }
  const code = referenceCode('MSG');
  await appDb.query(
    `INSERT INTO private.contact_messages (reference_code, kind, email, message, page_url) VALUES ($1,$2,$3,$4,$5)`,
    [code, parsed.data.kind, parsed.data.email ?? null, parsed.data.message, parsed.data.pageUrl ?? null],
  );
  return { ok: true, message: t.contact.received, data: { code } };
}
