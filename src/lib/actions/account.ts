'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { appDb, transaction } from '@/lib/db';
import { getCurrentUser, destroyAllSessions, destroySession } from '@/lib/auth/session';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { randomPseudonym } from '@/lib/auth/pseudonym';
import { rateLimit } from '@/lib/rate-limit';
import { audit } from '@/lib/audit';
import { getDictionary, isLocale, localizePath, type Locale } from '@/lib/i18n';
import { deleteEvidenceForEvent } from '@/lib/evidence';
import type { ActionState } from './state';

function localeOf(fd: FormData): Locale {
  const l = String(fd.get('locale') ?? '');
  return isLocale(l) ? l : 'en';
}

const displayNameSchema = z.string().trim().min(3).max(40).regex(/^[\p{L}\p{N} ._-]+$/u);

export async function updateDisplayNameAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const locale = localeOf(fd);
  const t = getDictionary(locale);
  const user = await getCurrentUser();
  if (!user) return { error: t.errors.unauthorized };
  if (!(await rateLimit('display-name', 10, 3600, user.id))) return { error: t.errors.rateLimited };
  const regenerate = fd.get('regenerate') === '1';
  const parsed = regenerate ? { success: true as const, data: randomPseudonym() } : displayNameSchema.safeParse(fd.get('displayName'));
  if (!parsed.success) return { error: t.errors.validation, fieldErrors: { displayName: t.account.displayNameHint } };
  try {
    await appDb.query(`UPDATE public.user_profiles SET display_name = $2, display_name_generated = $3 WHERE user_id = $1`, [user.id, parsed.data, regenerate]);
  } catch (e) {
    if ((e as { code?: string }).code === '23505') return { error: t.account.nameTaken, fieldErrors: { displayName: t.account.nameTaken } };
    throw e;
  }
  revalidatePath(`/${locale}/account`);
  return { ok: true, message: t.common.saved };
}

export async function changePasswordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const locale = localeOf(fd);
  const t = getDictionary(locale);
  const user = await getCurrentUser();
  if (!user) return { error: t.errors.unauthorized };
  if (!(await rateLimit('change-password', 5, 3600, user.id))) return { error: t.errors.rateLimited };
  const current = String(fd.get('current') ?? '');
  const next = String(fd.get('password') ?? '');
  if (next.length < 10 || next.length > 200) return { error: t.errors.validation, fieldErrors: { password: t.validation.passwordLength } };
  const r = await appDb.query('SELECT password_hash FROM private.users WHERE id = $1', [user.id]);
  if (!(await verifyPassword(current, r.rows[0].password_hash))) return { error: t.auth.invalidCredentials, fieldErrors: { current: t.auth.invalidCredentials } };
  await appDb.query('UPDATE private.users SET password_hash = $2 WHERE id = $1', [user.id, await hashPassword(next)]);
  await destroyAllSessions(user.id, true);
  await audit(user.id, 'account.password_changed', { type: 'user', id: user.id });
  return { ok: true, message: t.account.passwordChanged };
}

export async function deleteAccountAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const locale = localeOf(fd);
  const t = getDictionary(locale);
  const user = await getCurrentUser();
  if (!user) return { error: t.errors.unauthorized };
  if (fd.get('confirm') !== 'DELETE') return { error: t.errors.validation, fieldErrors: { confirm: t.validation.confirm } };
  const mode = fd.get('mode') === 'all' ? 'all' : 'keep';

  // 1. verification evidence is always deleted immediately
  const events = await appDb.query('SELECT id FROM private.verification_events WHERE user_id = $1', [user.id]);
  for (const e of events.rows) await deleteEvidenceForEvent(e.id, user.id, 'account_deletion');

  await transaction(async (c) => {
    if (mode === 'all') {
      await c.query(`UPDATE public.reviews SET status = 'removed', updated_at = now() WHERE user_id = $1`, [user.id]);
      await c.query(`DELETE FROM public.reviews WHERE user_id = $1 AND id NOT IN (SELECT review_id FROM private.legal_requests WHERE review_id IS NOT NULL)`, [user.id]);
    }
    // remaining reviews (kept, or retained for an open legal matter) lose their author link
    await c.query(`UPDATE public.reviews SET author_deleted = true, user_id = NULL WHERE user_id = $1`, [user.id]);
    await c.query(`DELETE FROM private.users WHERE id = $1`, [user.id]); // cascades sessions, tokens, profile, votes, roles
    await audit(null, 'account.deleted', { type: 'user', id: user.id }, { mode }, c);
  });
  await destroySession();
  redirect(`${localizePath(locale, '/')}?deleted=1`);
}
