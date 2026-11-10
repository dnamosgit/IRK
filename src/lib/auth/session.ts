import 'server-only';
import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import { appDb } from '@/lib/db';
import { config } from '@/lib/config';
import { clientIpHash, randomToken, sha256 } from '@/lib/security';

export type SessionUser = {
  id: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
  displayNameGenerated: boolean;
  createdAt: string;
  roles: string[];
};

export async function createSession(userId: string): Promise<void> {
  const token = randomToken(32);
  const expires = new Date(Date.now() + config.session.maxAgeDays * 86400000);
  const ua = (await headers()).get('user-agent')?.slice(0, 200) ?? null;
  await appDb.query(
    `INSERT INTO private.sessions (token_hash, user_id, expires_at, ip_hash, user_agent) VALUES ($1,$2,$3,$4,$5)`,
    [sha256(token), userId, expires, await clientIpHash(), ua],
  );
  await appDb.query('UPDATE private.users SET last_login_at = now() WHERE id = $1', [userId]);
  (await cookies()).set(config.session.cookieName, token, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'lax',
    path: '/',
    expires,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(config.session.cookieName)?.value;
  if (token) await appDb.query('DELETE FROM private.sessions WHERE token_hash = $1', [sha256(token)]);
  jar.delete(config.session.cookieName);
}

export async function destroyAllSessions(userId: string, exceptCurrent = false): Promise<void> {
  const token = (await cookies()).get(config.session.cookieName)?.value;
  if (exceptCurrent && token) {
    await appDb.query('DELETE FROM private.sessions WHERE user_id = $1 AND token_hash <> $2', [userId, sha256(token)]);
  } else {
    await appDb.query('DELETE FROM private.sessions WHERE user_id = $1', [userId]);
  }
}

/** Current signed-in user (memoised per request). */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(config.session.cookieName)?.value;
  if (!token) return null;
  const r = await appDb.query(
    `SELECT u.id, u.email, u.email_verified_at, u.created_at, p.display_name, p.display_name_generated,
            coalesce(array_agg(a.role) FILTER (WHERE a.role IS NOT NULL), '{}') AS roles
       FROM private.sessions s
       JOIN private.users u ON u.id = s.user_id AND u.status = 'active'
       JOIN public.user_profiles p ON p.user_id = u.id
       LEFT JOIN private.admin_users a ON a.user_id = u.id
      WHERE s.token_hash = $1 AND s.expires_at > now()
      GROUP BY u.id, p.user_id`,
    [sha256(token)],
  );
  const row = r.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    emailVerified: !!row.email_verified_at,
    displayName: row.display_name,
    displayNameGenerated: row.display_name_generated,
    createdAt: row.created_at.toISOString(),
    roles: row.roles,
  };
});
