import '../globals.css';
import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { I18nProvider } from '@/components/i18n-provider';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { RevealObserver } from '@/components/home/hero-motion';
import { getCurrentUser } from '@/lib/auth/session';
import { signOutAction } from '@/lib/actions/auth';
import { config } from '@/lib/config';
import { isAdmin } from '@/lib/rbac';
import { getDictionary, isLocale, LOCALES, LOCALE_LABELS } from '@/lib/i18n';

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export const metadata: Metadata = {
  metadataBase: new URL(config.siteUrl),
  applicationName: 'Immigration Review Korea',
  icons: { icon: '/icon.svg' },
};

export const viewport: Viewport = {
  themeColor: '#101B2A',
  width: 'device-width',
  initialScale: 1,
};

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const user = await getCurrentUser().catch(() => null);

  return (
    <html lang={LOCALE_LABELS[locale].htmlLang} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body className="flex min-h-dvh flex-col">
        <a href="#main" className="sr-only z-[100] rounded-md bg-ink px-4 py-2 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
          {t.nav.skipToContent}
        </a>
        <I18nProvider locale={locale} dictionary={t}>
          <Header user={user ? { displayName: user.displayName, isAdmin: isAdmin(user.roles) } : null} signOutAction={signOutAction} />
          <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
            {children}
          </main>
          <Footer locale={locale} />
          <RevealObserver />
        </I18nProvider>
      </body>
    </html>
  );
}
