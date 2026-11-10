import type { Metadata } from 'next';
import { ButtonLink, Notice } from '@/components/ui/primitives';
import { AuthShell } from '../shell';
import { verifyEmailToken } from '@/lib/auth/tokens';
import { getDictionary, isLocale, localizePath, type Locale } from '@/lib/i18n';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const l = isLocale(locale) ? locale : 'en';
  return pageMetadata(l, '/auth/verify-email', { title: getDictionary(l).auth.checkEmailTitle, noindex: true });
}

export default async function VerifyEmailPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ token?: string }> }) {
  const locale = (await params).locale as Locale;
  const t = getDictionary(locale);
  const token = (await searchParams).token ?? '';
  const ok = await verifyEmailToken(token);
  return (
    <AuthShell title={ok ? t.auth.verifyEmailSuccess : t.auth.checkEmailTitle}>
      {ok ? (
        <div className="space-y-5">
          <Notice tone="success">{t.auth.verifyEmailSuccess}</Notice>
          <ButtonLink href={localizePath(locale, '/write-review')}>{t.nav.writeReview}</ButtonLink>
        </div>
      ) : (
        <Notice tone="danger">{t.auth.verifyEmailInvalid}</Notice>
      )}
    </AuthShell>
  );
}
