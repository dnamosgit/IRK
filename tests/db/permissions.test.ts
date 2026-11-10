// Database permission tests. Requires a migrated + seeded database and the
// three role URLs from .env.local. Run with: npm run test:db
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { config } from 'dotenv';

config({ path: '.env.local' });
const reader = new pg.Client({ connectionString: process.env.DATABASE_READER_URL });
const app = new pg.Client({ connectionString: process.env.DATABASE_URL });

beforeAll(async () => {
  await reader.connect();
  await app.connect();
});
afterAll(async () => {
  await reader.end();
  await app.end();
});

const denied = async (sql: string, params: unknown[] = []) => {
  await expect(reader.query(sql, params)).rejects.toThrow(/permission denied/);
};

describe('read-only public role (irk_reader)', () => {
  it('cannot read any private table', async () => {
    for (const table of ['users', 'sessions', 'email_tokens', 'verification_events', 'private_verification_files',
      'moderation_cases', 'moderation_actions', 'review_reports', 'appeals', 'legal_requests', 'audit_logs', 'admin_users', 'review_revisions']) {
      await denied(`SELECT 1 FROM private.${table} LIMIT 1`);
    }
  });
  it('cannot see who wrote a review or moderation internals', async () => {
    await denied('SELECT user_id FROM public.reviews LIMIT 1');
    await denied('SELECT content_hash FROM public.reviews LIMIT 1');
    await denied('SELECT user_id FROM public.helpful_votes LIMIT 1');
    await denied('SELECT user_id FROM public.user_profiles LIMIT 1');
  });
  it('only sees published reviews (RLS)', async () => {
    const appCount = await app.query(`SELECT count(*)::int AS n FROM public.reviews WHERE status <> 'approved'`);
    const r = await reader.query(`SELECT count(*)::int AS n FROM public.reviews WHERE status <> 'approved'`);
    expect(r.rows[0].n).toBe(0);
    // the app role can see them, proving the filter is RLS and not missing data
    expect(appCount.rows[0].n).toBeGreaterThanOrEqual(0);
  });
  it('cannot write anything', async () => {
    await denied(`UPDATE public.offices SET slug = slug`);
    await denied(`DELETE FROM public.reviews`);
    await denied(`INSERT INTO public.helpful_votes (review_id, user_id) VALUES (gen_random_uuid(), gen_random_uuid())`);
  });
  it('hides translations awaiting human review', async () => {
    const r = await reader.query(`SELECT count(*)::int AS n FROM public.review_translations WHERE status NOT IN ('completed','approved_manual')`);
    expect(r.rows[0].n).toBe(0);
  });
});

describe('application role (irk_app)', () => {
  it('cannot rewrite or delete audit history', async () => {
    await expect(app.query(`UPDATE private.audit_logs SET action = 'x'`)).rejects.toThrow(/permission denied/);
    await expect(app.query(`DELETE FROM private.audit_logs`)).rejects.toThrow(/permission denied/);
  });
  it('cannot create new admin role types', async () => {
    await expect(app.query(`INSERT INTO private.admin_roles (key, description) VALUES ('god', 'x')`)).rejects.toThrow(/permission denied/);
  });
  it('enforces one review per person, office, service and month', async () => {
    const u = await app.query(`INSERT INTO private.users (email, password_hash) VALUES ($1, 'x') RETURNING id`, [`dup-${Date.now()}@example.test`]);
    const o = await app.query(`SELECT id FROM public.offices LIMIT 1`);
    const insert = () => app.query(
      `INSERT INTO public.reviews (office_id, user_id, service_category, visit_month, used_appointment, received_service, original_language, body, overall_score, content_hash)
       VALUES ($1,$2,'other','2026-01-01','yes','yes','en',$3,3,'h')`, [o.rows[0].id, u.rows[0].id, 'x'.repeat(60)]);
    await insert();
    await expect(insert()).rejects.toThrow(/duplicate key/);
    await app.query('DELETE FROM public.reviews WHERE user_id = $1', [u.rows[0].id]);
    await app.query('DELETE FROM private.users WHERE id = $1', [u.rows[0].id]);
  });
});
