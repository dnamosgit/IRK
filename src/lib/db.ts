import 'server-only';
import pg from 'pg';
import { cache } from 'react';

// Two pools with different database privileges:
//  - appDb    : irk_app role, used by authenticated server actions & admin
//  - readerDb : irk_reader role, used to render public pages. Row Level
//               Security restricts it to active offices and PUBLISHED reviews,
//               and column grants hide author ids and moderation fields.
// Credentials come only from server environment variables.

type Pools = { app: pg.Pool; reader: pg.Pool };
const globalForDb = globalThis as unknown as { __irkPools?: Pools };

/**
 * DATABASE_SSL follows libpq's sslmode semantics:
 *   (unset) / disable : no TLS option (the connection string's own ?sslmode= still applies)
 *   require           : encrypted, server certificate NOT verified (what libpq "require" does;
 *                       works with Supabase, Neon, RDS out of the box)
 *   verify-full       : encrypted AND verified. Provide the provider's CA bundle in
 *                       DATABASE_SSL_CA (PEM) when it is not in Node's trust store.
 */
export function sslOptions(): pg.ConnectionConfig['ssl'] {
  const mode = (process.env.DATABASE_SSL ?? '').trim().toLowerCase();
  if (!mode || mode === 'disable' || mode === 'false') return undefined;
  if (mode === 'verify-full' || mode === 'verify-ca') {
    const ca = process.env.DATABASE_SSL_CA?.replace(/\\n/g, '\n');
    return ca ? { rejectUnauthorized: true, ca } : { rejectUnauthorized: true };
  }
  return { rejectUnauthorized: false };
}

export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super('DATABASE_URL is not configured. See .env.example and docs/DEPLOYMENT.md.');
    this.name = 'DatabaseNotConfiguredError';
  }
}

function createPools(): Pools {
  const appUrl = process.env.DATABASE_URL;
  if (!appUrl) throw new DatabaseNotConfiguredError();
  const readerUrl = process.env.DATABASE_READER_URL || appUrl;
  const ssl = sslOptions();
  const common = { max: 10, ssl, connectionTimeoutMillis: 8000, idleTimeoutMillis: 30000 };
  const app = new pg.Pool({ connectionString: appUrl, ...common });
  const reader = new pg.Pool({ connectionString: readerUrl, ...common });
  // a broken idle client must not crash the process
  app.on('error', (e) => console.error('[db:app] idle client error', e.message));
  reader.on('error', (e) => console.error('[db:reader] idle client error', e.message));
  return { app, reader };
}

function pools(): Pools {
  if (!globalForDb.__irkPools) globalForDb.__irkPools = createPools();
  return globalForDb.__irkPools;
}

export type Queryable = { query: (text: string, params?: unknown[]) => Promise<pg.QueryResult> };

export const appDb = {
  query<T extends pg.QueryResultRow = pg.QueryResultRow>(text: string, params?: unknown[]) {
    return pools().app.query<T>(text, params);
  },
};

export const readerDb = {
  query<T extends pg.QueryResultRow = pg.QueryResultRow>(text: string, params?: unknown[]) {
    return pools().reader.query<T>(text, params);
  },
};

/** Run a function in a transaction on the app (writer) pool. */
export async function transaction<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pools().app.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

export type DbStatus =
  | { ok: true }
  | { ok: false; reason: 'not_configured' | 'unreachable' | 'auth_failed' | 'tls' | 'not_migrated' | 'error'; message: string };

/** Classify a database error without leaking credentials. */
export function classifyDbError(e: unknown): DbStatus {
  if (e instanceof DatabaseNotConfiguredError) return { ok: false, reason: 'not_configured', message: e.message };
  const err = e as { code?: string; message?: string };
  const msg = err.message ?? String(e);
  const code = err.code ?? '';
  if (code === '28P01' || code === '28000') return { ok: false, reason: 'auth_failed', message: 'Database rejected the credentials.' };
  if (code === '3D000') return { ok: false, reason: 'unreachable', message: 'The database named in the connection string does not exist.' };
  if (code === '42P01' || code === '3F000' || code === '42501') return { ok: false, reason: 'not_migrated', message: 'Database reachable but schema missing or roles lack grants: run `npm run db:migrate`.' };
  if (/certificate|ssl|tls/i.test(msg)) return { ok: false, reason: 'tls', message: 'TLS handshake failed. Set DATABASE_SSL=require (or verify-full with DATABASE_SSL_CA).' };
  if (/ECONNREFUSED|ENOTFOUND|ETIMEDOUT|timeout|EAI_AGAIN|ECONNRESET/i.test(msg) || ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT'].includes(code)) {
    return { ok: false, reason: 'unreachable', message: 'Could not connect to the database host.' };
  }
  return { ok: false, reason: 'error', message: 'Database query failed.' };
}

/**
 * Cheap per-request readiness check (memoised with React cache). Confirms the
 * reader role can connect AND the schema exists. Never throws.
 */
export const checkDatabase = cache(async (): Promise<DbStatus> => {
  try {
    await readerDb.query('SELECT 1 FROM public.offices LIMIT 1');
    return { ok: true };
  } catch (e) {
    const status = classifyDbError(e);
    if (!status.ok) console.error(`[db] readiness check failed (${status.reason}):`, (e as Error).message);
    return status;
  }
});
