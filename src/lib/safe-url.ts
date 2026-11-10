// URL safety helpers. Pure (no I/O) so they are unit-testable and usable anywhere.

/** Returns the URL only if it is an absolute http(s) URL; otherwise null.
 *  Blocks javascript:, data:, vbscript: and other script-capable schemes. */
export function httpUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const u = new URL(value.trim());
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : null;
  } catch {
    return null;
  }
}

/** Official resources may also be phone links. */
export function httpOrTelUrl(value: string | null | undefined): string | null {
  if (value && /^tel:[0-9+\-]{3,20}$/.test(value.trim())) return value.trim();
  return httpUrl(value);
}

/** Same-site relative path for post-login redirects. Rejects absolute URLs,
 *  protocol-relative (//host), backslash tricks (/\host) and control chars. */
export function safeRedirectPath(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 500) return null;
  if (!value.startsWith('/') || value.startsWith('//')) return null;
  // eslint-disable-next-line no-control-regex
  if (/[\\\u0000-\u001f\u007f]/.test(value)) return null;
  return value;
}

/** Serialise JSON for embedding in a <script> tag without allowing "</script>" breakouts. */
export function jsonForScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}
