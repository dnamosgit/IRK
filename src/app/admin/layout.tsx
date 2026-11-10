import '../globals.css';
import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { LogoMark } from '@/components/layout/logo';
import { getCurrentUser } from '@/lib/auth/session';
import { can, isAdmin, type Permission } from '@/lib/rbac';
import { adminDict } from '@/lib/admin-i18n';
import { LOCALE_LABELS } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Administration — Immigration Review Korea', robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/en/auth/sign-in?next=/admin');
  if (!isAdmin(user.roles)) notFound();
  const { locale, t } = await adminDict();
  const items: { href: string; label: string; perm: Permission }[] = [
    { href: '/admin', label: t.admin.overview, perm: 'overview' },
    { href: '/admin/reviews', label: t.admin.reviews, perm: 'reviews' },
    { href: '/admin/verifications', label: t.admin.verifications, perm: 'verifications' },
    { href: '/admin/reports', label: t.admin.reports, perm: 'reports' },
    { href: '/admin/translations', label: t.admin.translations, perm: 'translations' },
    { href: '/admin/offices', label: t.admin.offices, perm: 'offices' },
    { href: '/admin/analytics', label: t.admin.analytics, perm: 'analytics' },
    { href: '/admin/audit', label: t.admin.audit, perm: 'audit' },
    { href: '/admin/team', label: t.admin.team, perm: 'team' },
  ];
  return (
    <html lang={LOCALE_LABELS[locale].htmlLang}>
      <body className="min-h-dvh bg-paper">
        <div className="flex min-h-dvh flex-col lg:flex-row">
          <aside className="border-b border-white/10 bg-ink text-white lg:sticky lg:top-0 lg:h-dvh lg:w-64 lg:shrink-0 lg:border-b-0">
            <div className="flex items-center gap-2.5 px-5 py-5">
              <LogoMark className="h-8 w-8 text-white [--logo-fg:#101B2A]" />
              <span className="text-sm font-semibold">{t.admin.title}</span>
            </div>
            <nav aria-label={t.admin.title} className="overflow-x-auto px-3 pb-3 lg:pb-0">
              <ul className="flex gap-1 lg:flex-col">
                {items.filter((i) => can(user.roles, i.perm)).map((i) => (
                  <li key={i.href}><Link href={i.href} className="block whitespace-nowrap rounded-md px-3 py-2 text-sm text-white/75 hover:bg-white/10 hover:text-white">{i.label}</Link></li>
                ))}
              </ul>
            </nav>
            <div className="hidden px-5 py-6 text-xs text-white/50 lg:block">
              <p className="truncate">{user.displayName}</p>
              <p className="mt-1">{user.roles.map((r) => (t.admin.roles as Record<string, string>)[r] ?? r).join(', ')}</p>
              <Link href={`/${locale}`} className="mt-4 inline-block text-white/70 hover:text-white">← {t.admin.backToSite}</Link>
            </div>
          </aside>
          <main className="min-w-0 flex-1 px-5 py-8 lg:px-10">{children}</main>
        </div>
      </body>
    </html>
  );
}
