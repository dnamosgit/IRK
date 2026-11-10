import Link from 'next/link';
import { AdminHeader } from '@/components/admin/ui';
import { requireAdmin } from '@/lib/admin-guard';
import { adminDict } from '@/lib/admin-i18n';
import { appDb } from '@/lib/db';
import { can } from '@/lib/rbac';

export default async function AdminOverview() {
  const user = await requireAdmin('overview');
  const { t } = await adminDict();
  const s = (await appDb.query(`SELECT
      (SELECT count(*) FROM private.users)::int AS users,
      (SELECT count(*) FROM public.reviews WHERE status = 'approved' AND NOT is_sample)::int AS published,
      (SELECT count(*) FROM public.reviews WHERE status IN ('pending','needs_clarification','legal_review'))::int AS pending,
      (SELECT count(*) FROM private.verification_events WHERE status = 'submitted')::int AS verifications,
      (SELECT count(*) FROM private.review_reports WHERE status = 'open')::int AS reports,
      (SELECT count(*) FROM private.appeals WHERE status = 'open')::int AS appeals,
      (SELECT count(*) FROM private.legal_requests WHERE status IN ('open','in_review'))::int AS legal,
      (SELECT count(*) FROM public.offices WHERE is_active)::int AS offices,
      (SELECT count(*) FROM public.review_translations WHERE status IN ('pending','failed','needs_human_review'))::int
        + (SELECT count(*) FROM private.translation_reports WHERE status = 'open')::int AS translations`)).rows[0];
  const cards = [
    { k: 'users', href: null, perm: 'team' },
    { k: 'published', href: '/admin/reviews?status=approved', perm: 'reviews' },
    { k: 'pending', href: '/admin/reviews', perm: 'reviews' },
    { k: 'verifications', href: '/admin/verifications', perm: 'verifications' },
    { k: 'reports', href: '/admin/reports', perm: 'reports' },
    { k: 'appeals', href: '/admin/reports?tab=appeals', perm: 'reports' },
    { k: 'legal', href: '/admin/reports?tab=legal', perm: 'legal' },
    { k: 'offices', href: '/admin/offices', perm: 'offices' },
    { k: 'translations', href: '/admin/translations', perm: 'translations' },
  ] as const;
  return (
    <>
      <AdminHeader title={t.admin.overview} />
      <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((c) => {
          const allowed = can(user.roles, c.perm) || c.k === 'users';
          const body = (
            <div className="rounded-[var(--radius-lg)] border border-line bg-white p-5 transition-shadow hover:shadow-[var(--shadow-soft)]">
              <dt className="text-sm text-muted-text">{t.admin.stats[c.k]}</dt>
              <dd className="mt-1 text-3xl font-semibold tabular-nums">{s[c.k]}</dd>
            </div>
          );
          return <div key={c.k}>{c.href && allowed ? <Link href={c.href}>{body}</Link> : body}</div>;
        })}
      </dl>
    </>
  );
}
