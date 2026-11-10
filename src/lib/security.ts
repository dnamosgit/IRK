import 'server-only';
import crypto from 'node:crypto';
import { headers } from 'next/headers';

function secret(): string {
  const s = process.env.APP_SECRET;
  if (!s || s.length < 32) {
    if (process.env.NODE_ENV === 'production') throw new Error('APP_SECRET must be at least 32 characters');
    return 'insecure-development-secret-insecure-development';
  }
  return s;
}

export function sha256(value: string | Buffer): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

/** Keyed hash — lets us rate-limit and spot abuse without storing raw IPs. */
export function hmac(value: string): string {
  return crypto.createHmac('sha256', secret()).update(value).digest('hex');
}

export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('base64url');
}

/** Human-friendly reference such as RPT-7KQ2-M9XD (no ambiguous characters). */
export function referenceCode(prefix: string): string {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(8);
  let out = '';
  for (let i = 0; i < 8; i++) out += alphabet[bytes[i] % alphabet.length];
  return `${prefix}-${out.slice(0, 4)}-${out.slice(4)}`;
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  // Prefer headers set by the hosting platform (clients cannot spoof them).
  // x-forwarded-for is only trustworthy when the edge proxy overwrites it (Vercel
  // and Cloudflare do); when self-hosting, configure the proxy to do the same.
  return (
    h.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() ||
    h.get('cf-connecting-ip') ||
    h.get('x-real-ip') ||
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    '0.0.0.0'
  );
}

export async function clientIpHash(): Promise<string> {
  return hmac(await clientIp());
}

/** Reject cross-site POSTs to route handlers (server actions verify Origin themselves). */
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
