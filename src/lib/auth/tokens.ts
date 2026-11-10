import 'server-only';
import { appDb } from '@/lib/db';
import { sha256 } from '@/lib/security';

export async function verifyEmailToken(token: string): Promise<boolean> {
  if (!token || token.length > 100) return false;
  const r = await appDb.query(
    `UPDATE private.email_tokens SET used_at = now()
      WHERE token_hash = $1 AND purpose = 'verify_email' AND used_at IS NULL AND expires_at > now()
      RETURNING user_id`,
    [sha256(token)],
  );
  if (!r.rowCount) return false;
  await appDb.query('UPDATE private.users SET email_verified_at = coalesce(email_verified_at, now()) WHERE id = $1', [r.rows[0].user_id]);
  return true;
}
