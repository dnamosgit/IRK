import 'server-only';
import pg from 'pg';

// Two pools with different database privileges:
//  - appDb    : irk_app role, used by authenticated server actions & admin
//  - readerDb : irk_reader role, used to render public pages. Row Level
//               Security restricts it to active offices and PUBLISHED reviews,
//               and column grants hide author ids and moderation fields.
// Credentials come only from server environment variables.

type Pools = { app: pg.Pool; reader: pg.Pool };
const globalForDb = globalThis as unknown as { __irkPools?: Pools };

function ssl() {
  return process.env.DATABASE_SSL === 'require' ? { rejectUnauthorized: true } : undefined;
}

function createPools(): Pools {
  const appUrl = process.env.DATABASE_URL;
  if (!appUrl) throw new Error('DATABASE_URL is not configured. See .env.example.');
  const readerUrl = process.env.DATABASE_READER_URL || appUrl;
  const app = new pg.Pool({ connectionString: appUrl, max: 10, ssl: ssl() });
  const reader = new pg.Pool({ connectionString: readerUrl, max: 10, ssl: ssl() });
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
