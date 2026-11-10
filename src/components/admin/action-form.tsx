'use client';
import { useActionState, type ReactNode } from 'react';
import { initialState, type ActionState } from '@/lib/actions/state';

type Action = (state: ActionState, fd: FormData) => Promise<ActionState>;

/** Wraps an admin server action and shows its result inline. */
export function ActionForm({ action, children, className, resetOnSuccess = false }: { action: Action; children: ReactNode; className?: string; resetOnSuccess?: boolean }) {
  const [state, formAction] = useActionState(action, initialState);
  return (
    <form action={formAction} className={className} key={resetOnSuccess && state.ok ? String(Date.now()) : undefined}>
      {children}
      {state.error && <p role="alert" className="mt-2 text-sm text-danger">{state.error}</p>}
      {state.ok && state.message && <p role="status" className="mt-2 text-sm text-verified-text">{state.message}</p>}
    </form>
  );
}
