import 'server-only';
import { appDb } from '@/lib/db';
import { clientIpHash } from '@/lib/security';

/**
 * Fixed-window rate limiter backed by Postgres so it works across serverless
 * instances. Put a WAF / edge rate limit (e.g. Cloudflare) in front as well.
 */
export async function rateLimit(action: string, limit: number, windowSeconds: number, subject?: string): Promise<boolean> {
  const key = `${action}:${subject ?? (await clientIpHash())}`;
  const windowStart = new Date(Math.floor(Date.now() / (windowSeconds * 1000)) * windowSeconds * 1000);
  const r = await appDb.query<{ count: number }>(
    `INSERT INTO private.rate_limits (key, window_start, count) VALUES ($1, $2, 1)
     ON CONFLICT (key, window_start) DO UPDATE SET count = private.rate_limits.count + 1
     RETURNING count`,
    [key, windowStart],
  );
  // opportunistic cleanup
  if (Math.random() < 0.01) {
    await appDb.query(`DELETE FROM private.rate_limits WHERE window_start < now() - interval '2 days'`);
  }
  return r.rows[0].count <= limit;
}
