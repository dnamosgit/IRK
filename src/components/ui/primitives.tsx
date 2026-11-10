import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';
import { Alert as AlertIcon, Check, Info } from './icons';

export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'light' | 'danger' | 'outline-light';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-ink text-white hover:bg-charcoal shadow-[0_1px_0_rgb(255_255_255/0.08)_inset]',
  secondary: 'bg-white text-ink border border-line-strong hover:border-ink/40 hover:bg-white',
  ghost: 'text-ink hover:bg-ink/5',
  light: 'bg-white text-ink hover:bg-paper',
  'outline-light': 'border border-white/35 text-white hover:bg-white/10 hover:border-white/60',
  danger: 'bg-danger text-white hover:bg-[#8c2f28]',
};
const SIZES: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-sm gap-1.5',
  md: 'h-11 px-5 text-[0.95rem] gap-2',
  lg: 'h-13 px-7 text-base gap-2.5',
};

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', extra?: string) {
  return cx(
    'inline-flex items-center justify-center rounded-[var(--radius-md)] font-medium whitespace-nowrap',
    'transition-[background-color,border-color,color,transform] duration-200 active:translate-y-px',
    'disabled:opacity-50 disabled:pointer-events-none',
    VARIANTS[variant],
    SIZES[size],
    extra,
  );
}

export function Button({ variant, size, className, ...rest }: ComponentProps<'button'> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...rest} />;
}

export function ButtonLink({ variant, size, className, ...rest }: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...rest} />;
}

export function Badge({ tone = 'neutral', children, className, title }: { tone?: 'neutral' | 'verified' | 'accent' | 'warning' | 'danger' | 'sample' | 'dark'; children: ReactNode; className?: string; title?: string }) {
  const tones = {
    neutral: 'bg-mist text-muted-text',
    verified: 'bg-[#e6f3ee] text-verified-text',
    accent: 'bg-[#e8eef4] text-accent-text',
    warning: 'bg-warning-bg text-warning',
    danger: 'bg-danger-bg text-danger',
    sample: 'bg-[#f3ecdc] text-[#6e4f12] ring-1 ring-inset ring-[#e2d3ad]',
    dark: 'bg-white/10 text-white/85 ring-1 ring-inset ring-white/15',
  };
  return (
    <span title={title} className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium', tones[tone], className)}>
      {children}
    </span>
  );
}

export function Notice({ tone = 'info', title, children, className }: { tone?: 'info' | 'warning' | 'success' | 'danger'; title?: ReactNode; children?: ReactNode; className?: string }) {
  const tones = {
    info: 'bg-[#eef3f7] border-[#d4e0ea] text-ink',
    warning: 'bg-warning-bg border-[#efdcb5] text-[#5a3d0c]',
    success: 'bg-[#e9f5f0] border-[#cbe6da] text-[#174f3d]',
    danger: 'bg-danger-bg border-[#f1cdc9] text-[#6d231e]',
  };
  const Icon = tone === 'success' ? Check : tone === 'info' ? Info : AlertIcon;
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={cx('flex gap-3 rounded-[var(--radius-md)] border px-4 py-3 text-sm', tones[tone], className)}>
      <Icon size={18} className="mt-0.5 shrink-0 opacity-80" />
      <div className="min-w-0 space-y-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="leading-relaxed">{children}</div>}
      </div>
    </div>
  );
}

export function SectionHeading({ eyebrow, title, body, align = 'left', dark = false, as: As = 'h2' }: { eyebrow?: string; title: string; body?: string; align?: 'left' | 'center'; dark?: boolean; as?: 'h1' | 'h2' }) {
  return (
    <div className={cx('max-w-2xl', align === 'center' && 'mx-auto text-center')}>
      {eyebrow && <p className={cx('eyebrow mb-3', dark && '!text-[#a9c0d6]')}>{eyebrow}</p>}
      <As className={cx('text-3xl font-semibold md:text-[2.6rem]', dark ? 'text-white' : 'text-ink')}>{title}</As>
      {body && <p className={cx('mt-4 text-[1.05rem] leading-relaxed', dark ? 'text-white/70' : 'text-muted-text')}>{body}</p>}
    </div>
  );
}

export function PageHeader({ eyebrow, title, body, children }: { eyebrow?: string; title: string; body?: string; children?: ReactNode }) {
  return (
    <header className="border-b border-line bg-white">
      <div className="container-x py-12 md:py-16">
        {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
        <h1 className="text-[2rem] font-semibold md:text-5xl">{title}</h1>
        {body && <p className="mt-4 max-w-2xl text-[1.05rem] text-muted-text">{body}</p>}
        {children}
      </div>
    </header>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx('rounded-[var(--radius-lg)] border border-line bg-white', className)}>{children}</div>;
}

export function EmptyState({ icon, title, body, action }: { icon?: ReactNode; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-dashed border-line-strong bg-white/60 px-6 py-14 text-center">
      {icon && <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-mist text-accent-text">{icon}</div>}
      <p className="text-lg font-semibold">{title}</p>
      {body && <p className="mx-auto mt-2 max-w-md text-sm text-muted-text">{body}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cx('skeleton', className)} />;
}

export function ExternalLink({ href, children, className, label }: { href: string; children: ReactNode; className?: string; label: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
      <span className="sr-only"> {label}</span>
    </a>
  );
}
