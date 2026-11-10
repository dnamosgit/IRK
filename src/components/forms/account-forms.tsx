'use client';
import { useActionState, useState } from 'react';
import { useI18n } from '@/components/i18n-provider';
import { Field, Input, SubmitButton, Textarea } from '@/components/ui/form';
import { Notice, cx } from '@/components/ui/primitives';
import { initialState, type ActionState } from '@/lib/actions/state';
import { changePasswordAction, deleteAccountAction, updateDisplayNameAction } from '@/lib/actions/account';
import { deleteOwnEvidenceAction, submitVerificationAction } from '@/lib/actions/verification';

function Msg({ state }: { state: ActionState }) {
  if (state.ok && state.message) return <p role="status" className="text-sm text-verified-text">{state.message}</p>;
  if (state.error) return <p role="alert" className="text-sm text-danger">{state.error}</p>;
  return null;
}

export function DisplayNameForm({ current, generated }: { current: string; generated: boolean }) {
  const { t, locale } = useI18n();
  const [state, action] = useActionState(updateDisplayNameAction, initialState);
  return (
    <div className="space-y-3">
      <form action={action} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <input type="hidden" name="locale" value={locale} />
        <div className="flex-1">
          <Field label={t.account.displayName} hint={generated ? `${t.account.displayNameHint} (${t.account.generated})` : t.account.displayNameHint} error={state.fieldErrors?.displayName}>
            {(p) => <Input id={p.id} name="displayName" defaultValue={current} minLength={3} maxLength={40} invalid={p.invalid} aria-describedby={p.describedBy} />}
          </Field>
        </div>
        <SubmitButton variant="secondary" className="sm:mb-[22px]">{t.common.save}</SubmitButton>
      </form>
      <form action={action}>
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="regenerate" value="1" />
        <button type="submit" className="text-sm text-accent-text hover:underline">{t.account.regenerate}</button>
      </form>
      <Msg state={state} />
    </div>
  );
}

export function ChangePasswordForm() {
  const { t, locale } = useI18n();
  const [state, action] = useActionState(changePasswordAction, initialState);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t.account.currentPassword} error={state.fieldErrors?.current}>
          {(p) => <Input id={p.id} type="password" name="current" required autoComplete="current-password" invalid={p.invalid} />}
        </Field>
        <Field label={t.auth.newPassword} hint={t.auth.passwordHint} error={state.fieldErrors?.password}>
          {(p) => <Input id={p.id} type="password" name="password" required minLength={10} autoComplete="new-password" invalid={p.invalid} aria-describedby={p.describedBy} />}
        </Field>
      </div>
      <div className="flex items-center gap-4"><SubmitButton variant="secondary">{t.account.changePassword}</SubmitButton><Msg state={state} /></div>
    </form>
  );
}

export function DeleteAccountForm() {
  const { t, locale } = useI18n();
  const [state, action] = useActionState(deleteAccountAction, initialState);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <fieldset className="space-y-2">
        <legend className="sr-only">{t.account.deleteTitle}</legend>
        <label className="flex gap-3 text-sm"><input type="radio" name="mode" value="keep" defaultChecked className="mt-1 accent-ink" />{t.account.deleteKeep}</label>
        <label className="flex gap-3 text-sm"><input type="radio" name="mode" value="all" className="mt-1 accent-ink" />{t.account.deleteAll}</label>
      </fieldset>
      <Field label={t.account.deleteConfirm} error={state.fieldErrors?.confirm}>
        {(p) => <Input id={p.id} name="confirm" autoComplete="off" className="max-w-xs" invalid={p.invalid} />}
      </Field>
      <SubmitButton variant="danger">{t.account.deleteButton}</SubmitButton>
      <Msg state={state} />
    </form>
  );
}

export function DeleteEvidenceButton({ eventId }: { eventId: string }) {
  const { t, locale } = useI18n();
  const [state, action] = useActionState(deleteOwnEvidenceAction, initialState);
  if (state.ok) return <p role="status" className="text-xs text-verified-text">{state.message}</p>;
  return (
    <form action={action}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="eventId" value={eventId} />
      <button type="submit" className="text-xs text-danger hover:underline">{t.verify.deleteEvidence}</button>
    </form>
  );
}

const METHODS = ['appointment_confirmation', 'redacted_evidence', 'manual_alternative'] as const;

export function VerificationForm({ reviewId, retentionDays }: { reviewId: string; retentionDays: number }) {
  const { t, locale } = useI18n();
  const [state, action] = useActionState(submitVerificationAction, initialState);
  const [method, setMethod] = useState<(typeof METHODS)[number]>('appointment_confirmation');
  if (state.ok) return <Notice tone="success">{state.message}</Notice>;
  return (
    <form action={action} className="space-y-6" encType="multipart/form-data">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="reviewId" value={reviewId} />
      {state.error && <Notice tone="danger">{state.error}</Notice>}
      <fieldset>
        <legend className="text-sm font-medium">{t.verify.title}</legend>
        <div className="mt-3 grid gap-2">
          {METHODS.map((m) => (
            <label key={m} className={cx('cursor-pointer rounded-[var(--radius-md)] border bg-white p-4 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent/50', method === m ? 'border-ink ring-1 ring-ink' : 'border-line-strong')}>
              <span className="flex items-center gap-3">
                <input type="radio" name="method" value={m} checked={method === m} onChange={() => setMethod(m)} className="accent-ink" />
                <span className="font-medium">{t.verify.methods[m]}</span>
              </span>
              <span className="mt-1 block pl-7 text-sm text-muted-text">{t.verify.methodHints[m]}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {method !== 'manual_alternative' && (
        <Field label={t.verify.file} required hint={t.verify.fileHint} error={state.fieldErrors?.file}>
          {(p) => <input id={p.id} type="file" name="file" accept="image/jpeg,image/png,image/webp" required aria-describedby={p.describedBy} className="block w-full text-sm file:mr-4 file:h-10 file:rounded-[var(--radius-md)] file:border-0 file:bg-ink file:px-4 file:text-sm file:font-medium file:text-white" />}
        </Field>
      )}
      <Field label={t.verify.note} hint={t.verify.noteHint} required={method === 'manual_alternative'} optionalLabel={t.common.optional} error={state.fieldErrors?.note}>
        {(p) => <Textarea id={p.id} name="note" rows={4} maxLength={2000} invalid={p.invalid} aria-describedby={p.describedBy} />}
      </Field>
      <div className="rounded-[var(--radius-md)] bg-paper p-4 text-sm">
        <p className="font-semibold">{t.verify.privacyTitle}</p>
        <ul className="mt-2 space-y-1 text-muted-text">
          {t.verify.privacy.map((p) => <li key={p}>• {p.replace('{days}', String(retentionDays))}</li>)}
        </ul>
        <p className="mt-2 text-xs text-warning">{t.verify.retentionPending}</p>
      </div>
      <SubmitButton>{t.verify.submit}</SubmitButton>
    </form>
  );
}
