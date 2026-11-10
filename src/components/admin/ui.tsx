import type { ReactNode } from 'react';
import { cx } from '@/components/ui/primitives';

export function AdminHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <h1 className="text-2xl font-semibold md:text-3xl">{title}</h1>
      {children}
    </div>
  );
}

export function Panel({ title, children, className }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={cx('rounded-[var(--radius-lg)] border border-line bg-white p-5', className)}>
      {title && <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-text">{title}</h2>}
      {children}
    </section>
  );
}

export function Table({ head, children }: { head: ReactNode[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-line bg-white">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-line bg-paper text-xs uppercase tracking-wide text-muted-text">
          <tr>{head.map((h, i) => <th key={i} scope="col" className="px-4 py-3 font-medium">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  );
}

export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={cx('px-4 py-3 align-top', className)}>{children}</td>;
}

export function Tabs({ items, current }: { items: { href: string; label: string; key: string; count?: number }[]; current: string }) {
  return (
    <nav className="mb-6 flex flex-wrap gap-1 border-b border-line">
      {items.map((i) => (
        <a key={i.key} href={i.href} aria-current={i.key === current ? 'page' : undefined}
          className={cx('-mb-px border-b-2 px-3 py-2 text-sm', i.key === current ? 'border-ink font-medium text-ink' : 'border-transparent text-muted-text hover:text-ink')}>
          {i.label}{i.count !== undefined && <span className="ml-1.5 rounded-full bg-mist px-1.5 text-xs">{i.count}</span>}
        </a>
      ))}
    </nav>
  );
}

export const inputCls = 'h-10 w-full rounded-[var(--radius-md)] border border-line-strong bg-white px-3 text-sm';
export const textareaCls = 'w-full rounded-[var(--radius-md)] border border-line-strong bg-white px-3 py-2 text-sm';
