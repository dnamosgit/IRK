'use client';
import { useActionState } from 'react';
import { useI18n } from '@/components/i18n-provider';
import { Field, Input, Select, SubmitButton, Textarea } from '@/components/ui/form';
import { Notice } from '@/components/ui/primitives';
import { initialState, type ActionState } from '@/lib/actions/state';
import { submitAppealAction, submitContactAction, submitLegalRequestAction } from '@/lib/actions/requests';
import { fmt } from '@/lib/i18n/format';

function Result({ state }: { state: ActionState }) {
  const { t } = useI18n();
  if (state.ok) {
    return (
      <Notice tone="success" title={state.message}>
        {state.data?.code ? fmt(t.common.reference, { code: String(state.data.code) }) : null}
      </Notice>
    );
  }
  return state.error ? <Notice tone="danger">{state.error}</Notice> : null;
}

export function ContactForm({ defaultKind }: { defaultKind: 'contact' | 'problem' | 'deletion_request' }) {
  const { t, locale } = useI18n();
  const [state, action] = useActionState(submitContactAction, initialState);
  if (state.ok) return <Result state={state} />;
  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="locale" value={locale} />
      <Result state={state} />
      <Field label={t.contact.kind} required>
        {(p) => (
          <Select id={p.id} name="kind" defaultValue={defaultKind}>
            {(['contact', 'problem', 'deletion_request'] as const).map((k) => <option key={k} value={k}>{t.contact.kinds[k]}</option>)}
          </Select>
        )}
      </Field>
      <Field label={t.contact.email} optionalLabel={t.common.optional} error={state.fieldErrors?.email}>
        {(p) => <Input id={p.id} type="email" name="email" autoComplete="email" invalid={p.invalid} aria-describedby={p.describedBy} />}
      </Field>
      <Field label={t.contact.message} required error={state.fieldErrors?.message}>
        {(p) => <Textarea id={p.id} name="message" required minLength={10} maxLength={3000} rows={6} invalid={p.invalid} aria-describedby={p.describedBy} />}
      </Field>
      <Field label={t.contact.pageUrl} optionalLabel={t.common.optional}>
        {(p) => <Input id={p.id} name="pageUrl" maxLength={500} />}
      </Field>
      <SubmitButton>{t.contact.submit}</SubmitButton>
    </form>
  );
}

export function AppealForm({ signedIn, reviews, defaultReview }: { signedIn: boolean; reviews: { id: string; label: string }[]; defaultReview?: string }) {
  const { t, locale } = useI18n();
  const [state, action] = useActionState(submitAppealAction, initialState);
  if (state.ok) return <Result state={state} />;
  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="locale" value={locale} />
      <Result state={state} />
      <Field label={t.appeal.type} required error={state.fieldErrors?.type}>
        {(p) => (
          <Select id={p.id} name="type" defaultValue="moderation_decision">
            {(['moderation_decision', 'report_outcome', 'verification_decision'] as const).map((k) => <option key={k} value={k}>{t.appeal.types[k]}</option>)}
          </Select>
        )}
      </Field>
      {reviews.length > 0 && (
        <Field label={t.appeal.review} optionalLabel={t.common.optional}>
          {(p) => (
            <Select id={p.id} name="reviewId" defaultValue={defaultReview ?? ''}>
              <option value="">—</option>
              {reviews.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
            </Select>
          )}
        </Field>
      )}
      <Field label={t.appeal.reference} optionalLabel={t.common.optional}>
        {(p) => <Input id={p.id} name="reference" maxLength={40} placeholder="RPT-XXXX-XXXX" />}
      </Field>
      {!signedIn && (
        <Field label={t.appeal.email} required hint={t.appeal.emailHint} error={state.fieldErrors?.email}>
          {(p) => <Input id={p.id} type="email" name="email" required autoComplete="email" invalid={p.invalid} aria-describedby={p.describedBy} />}
        </Field>
      )}
      <Field label={t.appeal.message} required error={state.fieldErrors?.message}>
        {(p) => <Textarea id={p.id} name="message" required minLength={20} maxLength={3000} rows={6} invalid={p.invalid} aria-describedby={p.describedBy} />}
      </Field>
      <SubmitButton>{t.appeal.submit}</SubmitButton>
    </form>
  );
}

export function LegalRequestForm({ defaultReview }: { defaultReview?: string }) {
  const { t, locale } = useI18n();
  const [state, action] = useActionState(submitLegalRequestAction, initialState);
  if (state.ok) return <Result state={state} />;
  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="locale" value={locale} />
      <Result state={state} />
      <Field label={t.legalRequest.kind} required>
        {(p) => (
          <Select id={p.id} name="kind" defaultValue="takedown">
            {(['takedown', 'right_of_reply', 'legal_notice', 'other'] as const).map((k) => <option key={k} value={k}>{t.legalRequest.kinds[k]}</option>)}
          </Select>
        )}
      </Field>
      <Field label={t.legalRequest.reviewUrl} optionalLabel={t.common.optional}>
        {(p) => <Input id={p.id} name="reviewRef" defaultValue={defaultReview} maxLength={500} />}
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t.legalRequest.name} required error={state.fieldErrors?.name}>
          {(p) => <Input id={p.id} name="name" required autoComplete="name" invalid={p.invalid} aria-describedby={p.describedBy} />}
        </Field>
        <Field label={t.legalRequest.organization} optionalLabel={t.common.optional}>
          {(p) => <Input id={p.id} name="organization" autoComplete="organization" />}
        </Field>
      </div>
      <Field label={t.legalRequest.email} required error={state.fieldErrors?.email}>
        {(p) => <Input id={p.id} type="email" name="email" required autoComplete="email" invalid={p.invalid} aria-describedby={p.describedBy} />}
      </Field>
      <Field label={t.legalRequest.basis} optionalLabel={t.common.optional}>
        {(p) => <Textarea id={p.id} name="basis" rows={3} maxLength={1000} />}
      </Field>
      <Field label={t.legalRequest.message} required error={state.fieldErrors?.message}>
        {(p) => <Textarea id={p.id} name="message" required minLength={20} maxLength={5000} rows={7} invalid={p.invalid} aria-describedby={p.describedBy} />}
      </Field>
      <SubmitButton>{t.legalRequest.submit}</SubmitButton>
    </form>
  );
}
