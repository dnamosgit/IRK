'use server';
import { revalidatePath } from 'next/cache';
import sharp from 'sharp';
import { appDb, transaction } from '@/lib/db';
import { config } from '@/lib/config';
import { getCurrentUser } from '@/lib/auth/session';
import { rateLimit } from '@/lib/rate-limit';
import { sha256 } from '@/lib/security';
import { audit } from '@/lib/audit';
import { encrypt, getEvidenceKey } from '@/lib/storage/crypto';
import { getEvidenceStore, newStorageKey } from '@/lib/storage';
import { deleteEvidenceForEvent } from '@/lib/evidence';
import { getDictionary, isLocale, type Locale } from '@/lib/i18n';
import type { ActionState } from './state';

const METHODS = ['appointment_confirmation', 'redacted_evidence', 'manual_alternative'] as const;

function localeOf(fd: FormData): Locale {
  const l = String(fd.get('locale') ?? '');
  return isLocale(l) ? l : 'en';
}

/**
 * Re-encode the image: strips EXIF/GPS/camera metadata, normalises orientation
 * and rejects anything that is not a decodable image.
 */
async function sanitiseImage(file: File): Promise<{ data: Buffer; contentType: string } | null> {
  if (!(config.verification.allowedTypes as readonly string[]).includes(file.type) || file.size > config.verification.maxFileBytes || file.size === 0) {
    return null;
  }
  try {
    const input = Buffer.from(await file.arrayBuffer());
    const data = await sharp(input, { failOn: 'error', limitInputPixels: 40_000_000 })
      .rotate()
      .resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer(); // sharp drops all metadata unless .withMetadata() is called
    return { data, contentType: 'image/jpeg' };
  } catch {
    return null;
  }
}

export async function submitVerificationAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const locale = localeOf(fd);
  const t = getDictionary(locale);
  const user = await getCurrentUser();
  if (!user) return { error: t.errors.unauthorized };
  if (!(await rateLimit('verification', 5, 86400, user.id))) return { error: t.errors.rateLimited };

  const reviewId = String(fd.get('reviewId') ?? '');
  const method = String(fd.get('method') ?? '') as (typeof METHODS)[number];
  const note = String(fd.get('note') ?? '').trim().slice(0, 2000) || null;
  if (!METHODS.includes(method)) return { error: t.errors.validation, fieldErrors: { method: t.validation.required } };

  const owned = await appDb.query(
    `SELECT id FROM public.reviews WHERE id = $1 AND user_id = $2 AND status NOT IN ('removed', 'rejected')`,
    [reviewId, user.id],
  );
  if (!owned.rowCount) return { error: t.errors.forbidden };
  const pending = await appDb.query(`SELECT 1 FROM private.verification_events WHERE review_id = $1 AND status = 'submitted'`, [reviewId]);
  if (pending.rowCount) return { error: t.verify.alreadyPending };

  let evidence: { data: Buffer; contentType: string } | null = null;
  if (method === 'manual_alternative') {
    if (!note || note.length < 20) return { error: t.errors.validation, fieldErrors: { note: t.validation.required } };
  } else {
    const file = fd.get('file');
    if (!(file instanceof File) || file.size === 0) return { error: t.errors.validation, fieldErrors: { file: t.validation.file } };
    evidence = await sanitiseImage(file);
    if (!evidence) return { error: t.errors.validation, fieldErrors: { file: t.validation.file } };
  }

  // retention: until decision + retention period; pending requests expire after 90 days
  const retentionUntil = new Date(Date.now() + 90 * 86400000);
  const store = getEvidenceStore();
  let storageKey: string | null = null;
  try {
    await transaction(async (c) => {
      const ev = await c.query(
        `INSERT INTO private.verification_events (review_id, user_id, method, user_note, retention_until)
         VALUES ($1,$2,$3,$4,$5) RETURNING id`,
        [reviewId, user.id, method, note, retentionUntil],
      );
      const eventId = ev.rows[0].id as string;
      if (evidence) {
        storageKey = newStorageKey();
        const ciphertext = encrypt(evidence.data, getEvidenceKey(), storageKey);
        await store.put(storageKey, ciphertext);
        await c.query(
          `INSERT INTO private.private_verification_files (verification_event_id, storage_provider, storage_key, content_type, byte_size, ciphertext_sha256)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [eventId, store.name, storageKey, evidence.contentType, evidence.data.length, sha256(ciphertext)],
        );
      }
      await c.query(`UPDATE public.reviews SET verification = 'pending' WHERE id = $1 AND verification <> 'verified'`, [reviewId]);
      await audit(user.id, 'verification.submitted', { type: 'verification', id: eventId }, { method, hasFile: !!evidence }, c);
    });
  } catch (e) {
    if (storageKey) await store.remove(storageKey).catch(() => {});
    console.error('verification submit failed', (e as Error).message);
    return { error: t.errors.server };
  }
  revalidatePath(`/${locale}/account`);
  return { ok: true, message: t.verify.submitted };
}

/** The author can delete their own evidence at any time. */
export async function deleteOwnEvidenceAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const locale = localeOf(fd);
  const t = getDictionary(locale);
  const user = await getCurrentUser();
  if (!user) return { error: t.errors.unauthorized };
  const eventId = String(fd.get('eventId') ?? '');
  const ev = await appDb.query(`SELECT id, status, review_id FROM private.verification_events WHERE id = $1 AND user_id = $2`, [eventId, user.id]);
  if (!ev.rowCount) return { error: t.errors.forbidden };
  await deleteEvidenceForEvent(eventId, user.id, 'user_request');
  if (ev.rows[0].status === 'submitted') {
    await appDb.query(`UPDATE private.verification_events SET status = 'withdrawn' WHERE id = $1`, [eventId]);
    await appDb.query(`UPDATE public.reviews SET verification = 'unverified' WHERE id = $1 AND verification = 'pending'`, [ev.rows[0].review_id]);
  }
  revalidatePath(`/${locale}/account`);
  return { ok: true, message: t.verify.evidenceDeleted };
}
