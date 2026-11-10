'use client';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { LOCALES, LOCALE_LABELS } from '@/lib/i18n/config';
import { switchLocalePath } from '@/lib/i18n/paths';
import { useI18n } from '@/components/i18n-provider';
import { cx } from '@/components/ui/primitives';

// "EN | ES | 한국어" — text labels, never flags. Preserves the current page and query.
function Inner({ tone }: { tone: 'light' | 'dark' }) {
  const { locale, t } = useI18n();
  const pathname = usePathname();
  const search = useSearchParams()?.toString();
  return (
    <nav aria-label={t.nav.language} className="flex items-center text-[0.8rem] font-medium">
      {LOCALES.map((l, i) => (
        <span key={l} className="flex items-center">
          {i > 0 && <span aria-hidden="true" className={cx('px-1.5', tone === 'dark' ? 'text-white/30' : 'text-line-strong')}>|</span>}
          <Link
            href={switchLocalePath(pathname, l, search ? `?${search}` : '')}
            hrefLang={LOCALE_LABELS[l].htmlLang}
            lang={LOCALE_LABELS[l].htmlLang}
            aria-current={l === locale ? 'true' : undefined}
            aria-label={LOCALE_LABELS[l].native}
            scroll={false}
            className={cx(
              'whitespace-nowrap rounded px-1 py-1 transition-colors',
              l === locale
                ? tone === 'dark' ? 'text-white' : 'text-ink'
                : tone === 'dark' ? 'text-white/55 hover:text-white' : 'text-muted-text hover:text-ink',
            )}
          >
            {LOCALE_LABELS[l].short}
          </Link>
        </span>
      ))}
    </nav>
  );
}

export function LanguageSwitcher({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  return (
    <Suspense fallback={<span className="w-[120px]" />}>
      <Inner tone={tone} />
    </Suspense>
  );
}
