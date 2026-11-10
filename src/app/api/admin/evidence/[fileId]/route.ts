import { NextResponse } from 'next/server';
import { appDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';
import { can } from '@/lib/rbac';
import { audit } from '@/lib/audit';
import { decrypt, getEvidenceKey } from '@/lib/storage/crypto';
import { getEvidenceStore } from '@/lib/storage';

// The ONLY way evidence leaves storage: verification reviewers / super admins,
// decrypted on the fly, never cached, every access written to the audit log.
export async function GET(_: Request, ctx: { params: Promise<{ fileId: string }> }) {
  const user = await getCurrentUser();
  if (!user || !can(user.roles, 'verifications')) return new NextResponse('Not found', { status: 404 });
  const { fileId } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(fileId)) return new NextResponse('Not found', { status: 404 });
  const r = await appDb.query(
    `SELECT f.storage_key, f.content_type, f.verification_event_id FROM private.private_verification_files f
      WHERE f.id = $1 AND f.deleted_at IS NULL`,
    [fileId],
  );
  const file = r.rows[0];
  if (!file) return new NextResponse('Not found', { status: 404 });
  await audit(user.id, 'verification.evidence_viewed', { type: 'verification', id: file.verification_event_id }, { fileId });
  const plaintext = decrypt(await getEvidenceStore().get(file.storage_key), getEvidenceKey(), file.storage_key);
  return new NextResponse(new Uint8Array(plaintext), {
    headers: {
      'Content-Type': file.content_type,
      'Content-Disposition': 'inline; filename="evidence.jpg"',
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; img-src 'self'",
      'X-Robots-Tag': 'noindex',
    },
  });
}
