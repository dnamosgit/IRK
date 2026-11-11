// Startup / health configuration report. Reports PRESENCE and validity only,
// never values. Pure (no I/O) so it is unit-testable and safe for /api/health.

export type EnvCheck = { key: string; status: 'ok' | 'missing' | 'invalid' | 'default'; note?: string };

export function checkEnv(env: NodeJS.ProcessEnv = process.env): EnvCheck[] {
  const prod = env.NODE_ENV === 'production';
  const out: EnvCheck[] = [];

  out.push({ key: 'DATABASE_URL', status: env.DATABASE_URL ? 'ok' : 'missing' });
  out.push({ key: 'DATABASE_READER_URL', status: env.DATABASE_READER_URL ? 'ok' : 'default', note: env.DATABASE_READER_URL ? undefined : 'falls back to DATABASE_URL (public pages then run with write privileges)' });

  const ssl = (env.DATABASE_SSL ?? '').toLowerCase();
  const host = (() => { try { return new URL(env.DATABASE_URL ?? '').hostname; } catch { return ''; } })();
  const remote = host && !['localhost', '127.0.0.1', '::1'].includes(host);
  out.push({
    key: 'DATABASE_SSL',
    status: ssl ? 'ok' : remote ? 'invalid' : 'default',
    note: !ssl && remote ? 'remote database without DATABASE_SSL — set "require" for Supabase/Neon/RDS' : undefined,
  });

  const secret = env.APP_SECRET ?? '';
  out.push({ key: 'APP_SECRET', status: secret.length >= 32 ? 'ok' : secret ? 'invalid' : 'missing', note: secret && secret.length < 32 ? 'must be at least 32 characters' : undefined });

  const evidence = env.EVIDENCE_ENCRYPTION_KEY ?? '';
  let evidenceOk = false;
  try { evidenceOk = Buffer.from(evidence, 'base64').length === 32; } catch { /* invalid */ }
  out.push({ key: 'EVIDENCE_ENCRYPTION_KEY', status: evidenceOk ? 'ok' : evidence ? 'invalid' : 'missing', note: evidenceOk ? undefined : 'verification uploads are disabled until set (32 bytes, base64)' });

  const site = env.NEXT_PUBLIC_SITE_URL;
  out.push({ key: 'NEXT_PUBLIC_SITE_URL', status: site ? (/^https?:\/\//.test(site) ? 'ok' : 'invalid') : env.VERCEL_PROJECT_PRODUCTION_URL || env.VERCEL_URL ? 'default' : 'missing', note: site && !/^https?:\/\//.test(site) ? 'should start with https:// (auto-corrected)' : undefined });

  const emailProvider = (env.EMAIL_PROVIDER ?? 'console').toLowerCase();
  out.push({ key: 'EMAIL_PROVIDER', status: emailProvider === 'resend' ? (env.RESEND_API_KEY ? 'ok' : 'invalid') : prod ? 'missing' : 'default', note: emailProvider !== 'resend' && prod ? 'no email provider: sign-up confirmation emails cannot be sent in production' : emailProvider === 'resend' && !env.RESEND_API_KEY ? 'RESEND_API_KEY missing' : undefined });

  if (env.STORAGE_PROVIDER === 'supabase') {
    out.push({ key: 'SUPABASE_URL', status: env.SUPABASE_URL ? 'ok' : 'missing' });
    out.push({ key: 'SUPABASE_SERVICE_ROLE_KEY', status: env.SUPABASE_SERVICE_ROLE_KEY ? 'ok' : 'missing' });
  } else if (prod && (env.VERCEL || env.AWS_LAMBDA_FUNCTION_NAME)) {
    out.push({ key: 'STORAGE_PROVIDER', status: 'invalid', note: 'local disk is ephemeral on serverless hosts; set STORAGE_PROVIDER=supabase' });
  }

  out.push({ key: 'CRON_SECRET', status: env.CRON_SECRET ? 'ok' : prod ? 'missing' : 'default' });
  return out;
}

export function envProblems(checks: EnvCheck[]): EnvCheck[] {
  return checks.filter((c) => c.status === 'missing' || c.status === 'invalid');
}
