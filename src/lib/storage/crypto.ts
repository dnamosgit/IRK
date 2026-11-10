import crypto from 'node:crypto';

// AES-256-GCM envelope: [version(1)][iv(12)][tag(16)][ciphertext]
const VERSION = 1;

export function getEvidenceKey(): Buffer {
  const raw = process.env.EVIDENCE_ENCRYPTION_KEY;
  if (!raw) throw new Error('EVIDENCE_ENCRYPTION_KEY is not configured — verification uploads are disabled.');
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) throw new Error('EVIDENCE_ENCRYPTION_KEY must be 32 bytes, base64-encoded.');
  return key;
}

export function encrypt(plaintext: Buffer, key: Buffer, aad: string): Buffer {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(aad));
  const ct = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return Buffer.concat([Buffer.from([VERSION]), iv, cipher.getAuthTag(), ct]);
}

export function decrypt(envelope: Buffer, key: Buffer, aad: string): Buffer {
  if (envelope[0] !== VERSION) throw new Error('Unsupported evidence envelope version');
  const iv = envelope.subarray(1, 13);
  const tag = envelope.subarray(13, 29);
  const ct = envelope.subarray(29);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAAD(Buffer.from(aad));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]);
}

/** Overwrite-then-delete is not meaningful on SSDs/object stores; we rely on
 *  encryption + key management and delete the ciphertext. */
export function isEvidenceStorageConfigured(): boolean {
  try {
    getEvidenceKey();
    return true;
  } catch {
    return false;
  }
}
