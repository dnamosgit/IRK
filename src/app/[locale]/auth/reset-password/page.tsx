import type { Metadata } from 'next';
import { ResetPasswordForm } from '@/components/forms/auth-forms';
import { Notice } from '@/components/ui/primitives';
import { AuthShell } from '../shell';
import { getDictionary, isLocale, type Locale } from '@/lib/i18n';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const l = isLocale(locale) ? locale : 'en';
  return pageMetadata(l, '/auth/reset-password', { title: getDictionary(l).auth.resetTitle, noindex: true });
}

export default async function ResetPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ token?: string }> }) {
  const t = getDictionary((await params).locale as Locale);
  const token = (await searchParams).token;
  return (
    <AuthShell title={t.auth.resetTitle}>
      {token ? <ResetPasswordForm token={token} /> : <Notice tone="danger">{t.auth.verifyEmailInvalid}</Notice>}
    </AuthShell>
  );
}
