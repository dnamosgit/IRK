'use client';
import { useI18n } from '@/components/i18n-provider';
import { buttonClass } from '@/components/ui/primitives';

export function NotFoundView() {
  const { t, href } = useI18n();
  return (
    <div className="container-x flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <p className="eyebrow">404</p>
      <h1 className="mt-3 text-4xl font-semibold">{t.errors.notFoundTitle}</h1>
      <p className="mt-3 max-w-md text-muted-text">{t.errors.notFoundBody}</p>
      <div className="mt-8 flex gap-3">
        <a href={href('/')} className={buttonClass('primary')}>{t.errors.goHome}</a>
        <a href={href('/offices')} className={buttonClass('secondary')}>{t.nav.offices}</a>
      </div>
    </div>
  );
}
