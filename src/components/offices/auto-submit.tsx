'use client';
import type { ReactNode } from 'react';

/** GET filter form that submits on change (works without JS via the button). */
export function AutoSubmitForm({ children, className, action }: { children: ReactNode; className?: string; action: string }) {
  return (
    <form
      method="get"
      action={action}
      className={className}
      onChange={(e) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'SELECT' || (target as HTMLInputElement).type === 'checkbox') e.currentTarget.requestSubmit();
      }}
    >
      {children}
    </form>
  );
}
