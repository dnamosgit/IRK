// Delete verification evidence past retention. Schedule daily (cron / CI).
import './_env';
import pg from 'pg';

const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
const due = await db.query(
  `SELECT f.id, f.storage_key, f.storage_provider, v.id AS event_id FROM private.verification_events v
     LEFT JOIN private.private_verification_files f ON f.verification_event_id = v.id AND f.deleted_at IS NULL
    WHERE v.evidence_deleted_at IS NULL AND v.retention_until < now()`,
);
const fs = await import('node:fs/promises');
const path = await import('node:path');
const root = path.resolve(process.env.LOCAL_STORAGE_DIR || './storage/private');
for (const row of due.rows) {
  if (row.storage_key) {
    if (row.storage_provider !== 'local') throw new Error('Use the /api/cron/purge endpoint for non-local storage providers');
    await fs.rm(path.join(root, row.storage_key.slice(0, 2), row.storage_key), { force: true });
    await db.query('UPDATE private.private_verification_files SET deleted_at = now() WHERE id = $1', [row.id]);
  }
  await db.query('UPDATE private.verification_events SET evidence_deleted_at = now(), user_note = NULL WHERE id = $1', [row.event_id]);
  await db.query(`INSERT INTO private.audit_logs (action, target_type, target_id, metadata) VALUES ('verification.evidence_deleted','verification',$1,'{"reason":"retention_expired"}')`, [row.event_id]);
}
await db.query(`DELETE FROM private.sessions WHERE expires_at < now()`);
console.log(`Purged evidence for ${new Set(due.rows.map((r) => r.event_id)).size} verification request(s).`);
await db.end();
