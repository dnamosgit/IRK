import 'server-only';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser, type SessionUser } from '@/lib/auth/session';
import { can, isAdmin, type Permission } from '@/lib/rbac';

/**
 * Server-side admin gate. Non-admins get a 404 (we do not reveal that the
 * admin area exists); admins lacking the specific permission are rejected.
 */
export async function requireAdmin(permission: Permission = 'overview'): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/en/auth/sign-in?next=/admin');
  if (!isAdmin(user.roles)) notFound();
  if (!can(user.roles, permission)) throw new ForbiddenError();
  return user;
}

export class ForbiddenError extends Error {
  constructor() {
    super('forbidden');
  }
}
