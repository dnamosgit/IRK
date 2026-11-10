import type { Metadata } from 'next';
import { ForgotPasswordForm } from '@/components/forms/auth-forms';
import { AuthShell } from '../shell';
import { getDictionary, isLocale, type Locale } from '@/lib/i18n';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const l = isLocale(locale) ? locale : 'en';
  return pageMetadata(l, '/auth/forgot-password', { title: getDictionary(l).auth.forgotTitle, noindex: true });
}

export default async function ForgotPage({ params }: { params: Promise<{ locale: string }> }) {
  const t = getDictionary((await params).locale as Locale);
  return <AuthShell title={t.auth.forgotTitle} subtitle={t.auth.forgotBody}><ForgotPasswordForm /></AuthShell>;
}
