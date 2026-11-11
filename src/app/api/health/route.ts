import { NextResponse } from 'next/server';
import { checkDatabase } from '@/lib/db';
import { checkEnv, envProblems } from '@/lib/env-check';

export const dynamic = 'force-dynamic';

/**
 * Deployment health. Safe to expose: reports presence/validity of
 * configuration and a database error CATEGORY, never values or raw errors.
 *   200 { status: "ok" }
 *   503 { status: "degraded", database: {...}, config: [...] }
 */
export async function GET() {
  const [db, config] = [await checkDatabase(), checkEnv()];
  const problems = envProblems(config);
  const ok = db.ok && problems.length === 0;
  return NextResponse.json(
    {
      status: ok ? 'ok' : 'degraded',
      database: db.ok ? { ok: true } : { ok: false, reason: db.reason, hint: db.message },
      config: problems,
      docs: 'https://github.com/dnamosgit/IRK/blob/main/docs/DEPLOYMENT.md',
    },
    { status: ok ? 200 : 503, headers: { 'Cache-Control': 'no-store' } },
  );
}
