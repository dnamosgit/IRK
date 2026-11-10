import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { SignUpForm } from '@/components/forms/auth-forms';
import { AuthShell } from '../shell';
import { getCurrentUser } from '@/lib/auth/session';
import { getDictionary, isLocale, localizePath, type Locale } from '@/lib/i18n';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const l = isLocale(locale) ? locale : 'en';
  return pageMetadata(l, '/auth/sign-up', { title: getDictionary(l).auth.signUp, noindex: true });
}

export default async function SignUpPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ next?: string }> }) {
  const locale = (await params).locale as Locale;
  const n = (await searchParams).next;
  const next = n && n.startsWith('/') && !n.startsWith('//') ? n : undefined;
  if (await getCurrentUser()) redirect(localizePath(locale, '/account'));
  const t = getDictionary(locale);
  return (
    <AuthShell title={t.auth.signUpTitle} subtitle={t.auth.signUpSubtitle}
      footer={<>{t.auth.haveAccount} <Link className="font-medium text-accent-text hover:underline" href={localizePath(locale, '/auth/sign-in')}>{t.auth.signIn}</Link></>}>
      <SignUpForm next={next} />
    </AuthShell>
  );
}
