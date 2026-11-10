// Applies db/migrations/*.sql in order as the schema owner.
//   npm run db:migrate            apply pending migrations
//   npm run db:migrate -- --reset DROP everything and re-apply (development only)
import './_env';
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const url = process.env.DATABASE_OWNER_URL;
if (!url) throw new Error('DATABASE_OWNER_URL is required for migrations');
const reset = process.argv.includes('--reset');

const client = new pg.Client({
  connectionString: url,
  ssl: process.env.DATABASE_SSL === 'require' ? { rejectUnauthorized: true } : undefined,
});
await client.connect();
try {
  if (reset) {
    if (process.env.NODE_ENV === 'production') throw new Error('Refusing to reset in production');
    console.log('Resetting schemas public & private…');
    await client.query('DROP SCHEMA IF EXISTS private CASCADE; DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;');
    await client.query('GRANT USAGE ON SCHEMA public TO PUBLIC');
  }
  const exists = await client.query(`SELECT to_regclass('private.schema_migrations') AS t`);
  const applied = new Set<string>();
  if (exists.rows[0].t) {
    const r = await client.query('SELECT name FROM private.schema_migrations');
    r.rows.forEach((row) => applied.add(row.name));
  }
  const dir = path.join(process.cwd(), 'db', 'migrations');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) {
    if (applied.has(file)) continue;
    console.log(`Applying ${file}`);
    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query('INSERT INTO private.schema_migrations(name) VALUES ($1)', [file]);
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    }
  }
  console.log('Migrations complete.');
} finally {
  await client.end();
}
