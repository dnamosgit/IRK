import { describe, expect, it } from 'vitest';
import { checkEnv, envProblems } from '@/lib/env-check';

const good = {
  NODE_ENV: 'production', DATABASE_URL: 'postgres://u:p@db.example.supabase.co:5432/postgres', DATABASE_READER_URL: 'postgres://r:p@db.example.supabase.co:5432/postgres',
  DATABASE_SSL: 'require', APP_SECRET: 'x'.repeat(40), EVIDENCE_ENCRYPTION_KEY: Buffer.alloc(32, 1).toString('base64'),
  NEXT_PUBLIC_SITE_URL: 'https://irk.example', EMAIL_PROVIDER: 'resend', RESEND_API_KEY: 'k', STORAGE_PROVIDER: 'supabase',
  SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'k', CRON_SECRET: 's', VERCEL: '1',
} as NodeJS.ProcessEnv;

describe('checkEnv', () => {
  it('passes a complete production configuration', () => {
    expect(envProblems(checkEnv(good))).toEqual([]);
  });
  it('flags the typical fresh Vercel project', () => {
    const keys = envProblems(checkEnv({ NODE_ENV: 'production', VERCEL: '1' } as NodeJS.ProcessEnv)).map((p) => p.key);
    expect(keys).toEqual(expect.arrayContaining(['DATABASE_URL', 'APP_SECRET', 'EVIDENCE_ENCRYPTION_KEY', 'EMAIL_PROVIDER', 'STORAGE_PROVIDER', 'CRON_SECRET']));
  });
  it('warns about a remote database without TLS and a short secret', () => {
    const p = envProblems(checkEnv({ ...good, DATABASE_SSL: '', APP_SECRET: 'short' }));
    expect(p.map((x) => x.key)).toEqual(['DATABASE_SSL', 'APP_SECRET']);
  });
  it('never includes values', () => {
    const json = JSON.stringify(checkEnv(good));
    expect(json).not.toContain('supabase.co');
    expect(json).not.toContain('x'.repeat(40));
  });
});
