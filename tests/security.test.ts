import { describe, expect, it } from 'vitest';
import crypto from 'node:crypto';
import { decrypt, encrypt } from '@/lib/storage/crypto';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { can, isAdmin } from '@/lib/rbac';
import { isValidVisitMonth } from '@/lib/validation';

describe('evidence encryption', () => {
  const key = crypto.randomBytes(32);
  it('round-trips and binds ciphertext to its storage key', () => {
    const data = Buffer.from('private evidence');
    const env = encrypt(data, key, 'key-a');
    expect(env.includes(data)).toBe(false);
    expect(decrypt(env, key, 'key-a').toString()).toBe('private evidence');
    expect(() => decrypt(env, key, 'key-b')).toThrow();
    expect(() => decrypt(env, crypto.randomBytes(32), 'key-a')).toThrow();
  });
  it('detects tampering', () => {
    const env = encrypt(Buffer.from('x'.repeat(64)), key, 'k');
    env[env.length - 1] ^= 1;
    expect(() => decrypt(env, key, 'k')).toThrow();
  });
});

describe('passwords', () => {
  it('hashes with scrypt and verifies', async () => {
    const h = await hashPassword('correct horse battery staple');
    expect(h.startsWith('scrypt$')).toBe(true);
    expect(await verifyPassword('correct horse battery staple', h)).toBe(true);
    expect(await verifyPassword('wrong', h)).toBe(false);
  });
});

describe('role-based access', () => {
  it('keeps verification evidence away from moderators', () => {
    expect(can(['moderator'], 'reviews')).toBe(true);
    expect(can(['moderator'], 'verifications')).toBe(false);
    expect(can(['verification_reviewer'], 'verifications')).toBe(true);
    expect(can(['verification_reviewer'], 'reviews')).toBe(false);
    expect(can(['data_admin'], 'offices')).toBe(true);
    expect(can(['data_admin'], 'team')).toBe(false);
    expect(can(['super_admin'], 'audit')).toBe(true);
    expect(isAdmin([])).toBe(false);
  });
});

describe('visit month validation', () => {
  const now = new Date(Date.UTC(2026, 10, 10));
  it('accepts the last 24 months only', () => {
    expect(isValidVisitMonth('2026-11', now)).toBe(true);
    expect(isValidVisitMonth('2024-11', now)).toBe(true);
    expect(isValidVisitMonth('2024-10', now)).toBe(false);
    expect(isValidVisitMonth('2026-12', now)).toBe(false);
    expect(isValidVisitMonth('2026-13', now)).toBe(false);
  });
});
