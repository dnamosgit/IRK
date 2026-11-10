import 'server-only';
import { appDb } from '@/lib/db';
import { audit } from '@/lib/audit';
import { getEvidenceStore } from '@/lib/storage';

// NOTE: deliberately NOT a 'use server' module — these helpers must never be
// exposed as callable server actions. Callers perform authorisation first.

/** Delete all evidence files for a verification event. Used by the author,
 *  admins, account deletion and the retention purge job. */
export async function deleteEvidenceForEvent(eventId: string, actorId: string | null, reason: string): Promise<number> {
  const files = await appDb.query(
    `SELECT id, storage_key FROM private.private_verification_files WHERE verification_event_id = $1 AND deleted_at IS NULL`,
    [eventId],
  );
  const store = getEvidenceStore();
  for (const f of files.rows) {
    await store.remove(f.storage_key);
    await appDb.query(`UPDATE private.private_verification_files SET deleted_at = now() WHERE id = $1`, [f.id]);
  }
  await appDb.query(
    `UPDATE private.verification_events SET evidence_deleted_at = coalesce(evidence_deleted_at, now()), user_note = NULL WHERE id = $1`,
    [eventId],
  );
  await audit(actorId, 'verification.evidence_deleted', { type: 'verification', id: eventId }, { reason, files: files.rowCount });
  return files.rowCount ?? 0;
}

/** Delete evidence whose retention period has passed. Returns events purged. */
export async function purgeExpiredEvidence(): Promise<number> {
  const due = await appDb.query(
    `SELECT id FROM private.verification_events WHERE evidence_deleted_at IS NULL AND retention_until < now()`,
  );
  for (const e of due.rows) await deleteEvidenceForEvent(e.id, null, 'retention_expired');
  // expired auth artefacts
  await appDb.query(`DELETE FROM private.sessions WHERE expires_at < now()`);
  await appDb.query(`DELETE FROM private.email_tokens WHERE expires_at < now() - interval '7 days'`);
  return due.rowCount ?? 0;
}
