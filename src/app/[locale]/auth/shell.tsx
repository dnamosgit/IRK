import type { ReactNode } from 'react';
import { LogoMark } from '@/components/layout/logo';

export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="container-x flex justify-center py-14 md:py-20">
      <div className="w-full max-w-md">
        <LogoMark className="h-10 w-10 text-ink" />
        <h1 className="mt-6 text-3xl font-semibold">{title}</h1>
        {subtitle && <p className="mt-2 text-muted-text">{subtitle}</p>}
        <div className="mt-8 rounded-[var(--radius-lg)] border border-line bg-white p-6 shadow-[var(--shadow-soft)] md:p-8">{children}</div>
        {footer && <div className="mt-6 text-center text-sm text-muted-text">{footer}</div>}
      </div>
    </div>
  );
}
