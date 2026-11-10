import Link from 'next/link';
import type { Metadata } from 'next';
import { ReviewWizard } from '@/components/forms/review-wizard';
import { ResendVerificationForm } from '@/components/forms/auth-forms';
import { Notice, buttonClass } from '@/components/ui/primitives';
import { Lock } from '@/components/ui/icons';
import { getCurrentUser } from '@/lib/auth/session';
import { monthOptions, wizardOffices } from '@/lib/queries/wizard';
import { getDictionary, isLocale, localizePath, type Locale } from '@/lib/i18n';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const l = isLocale(locale) ? locale : 'en';
  const t = getDictionary(l);
  return pageMetadata(l, '/write-review', { title: t.write.title, description: t.write.subtitle, noindex: true });
}

export default async function WriteReviewPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ office?: string }> }) {
  const locale = (await params).locale as Locale;
  const t = getDictionary(locale);
  const office = (await searchParams).office;
  const user = await getCurrentUser();
  const self = `${localizePath(locale, '/write-review')}${office ? `?office=${encodeURIComponent(office)}` : ''}`;

  return (
    <div className="container-x max-w-3xl py-12 md:py-16">
      <p className="eyebrow">{t.nav.writeReview}</p>
      <h1 className="mt-3 text-4xl font-semibold md:text-5xl">{t.write.title}</h1>
      <p className="mt-3 text-lg text-muted-text">{t.write.subtitle}</p>
      <div className="mt-10">
        {!user ? (
          <div className="rounded-[var(--radius-lg)] border border-line bg-white p-8 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-mist text-accent-text"><Lock size={22} /></span>
            <p className="mx-auto mt-5 max-w-md text-[1.05rem]">{t.write.signInRequired}</p>
            <p className="mx-auto mt-3 max-w-md text-sm text-muted-text">{t.auth.anonymityNote}</p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link href={`${localizePath(locale, '/auth/sign-up')}?next=${encodeURIComponent(self)}`} className={buttonClass('primary')}>{t.auth.createOne}</Link>
              <Link href={`${localizePath(locale, '/auth/sign-in')}?next=${encodeURIComponent(self)}`} className={buttonClass('secondary')}>{t.auth.signIn}</Link>
            </div>
          </div>
        ) : !user.emailVerified ? (
          <Notice tone="warning" title={t.write.emailVerificationRequired}>
            <p className="mb-3">{t.auth.checkEmailBody}</p>
            <ResendVerificationForm />
          </Notice>
        ) : (
          <ReviewWizard offices={await wizardOffices(locale)} months={monthOptions(locale)} preselectedSlug={office} />
        )}
      </div>
    </div>
  );
}
