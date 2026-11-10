// Role-based access control for /admin. Pure module (no server imports) so it
// can be unit tested; enforcement helpers live in lib/admin-guard.ts.

export const ADMIN_ROLES = ['super_admin', 'moderator', 'verification_reviewer', 'data_admin'] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const PERMISSIONS = {
  overview: ['super_admin', 'moderator', 'verification_reviewer', 'data_admin'],
  reviews: ['super_admin', 'moderator'],
  reports: ['super_admin', 'moderator'],
  legal: ['super_admin', 'moderator'],
  // Verification evidence is deliberately NOT available to moderators.
  verifications: ['super_admin', 'verification_reviewer'],
  offices: ['super_admin', 'data_admin'],
  translations: ['super_admin', 'moderator', 'data_admin'],
  analytics: ['super_admin', 'moderator', 'data_admin'],
  audit: ['super_admin'],
  team: ['super_admin'],
} as const satisfies Record<string, readonly AdminRole[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(roles: readonly string[], permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly string[]).some((r) => roles.includes(r));
}

export function isAdmin(roles: readonly string[]): boolean {
  return roles.some((r) => (ADMIN_ROLES as readonly string[]).includes(r));
}
