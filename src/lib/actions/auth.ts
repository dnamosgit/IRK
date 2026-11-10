'use server';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { appDb, transaction } from '@/lib/db';
import { config } from '@/lib/config';
import { DUMMY_HASH, hashPassword, verifyPassword } from '@/lib/auth/password';
import { randomPseudonym } from '@/lib/auth/pseudonym';
import { createSession, destroyAllSessions, destroySession, getCurrentUser } from '@/lib/auth/session';
import { rateLimit } from '@/lib/rate-limit';
import { clientIpHash, randomToken, sha256 } from '@/lib/security';
import { sendEmail } from '@/lib/email';
import { EMAILS } from '@/lib/content/emails';
import { getDictionary, isLocale, localizePath, type Locale } from '@/lib/i18n';
import type { ActionState } from './state';

function localeOf(fd: FormData): Locale {
  const l = String(fd.get('locale') ?? '');
  return isLocale(l) ? l : 'en';
}

/** Only allow same-site relative redirects. */
function safeNext(value: FormDataEntryValue | null, fallback: string): string {
  const v = typeof value === 'string' ? value : '';
  return v.startsWith('/') && !v.startsWith('//') && !v.includes('\\') ? v : fallback;
}

const emailSchema = z.string().trim().toLowerCase().email().max(254);
const passwordSchema = z.string().min(10).max(200);

async function issueToken(userId: string, purpose: 'verify_email' | 'reset_password', hours: number): Promise<string> {
  const token = randomToken(32);
  await appDb.query(
    `UPDATE private.email_tokens SET used_at = now() WHERE user_id = $1 AND purpose = $2 AND used_at IS NULL`,
    [userId, purpose],
  );
  await appDb.query(
    `INSERT INTO private.email_tokens (user_id, purpose, token_hash, expires_at) VALUES ($1,$2,$3, now() + make_interval(hours => $4))`,
    [userId, purpose, sha256(token), hours],
  );
  return token;
}

async function sendVerification(userId: string, email: string, locale: Locale) {
  const token = await issueToken(userId, 'verify_email', 24);
  const link = `${config.siteUrl}${localizePath(locale, '/auth/verify-email')}?token=${token}`;
  const tpl = EMAILS.verify[locale];
  await sendEmail({ to: email, subject: tpl.subject, text: tpl.text(link) });
}

export async function signUpAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const locale = localeOf(fd);
  const t = getDictionary(locale);
  if (!(await rateLimit('signup', 5, 3600))) return { error: t.errors.rateLimited };

  const fieldErrors: Record<string, string> = {};
  const email = emailSchema.safeParse(fd.get('email'));
  const password = passwordSchema.safeParse(fd.get('password'));
  if (!email.success) fieldErrors.email = t.validation.email;
  if (!password.success) fieldErrors.password = t.validation.passwordLength;
  if (password.success && fd.get('confirm') !== password.data) fieldErrors.confirm = t.auth.passwordsDontMatch;
  if (fd.get('terms') !== 'on') fieldErrors.terms = t.validation.confirm;
  if (Object.keys(fieldErrors).length || !email.success || !password.success) return { error: t.errors.validation, fieldErrors };

  const existing = await appDb.query('SELECT 1 FROM private.users WHERE email = $1', [email.data]);
  if (existing.rowCount) return { error: t.auth.emailTaken, fieldErrors: { email: t.auth.emailTaken } };

  const hash = await hashPassword(password.data);
  const ipHash = await clientIpHash();
  const userId = await transaction(async (c) => {
    const u = await c.query(
      `INSERT INTO private.users (email, password_hash, preferred_locale, signup_ip_hash) VALUES ($1,$2,$3,$4) RETURNING id`,
      [email.data, hash, locale, ipHash],
    );
    const id = u.rows[0].id as string;
    for (let attempt = 0; attempt < 5; attempt++) {
      const name = randomPseudonym();
      const r = await c.query(
        `INSERT INTO public.user_profiles (user_id, display_name) VALUES ($1,$2) ON CONFLICT (display_name) DO NOTHING`,
        [id, name],
      );
      if (r.rowCount) return id;
    }
    await c.query(`INSERT INTO public.user_profiles (user_id, display_name) VALUES ($1,$2)`, [id, `Member ${id.slice(0, 8)}`]);
    return id;
  });

  await sendVerification(userId, email.data, locale);
  await createSession(userId);
  const next = safeNext(fd.get('next'), '');
  redirect(next || `${localizePath(locale, '/account')}?welcome=1`);
}

export async function signInAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const locale = localeOf(fd);
  const t = getDictionary(locale);
  const email = emailSchema.safeParse(fd.get('email'));
  const password = String(fd.get('password') ?? '');
  if (!(await rateLimit('signin', 10, 900))) return { error: t.errors.rateLimited };
  if (email.success && !(await rateLimit('signin-account', 8, 900, email.data))) return { error: t.errors.rateLimited };

  const r = email.success
    ? await appDb.query(`SELECT id, password_hash, status FROM private.users WHERE email = $1`, [email.data])
    : { rows: [] as { id: string; password_hash: string; status: string }[] };
  const user = r.rows[0];
  const valid = await verifyPassword(password, user?.password_hash ?? DUMMY_HASH);
  if (!user || !valid || user.status !== 'active') return { error: t.auth.invalidCredentials };

  await createSession(user.id);
  redirect(safeNext(fd.get('next'), localizePath(locale, '/account')));
}

export async function signOutAction(): Promise<void> {
  await destroySession();
  redirect('/');
}

export async function resendVerificationAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const locale = localeOf(fd);
  const t = getDictionary(locale);
  const user = await getCurrentUser();
  if (!user) return { error: t.errors.unauthorized };
  if (!(await rateLimit('resend-verify', 3, 3600, user.id))) return { error: t.errors.rateLimited };
  if (!user.emailVerified) await sendVerification(user.id, user.email, locale);
  return { ok: true, message: t.auth.verificationSent };
}

export async function forgotPasswordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const locale = localeOf(fd);
  const t = getDictionary(locale);
  if (!(await rateLimit('forgot', 5, 3600))) return { error: t.errors.rateLimited };
  const email = emailSchema.safeParse(fd.get('email'));
  if (!email.success) return { error: t.errors.validation, fieldErrors: { email: t.validation.email } };
  const r = await appDb.query(`SELECT id FROM private.users WHERE email = $1 AND status = 'active'`, [email.data]);
  if (r.rows[0]) {
    const token = await issueToken(r.rows[0].id, 'reset_password', 1);
    const link = `${config.siteUrl}${localizePath(locale, '/auth/reset-password')}?token=${token}`;
    const tpl = EMAILS.reset[locale];
    await sendEmail({ to: email.data, subject: tpl.subject, text: tpl.text(link) });
  }
  // identical response whether or not the account exists
  return { ok: true, message: t.auth.resetSent };
}

export async function resetPasswordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const locale = localeOf(fd);
  const t = getDictionary(locale);
  if (!(await rateLimit('reset', 10, 3600))) return { error: t.errors.rateLimited };
  const token = String(fd.get('token') ?? '');
  const password = passwordSchema.safeParse(fd.get('password'));
  if (!password.success) return { error: t.errors.validation, fieldErrors: { password: t.validation.passwordLength } };
  if (fd.get('confirm') !== password.data) return { error: t.errors.validation, fieldErrors: { confirm: t.auth.passwordsDontMatch } };
  const r = await appDb.query(
    `UPDATE private.email_tokens SET used_at = now()
      WHERE token_hash = $1 AND purpose = 'reset_password' AND used_at IS NULL AND expires_at > now() RETURNING user_id`,
    [sha256(token)],
  );
  if (!r.rowCount) return { error: t.auth.verifyEmailInvalid };
  const userId = r.rows[0].user_id;
  await appDb.query('UPDATE private.users SET password_hash = $1 WHERE id = $2', [await hashPassword(password.data), userId]);
  await destroyAllSessions(userId);
  redirect(`${localizePath(locale, '/auth/sign-in')}?reset=1`);
}
