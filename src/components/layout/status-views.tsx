'use client';
import { useI18n } from '@/components/i18n-provider';
import { buttonClass } from '@/components/ui/primitives';

export function UnavailableView({ reason, showHint }: { reason: string; showHint: boolean }) {
  const { t } = useI18n();
  return (
    <div className="container-x flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <p className="eyebrow">503</p>
      <h1 className="mt-3 text-4xl font-semibold">{t.errors.unavailableTitle}</h1>
      <p className="mt-3 max-w-md text-muted-text">{t.errors.unavailableBody}</p>
      {showHint && (
        <p className="mt-6 max-w-lg rounded-[var(--radius-md)] bg-warning-bg px-4 py-3 text-left text-sm text-warning">
          Development hint: database check failed (<code>{reason}</code>). Open <a className="underline" href="/api/health">/api/health</a> for details.
        </p>
      )}
      <a href="" className={`${buttonClass('primary')} mt-8`}>{t.common.retry}</a>
    </div>
  );
}

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
