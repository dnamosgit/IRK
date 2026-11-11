import '../globals.css';
import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { I18nProvider } from '@/components/i18n-provider';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { RevealObserver } from '@/components/home/hero-motion';
import { getCurrentUser } from '@/lib/auth/session';
import { checkDatabase } from '@/lib/db';
import { UnavailableView } from '@/components/layout/status-views';
import { signOutAction } from '@/lib/actions/auth';
import { config } from '@/lib/config';
import { isAdmin } from '@/lib/rbac';
import { getDictionary, isLocale, LOCALE_LABELS } from '@/lib/i18n';

// Every page depends on the signed-in user and live database content, so
// nothing is pre-rendered at build time (builds need no database access).
export const dynamic = 'force-dynamic';

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
  // One cheap readiness query per request. If the database is down or not yet
  // configured, every page shows an honest "temporarily unavailable" notice
  // instead of a generic error (the cause is logged and reported by /api/health).
  const db = await checkDatabase();
  const user = db.ok ? await getCurrentUser().catch(() => null) : null;

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
            {db.ok ? children : <UnavailableView reason={db.reason} showHint={!config.isProduction} />}
          </main>
          <Footer locale={locale} />
          <RevealObserver />
        </I18nProvider>
      </body>
    </html>
  );
}
