import 'server-only';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

// Private evidence storage. Files are ALWAYS encrypted before reaching a
// provider, stored under random keys (never the original filename), and are
// only ever served through the audited admin route.
//
//   STORAGE_PROVIDER=local    : LOCAL_STORAGE_DIR (outside /public). Suitable
//                               for development and single-server deployments
//                               with a persistent, backed-up volume.
//   STORAGE_PROVIDER=supabase : a PRIVATE Supabase Storage bucket accessed with
//                               the service-role key, server-side only.

export interface EvidenceStore {
  name: string;
  put(key: string, data: Buffer): Promise<void>;
  get(key: string): Promise<Buffer>;
  remove(key: string): Promise<void>;
}

function localStore(): EvidenceStore {
  const root = path.resolve(process.env.LOCAL_STORAGE_DIR || './storage/private');
  const resolve = (key: string) => {
    if (!/^[a-f0-9]{64}$/.test(key)) throw new Error('Invalid storage key');
    return path.join(root, key.slice(0, 2), key);
  };
  return {
    name: 'local',
    async put(key, data) {
      const file = resolve(key);
      await fs.mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
      await fs.writeFile(file, data, { mode: 0o600, flag: 'wx' });
    },
    async get(key) {
      return fs.readFile(resolve(key));
    },
    async remove(key) {
      await fs.rm(resolve(key), { force: true });
    },
  };
}

function supabaseStore(): EvidenceStore {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_EVIDENCE_BUCKET || 'verification-evidence';
  if (!url || !serviceKey) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for STORAGE_PROVIDER=supabase');
  const endpoint = (key: string) => `${url.replace(/\/$/, '')}/storage/v1/object/${bucket}/${key}`;
  const auth = { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey };
  return {
    name: 'supabase',
    async put(key, data) {
      const res = await fetch(endpoint(key), {
        method: 'POST',
        headers: { ...auth, 'Content-Type': 'application/octet-stream', 'x-upsert': 'false' },
        body: new Uint8Array(data),
      });
      if (!res.ok) throw new Error(`Evidence upload failed (${res.status})`);
    },
    async get(key) {
      const res = await fetch(endpoint(key), { headers: auth });
      if (!res.ok) throw new Error(`Evidence download failed (${res.status})`);
      return Buffer.from(await res.arrayBuffer());
    },
    async remove(key) {
      const res = await fetch(`${url.replace(/\/$/, '')}/storage/v1/object/${bucket}`, {
        method: 'DELETE',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefixes: [key] }),
      });
      if (!res.ok && res.status !== 404) throw new Error(`Evidence deletion failed (${res.status})`);
    },
  };
}

export function getEvidenceStore(): EvidenceStore {
  return process.env.STORAGE_PROVIDER === 'supabase' ? supabaseStore() : localStore();
}

export function newStorageKey(): string {
  return crypto.randomBytes(32).toString('hex');
}
