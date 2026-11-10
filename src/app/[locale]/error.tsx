'use client';
import { useEffect } from 'react';
import { useI18n } from '@/components/i18n-provider';
import { buttonClass } from '@/components/ui/primitives';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t, href } = useI18n();
  useEffect(() => console.error(error), [error]);
  return (
    <div className="container-x flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <p className="eyebrow">500</p>
      <h1 className="mt-3 text-4xl font-semibold">{t.errors.genericTitle}</h1>
      <p className="mt-3 max-w-md text-muted-text">{t.errors.genericBody}</p>
      {error.digest && <p className="mt-2 font-mono text-xs text-muted-text">{error.digest}</p>}
      <div className="mt-8 flex gap-3">
        <button type="button" onClick={reset} className={buttonClass('primary')}>{t.common.retry}</button>
        <a href={href('/')} className={buttonClass('secondary')}>{t.errors.goHome}</a>
      </div>
    </div>
  );
}
