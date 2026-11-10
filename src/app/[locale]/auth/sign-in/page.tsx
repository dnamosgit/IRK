import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { SignInForm } from '@/components/forms/auth-forms';
import { Notice } from '@/components/ui/primitives';
import { AuthShell } from '../shell';
import { getCurrentUser } from '@/lib/auth/session';
import { getDictionary, isLocale, localizePath, type Locale } from '@/lib/i18n';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const l = isLocale(locale) ? locale : 'en';
  return pageMetadata(l, '/auth/sign-in', { title: getDictionary(l).auth.signIn, noindex: true });
}

const safe = (n?: string) => (n && n.startsWith('/') && !n.startsWith('//') ? n : undefined);

export default async function SignInPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ next?: string; reset?: string }> }) {
  const locale = (await params).locale as Locale;
  const sp = await searchParams;
  const next = safe(sp.next);
  if (await getCurrentUser()) redirect(next ?? localizePath(locale, '/account'));
  const t = getDictionary(locale);
  return (
    <AuthShell title={t.auth.signInTitle} subtitle={t.auth.signInSubtitle}
      footer={<>{t.auth.noAccount} <Link className="font-medium text-accent-text hover:underline" href={`${localizePath(locale, '/auth/sign-up')}${next ? `?next=${encodeURIComponent(next)}` : ''}`}>{t.auth.createOne}</Link></>}>
      {sp.reset && <Notice tone="success" className="mb-5">{t.auth.resetDone}</Notice>}
      <SignInForm next={next} />
    </AuthShell>
  );
}
