'use client';
import { useId, type ComponentProps, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { buttonClass, cx } from './primitives';

const fieldBase =
  'w-full rounded-[var(--radius-md)] border bg-white px-3.5 text-[0.95rem] text-ink placeholder:text-muted transition-colors focus:outline-none focus:ring-2 focus:ring-accent/40';

export function Field({ label, hint, error, children, required, optionalLabel, id }: {
  label: ReactNode; hint?: ReactNode; error?: string; children: (props: { id: string; describedBy?: string; invalid: boolean }) => ReactNode;
  required?: boolean; optionalLabel?: string; id?: string;
}) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errId = error ? `${fieldId}-err` : undefined;
  return (
    <div className="space-y-1.5">
      <label htmlFor={fieldId} className="flex items-baseline justify-between gap-2 text-sm font-medium text-ink">
        <span>{label}{required && <span aria-hidden="true" className="text-danger"> *</span>}</span>
        {!required && optionalLabel && <span className="text-xs font-normal text-muted-text">{optionalLabel}</span>}
      </label>
      {children({ id: fieldId, describedBy: [hintId, errId].filter(Boolean).join(' ') || undefined, invalid: !!error })}
      {hint && <p id={hintId} className="text-xs text-muted-text">{hint}</p>}
      {error && <p id={errId} className="text-xs font-medium text-danger">{error}</p>}
    </div>
  );
}

export function Input({ invalid, className, ...rest }: ComponentProps<'input'> & { invalid?: boolean }) {
  return <input aria-invalid={invalid || undefined} className={cx(fieldBase, 'h-11', invalid ? 'border-danger' : 'border-line-strong', className)} {...rest} />;
}

export function Textarea({ invalid, className, ...rest }: ComponentProps<'textarea'> & { invalid?: boolean }) {
  return <textarea aria-invalid={invalid || undefined} className={cx(fieldBase, 'min-h-32 py-3 leading-relaxed', invalid ? 'border-danger' : 'border-line-strong', className)} {...rest} />;
}

export function Select({ invalid, className, children, ...rest }: ComponentProps<'select'> & { invalid?: boolean }) {
  return (
    <select aria-invalid={invalid || undefined} className={cx(fieldBase, 'h-11 appearance-none bg-[url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2216%22%20height%3D%2216%22%20fill%3D%22none%22%20stroke%3D%22%235e6772%22%20stroke-width%3D%221.5%22%3E%3Cpath%20d%3D%22m4%206%204%204%204-4%22/%3E%3C/svg%3E")] bg-[length:16px] bg-[right_0.85rem_center] bg-no-repeat pr-10', invalid ? 'border-danger' : 'border-line-strong', className)} {...rest}>
      {children}
    </select>
  );
}

export function SubmitButton({ children, pendingLabel, variant = 'primary', className, ...rest }: ComponentProps<'button'> & { pendingLabel?: string; variant?: 'primary' | 'secondary' | 'danger' }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || rest.disabled} aria-busy={pending || undefined} className={buttonClass(variant, 'md', className)} {...rest}>
      {pending && <span aria-hidden="true" className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" />}
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}

export function Checkbox({ label, error, ...rest }: ComponentProps<'input'> & { label: ReactNode; error?: string }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3 text-sm text-ink">
        <input id={id} type="checkbox" className="mt-0.5 h-4.5 w-4.5 shrink-0 rounded border-line-strong accent-ink" aria-invalid={!!error || undefined} {...rest} />
        <span>{label}</span>
      </label>
      {error && <p className="mt-1 pl-7 text-xs font-medium text-danger">{error}</p>}
    </div>
  );
}
