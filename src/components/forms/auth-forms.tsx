'use client';
import Link from 'next/link';
import { useActionState } from 'react';
import { useI18n } from '@/components/i18n-provider';
import { Checkbox, Field, Input, SubmitButton } from '@/components/ui/form';
import { Notice } from '@/components/ui/primitives';
import { initialState } from '@/lib/actions/state';
import { forgotPasswordAction, resendVerificationAction, resetPasswordAction, signInAction, signUpAction } from '@/lib/actions/auth';

export function SignInForm({ next }: { next?: string }) {
  const { t, locale, href } = useI18n();
  const [state, action] = useActionState(signInAction, initialState);
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="locale" value={locale} />
      {next && <input type="hidden" name="next" value={next} />}
      {state.error && <Notice tone="danger">{state.error}</Notice>}
      <Field label={t.auth.email} required>
        {(p) => <Input id={p.id} type="email" name="email" required autoComplete="email" />}
      </Field>
      <Field label={t.auth.password} required>
        {(p) => <Input id={p.id} type="password" name="password" required autoComplete="current-password" />}
      </Field>
      <div className="flex items-center justify-between gap-4">
        <SubmitButton className="min-w-32">{t.auth.signIn}</SubmitButton>
        <Link href={href('/auth/forgot-password')} className="text-sm text-accent-text hover:underline">{t.auth.forgot}</Link>
      </div>
    </form>
  );
}

export function SignUpForm({ next }: { next?: string }) {
  const { t, locale, href } = useI18n();
  const [state, action] = useActionState(signUpAction, initialState);
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="locale" value={locale} />
      {next && <input type="hidden" name="next" value={next} />}
      {state.error && <Notice tone="danger">{state.error}</Notice>}
      <Field label={t.auth.email} required error={fe.email}>
        {(p) => <Input id={p.id} type="email" name="email" required autoComplete="email" invalid={p.invalid} aria-describedby={p.describedBy} />}
      </Field>
      <Field label={t.auth.password} required hint={t.auth.passwordHint} error={fe.password}>
        {(p) => <Input id={p.id} type="password" name="password" required minLength={10} autoComplete="new-password" invalid={p.invalid} aria-describedby={p.describedBy} />}
      </Field>
      <Field label={t.auth.confirmPassword} required error={fe.confirm}>
        {(p) => <Input id={p.id} type="password" name="confirm" required autoComplete="new-password" invalid={p.invalid} aria-describedby={p.describedBy} />}
      </Field>
      <p className="rounded-[var(--radius-md)] bg-mist px-4 py-3 text-xs leading-relaxed text-muted-text">{t.auth.anonymityNote}</p>
      <Checkbox
        name="terms"
        error={fe.terms}
        label={<>
          {t.auth.agreeTerms}{' '}
          <Link href={href('/legal/terms')} className="text-accent-text underline">{t.legal.terms}</Link> ·{' '}
          <Link href={href('/legal/privacy')} className="text-accent-text underline">{t.legal.privacy}</Link>
        </>}
      />
      <SubmitButton className="w-full">{t.auth.signUp}</SubmitButton>
    </form>
  );
}

export function ForgotPasswordForm() {
  const { t, locale } = useI18n();
  const [state, action] = useActionState(forgotPasswordAction, initialState);
  if (state.ok) return <Notice tone="success">{state.message}</Notice>;
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="locale" value={locale} />
      {state.error && <Notice tone="danger">{state.error}</Notice>}
      <Field label={t.auth.email} required error={state.fieldErrors?.email}>
        {(p) => <Input id={p.id} type="email" name="email" required autoComplete="email" invalid={p.invalid} />}
      </Field>
      <SubmitButton>{t.auth.sendReset}</SubmitButton>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const { t, locale } = useI18n();
  const [state, action] = useActionState(resetPasswordAction, initialState);
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="token" value={token} />
      {state.error && <Notice tone="danger">{state.error}</Notice>}
      <Field label={t.auth.newPassword} required hint={t.auth.passwordHint} error={state.fieldErrors?.password}>
        {(p) => <Input id={p.id} type="password" name="password" required minLength={10} autoComplete="new-password" invalid={p.invalid} aria-describedby={p.describedBy} />}
      </Field>
      <Field label={t.auth.confirmPassword} required error={state.fieldErrors?.confirm}>
        {(p) => <Input id={p.id} type="password" name="confirm" required autoComplete="new-password" invalid={p.invalid} />}
      </Field>
      <SubmitButton>{t.common.save}</SubmitButton>
    </form>
  );
}

export function ResendVerificationForm() {
  const { t, locale } = useI18n();
  const [state, action] = useActionState(resendVerificationAction, initialState);
  if (state.ok) return <p role="status" className="text-sm text-verified-text">{state.message}</p>;
  return (
    <form action={action} className="inline">
      <input type="hidden" name="locale" value={locale} />
      {state.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      <SubmitButton variant="secondary">{t.auth.resendVerification}</SubmitButton>
    </form>
  );
}
