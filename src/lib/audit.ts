import 'server-only';
import { appDb, type Queryable } from '@/lib/db';
import { clientIpHash } from '@/lib/security';

/** Append-only audit trail (irk_app has no UPDATE/DELETE on audit_logs). */
export async function audit(
  actorUserId: string | null,
  action: string,
  target: { type: string; id: string } | null,
  metadata: Record<string, unknown> = {},
  db: Queryable = appDb,
): Promise<void> {
  await db.query(
    `INSERT INTO private.audit_logs (actor_user_id, action, target_type, target_id, metadata, ip_hash)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [actorUserId, action, target?.type ?? null, target?.id ?? null, metadata, await clientIpHash().catch(() => null)],
  );
}
