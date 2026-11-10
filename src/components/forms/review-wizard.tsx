'use client';
import Link from 'next/link';
import { useActionState, useEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from '@/components/i18n-provider';
import { Checkbox, Field, Input, Select, SubmitButton, Textarea } from '@/components/ui/form';
import { Alert, Check, ChevronLeft, ChevronRight, Lock, SearchIcon, ShieldCheck } from '@/components/ui/icons';
import { Notice, buttonClass, cx } from '@/components/ui/primitives';
import { BODY_MAX, BODY_MIN, RATING_DIMENSIONS, SERVICE_CATEGORIES } from '@/lib/config';
import { flagTypes, screenText } from '@/lib/screening';
import { fmt } from '@/lib/i18n/format';
import { LOCALES } from '@/lib/i18n/config';
import { initialState } from '@/lib/actions/state';
import { editReviewAction, submitReviewAction } from '@/lib/actions/reviews';

export type WizardOffice = { id: string; slug: string; name: string; nameKo: string; place: string };
export type WizardInitial = {
  reviewId: string; officeId: string; service: string; visitMonth: string; usedAppointment: string; receivedService: string;
  language: string; title: string; body: string; ratings: Record<string, number>;
};

type StepKey = 'office' | 'service' | 'visit' | 'ratings' | 'experience' | 'verification' | 'confirm';
const FIELD_STEP: Record<string, StepKey> = {
  officeId: 'office', service: 'service', visitMonth: 'visit', usedAppointment: 'visit', receivedService: 'visit',
  title: 'experience', body: 'experience', language: 'experience', agree: 'confirm',
};

function RadioCard({ name, value, checked, onChange, children }: { name: string; value: string; checked: boolean; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <label className={cx('flex cursor-pointer items-center gap-3 rounded-[var(--radius-md)] border bg-white px-4 py-3.5 text-[0.95rem] transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent/50', checked ? 'border-ink ring-1 ring-ink' : 'border-line-strong hover:border-ink/40')}>
      <input type="radio" name={name} value={value} checked={checked} onChange={() => onChange(value)} className="sr-only" />
      <span aria-hidden="true" className={cx('flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border', checked ? 'border-ink bg-ink' : 'border-line-strong')}>
        {checked && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
      </span>
      <span>{children}</span>
    </label>
  );
}

export function ReviewWizard({ offices, months, preselectedSlug, initial }: {
  offices: WizardOffice[]; months: { value: string; label: string }[]; preselectedSlug?: string; initial?: WizardInitial;
}) {
  const { t, locale, href } = useI18n();
  const editing = !!initial;
  const steps: StepKey[] = editing ? ['service', 'visit', 'ratings', 'experience', 'confirm'] : ['office', 'service', 'visit', 'ratings', 'experience', 'verification', 'confirm'];
  const [state, action] = useActionState(editing ? editReviewAction : submitReviewAction, initialState);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const pre = offices.find((o) => o.slug === preselectedSlug);
  const [v, setV] = useState({
    officeId: initial?.officeId ?? pre?.id ?? '',
    service: initial?.service ?? '',
    visitMonth: initial?.visitMonth ?? '',
    usedAppointment: initial?.usedAppointment ?? '',
    receivedService: initial?.receivedService ?? '',
    language: initial?.language ?? locale,
    title: initial?.title ?? '',
    body: initial?.body ?? '',
    wantsVerification: 'no',
    ratings: (initial?.ratings ?? {}) as Record<string, number>,
  });
  const [officeFilter, setOfficeFilter] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  const set = <K extends keyof typeof v>(k: K, value: (typeof v)[K]) => setV((s) => ({ ...s, [k]: value }));

  const current = steps[step];
  const flags = useMemo(() => flagTypes(screenText(`${v.title}\n${v.body}`)), [v.title, v.body]);
  const office = offices.find((o) => o.id === v.officeId);
  const filteredOffices = offices.filter((o) => {
    const q = officeFilter.trim().toLocaleLowerCase();
    return !q || `${o.name} ${o.nameKo} ${o.place} ${o.slug}`.toLocaleLowerCase().includes(q);
  });

  useEffect(() => {
    heading.current?.focus();
  }, [step]);

  // map server-side field errors back to the right step
  useEffect(() => {
    if (state.fieldErrors) {
      setErrors(state.fieldErrors);
      const first = Object.keys(state.fieldErrors)[0];
      const target = first?.startsWith('rating_') ? 'ratings' : FIELD_STEP[first];
      const idx = steps.indexOf(target);
      if (idx >= 0) setStep(idx);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function validate(s: StepKey): boolean {
    const e: Record<string, string> = {};
    if (s === 'office' && !v.officeId) e.officeId = t.validation.office;
    if (s === 'service' && !v.service) e.service = t.validation.required;
    if (s === 'visit') {
      if (!v.visitMonth) e.visitMonth = t.validation.month;
      if (!v.usedAppointment) e.usedAppointment = t.validation.required;
      if (!v.receivedService) e.receivedService = t.validation.required;
    }
    if (s === 'ratings') for (const d of RATING_DIMENSIONS) if (!v.ratings[d]) e[`rating_${d}`] = t.validation.rating;
    if (s === 'experience') {
      const len = v.body.trim().length;
      if (len < BODY_MIN) e.body = fmt(t.validation.tooShort, { min: BODY_MIN });
      if (len > BODY_MAX) e.body = fmt(t.validation.tooLong, { max: BODY_MAX });
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  const next = () => validate(current) && setStep((i) => Math.min(steps.length - 1, i + 1));
  const back = () => setStep((i) => Math.max(0, i - 1));

  if (state.ok && !editing) {
    const reviewId = String(state.data?.reviewId ?? '');
    return (
      <div className="rounded-[var(--radius-lg)] border border-line bg-white p-8 text-center md:p-12" role="status">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#e6f3ee] text-verified-text"><Check size={28} /></span>
        <h2 className="mt-6 text-2xl font-semibold">{t.write.successTitle}</h2>
        <p className="mx-auto mt-3 max-w-md text-muted-text">{t.write.successBody}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {state.data?.wantsVerification ? (
            <Link href={href(`/account/reviews/${reviewId}/verify`)} className={buttonClass('primary')}><ShieldCheck size={16} />{t.write.verifyNow}</Link>
          ) : null}
          <Link href={href('/account')} className={buttonClass(state.data?.wantsVerification ? 'secondary' : 'primary')}>{t.write.goToAccount}</Link>
        </div>
      </div>
    );
  }
  if (state.ok && editing) {
    return (
      <Notice tone="success" title={t.common.saved}>
        {state.message} <Link href={href('/account')} className="font-medium underline">{t.write.goToAccount}</Link>
      </Notice>
    );
  }

  const progress = ((step + 1) / steps.length) * 100;

  return (
    <form action={action} noValidate onKeyDown={(e) => {
      if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT' && current !== 'confirm') { e.preventDefault(); next(); }
    }}>
      <input type="hidden" name="locale" value={locale} />
      {editing && <input type="hidden" name="reviewId" value={initial!.reviewId} />}
      <input type="hidden" name="officeId" value={v.officeId} />
      <input type="hidden" name="service" value={v.service} />
      <input type="hidden" name="visitMonth" value={v.visitMonth} />
      <input type="hidden" name="usedAppointment" value={v.usedAppointment} />
      <input type="hidden" name="receivedService" value={v.receivedService} />
      <input type="hidden" name="language" value={v.language} />
      <input type="hidden" name="title" value={v.title} />
      <input type="hidden" name="body" value={v.body} />
      <input type="hidden" name="wantsVerification" value={v.wantsVerification} />
      {RATING_DIMENSIONS.map((d) => <input key={d} type="hidden" name={`rating_${d}`} value={v.ratings[d] ?? ''} />)}

      {/* progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-ink">{t.write.steps[current]}</span>
          <span className="text-muted-text">{fmt(t.write.stepOf, { step: step + 1, total: steps.length })}</span>
        </div>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-mist" role="progressbar" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={step + 1} aria-label={fmt(t.write.stepOf, { step: step + 1, total: steps.length })}>
          <div className="h-full rounded-full bg-ink transition-[width] duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {state.error && <Notice tone="danger" className="mb-6">{state.error}</Notice>}

      <div className="rounded-[var(--radius-lg)] border border-line bg-white p-6 md:p-8">
        {current === 'office' && (
          <fieldset>
            <legend className="sr-only">{t.write.officeQuestion}</legend>
            <h2 ref={heading} tabIndex={-1} className="text-2xl font-semibold focus:outline-none">{t.write.officeQuestion}</h2>
            <label className="relative mt-6 block">
              <span className="sr-only">{t.write.officeSearch}</span>
              <SearchIcon size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-text" />
              <Input value={officeFilter} onChange={(e) => setOfficeFilter(e.target.value)} placeholder={t.write.officeSearch} className="pl-10" />
            </label>
            <div className="mt-4 grid max-h-[26rem] gap-2 overflow-y-auto pr-1 sm:grid-cols-2" role="radiogroup" aria-label={t.write.officeQuestion}>
              {filteredOffices.map((o) => (
                <RadioCard key={o.id} name="office_choice" value={o.id} checked={v.officeId === o.id} onChange={(id) => set('officeId', id)}>
                  <span className="block font-medium">{o.name}</span>
                  <span className="block text-xs text-muted-text">{o.place}{locale !== 'ko' && <> · <span lang="ko">{o.nameKo}</span></>}</span>
                </RadioCard>
              ))}
            </div>
            {errors.officeId && <p className="mt-3 text-sm font-medium text-danger" role="alert">{errors.officeId}</p>}
          </fieldset>
        )}

        {current === 'service' && (
          <fieldset>
            <legend className="sr-only">{t.write.serviceQuestion}</legend>
            <h2 ref={heading} tabIndex={-1} className="text-2xl font-semibold focus:outline-none">{t.write.serviceQuestion}</h2>
            {office && <p className="mt-2 text-sm text-muted-text">{t.write.selectedOffice}: <span className="font-medium text-ink">{office.name}</span></p>}
            <div className="mt-6 grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label={t.write.serviceQuestion}>
              {SERVICE_CATEGORIES.map((s) => (
                <RadioCard key={s} name="service_choice" value={s} checked={v.service === s} onChange={(x) => set('service', x)}>{t.services[s]}</RadioCard>
              ))}
            </div>
            {errors.service && <p className="mt-3 text-sm font-medium text-danger" role="alert">{errors.service}</p>}
          </fieldset>
        )}

        {current === 'visit' && (
          <div className="space-y-8">
            <h2 ref={heading} tabIndex={-1} className="text-2xl font-semibold focus:outline-none">{t.write.visitQuestion}</h2>
            <Field label={t.write.visitMonth} required hint={t.write.visitMonthHint} error={errors.visitMonth}>
              {(p) => (
                <Select id={p.id} value={v.visitMonth} onChange={(e) => set('visitMonth', e.target.value)} invalid={p.invalid} aria-describedby={p.describedBy}>
                  <option value="">—</option>
                  {months.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </Select>
              )}
            </Field>
            <fieldset>
              <legend className="text-sm font-medium">{t.write.usedAppointment} <span aria-hidden="true" className="text-danger">*</span></legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {(['yes', 'no', 'unsure'] as const).map((x) => (
                  <RadioCard key={x} name="appt_choice" value={x} checked={v.usedAppointment === x} onChange={(y) => set('usedAppointment', y)}>{x === 'unsure' ? t.common.unsure : t.common[x]}</RadioCard>
                ))}
              </div>
              {errors.usedAppointment && <p className="mt-2 text-sm font-medium text-danger">{errors.usedAppointment}</p>}
            </fieldset>
            <fieldset>
              <legend className="text-sm font-medium">{t.write.receivedService} <span aria-hidden="true" className="text-danger">*</span></legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-4">
                {(['yes', 'partially', 'no', 'unsure'] as const).map((x) => (
                  <RadioCard key={x} name="outcome_choice" value={x} checked={v.receivedService === x} onChange={(y) => set('receivedService', y)}>{x === 'unsure' ? t.common.unsure : t.common[x]}</RadioCard>
                ))}
              </div>
              {errors.receivedService && <p className="mt-2 text-sm font-medium text-danger">{errors.receivedService}</p>}
            </fieldset>
          </div>
        )}

        {current === 'ratings' && (
          <div>
            <h2 ref={heading} tabIndex={-1} className="text-2xl font-semibold focus:outline-none">{t.write.ratingsQuestion}</h2>
            <p className="mt-2 text-sm text-muted-text">{t.write.ratingsHint}</p>
            <div className="mt-8 space-y-7">
              {RATING_DIMENSIONS.map((d) => (
                <fieldset key={d}>
                  <legend className="text-[0.95rem] font-medium">{t.ratings.dimensions[d]}</legend>
                  <div className="mt-3 grid grid-cols-5 gap-2" role="radiogroup" aria-label={fmt(t.write.ratingFor, { dimension: t.ratings.dimensions[d] })}>
                    {[1, 2, 3, 4, 5].map((n) => {
                      const checked = v.ratings[d] === n;
                      return (
                        <label key={n} className={cx('flex cursor-pointer flex-col items-center justify-center rounded-[var(--radius-md)] border py-3 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent/50', checked ? 'border-ink bg-ink text-white' : 'border-line-strong bg-white hover:border-ink/40')}>
                          <input type="radio" name={`r_${d}`} value={n} checked={checked} onChange={() => setV((s) => ({ ...s, ratings: { ...s.ratings, [d]: n } }))} className="sr-only" aria-label={`${n} — ${(t.ratings.scale as Record<string, string>)[n]}`} />
                          <span className="text-lg font-semibold tabular-nums">{n}</span>
                          <span className={cx('hidden text-[0.68rem] sm:block', checked ? 'text-white/75' : 'text-muted-text')}>{(t.ratings.scale as Record<string, string>)[n]}</span>
                        </label>
                      );
                    })}
                  </div>
                  {errors[`rating_${d}`] && <p className="mt-2 text-sm font-medium text-danger">{errors[`rating_${d}`]}</p>}
                </fieldset>
              ))}
            </div>
          </div>
        )}

        {current === 'experience' && (
          <div className="space-y-6">
            <h2 ref={heading} tabIndex={-1} className="text-2xl font-semibold focus:outline-none">{t.write.experienceQuestion}</h2>
            <div className="rounded-[var(--radius-md)] bg-paper p-4">
              <p className="text-sm font-semibold">{t.write.avoidTitle}</p>
              <ul className="mt-2 grid gap-1 text-sm text-muted-text sm:grid-cols-2">
                {t.write.avoid.map((a) => <li key={a} className="flex gap-2"><span aria-hidden="true">–</span>{a}</li>)}
              </ul>
            </div>
            <Field label={t.write.language} required>
              {(p) => (
                <Select id={p.id} value={v.language} onChange={(e) => set('language', e.target.value)}>
                  {LOCALES.map((l) => <option key={l} value={l}>{t.languages[l]}</option>)}
                </Select>
              )}
            </Field>
            <Field label={t.write.reviewTitle} optionalLabel={t.common.optional} error={errors.title}>
              {(p) => <Input id={p.id} value={v.title} maxLength={120} onChange={(e) => set('title', e.target.value)} lang={v.language} invalid={p.invalid} />}
            </Field>
            <Field label={t.write.reviewBody} required hint={fmt(t.write.bodyHint, { min: BODY_MIN, max: BODY_MAX, count: v.body.trim().length })} error={errors.body}>
              {(p) => <Textarea id={p.id} value={v.body} rows={9} maxLength={BODY_MAX} onChange={(e) => set('body', e.target.value)} lang={v.language} invalid={p.invalid} aria-describedby={p.describedBy} />}
            </Field>
            {flags.length > 0 && (
              <Notice tone="warning" title={t.write.screeningWarning}>
                <ul className="mt-1 list-disc pl-5">{flags.map((f) => <li key={f}>{t.screening[f]}</li>)}</ul>
                <p className="mt-2">{t.screening.note}</p>
              </Notice>
            )}
          </div>
        )}

        {current === 'verification' && (
          <fieldset>
            <legend className="sr-only">{t.write.verifyQuestion}</legend>
            <h2 ref={heading} tabIndex={-1} className="text-2xl font-semibold focus:outline-none">{t.write.verifyQuestion}</h2>
            <p className="mt-3 flex gap-3 text-[0.95rem] leading-relaxed text-muted-text"><Lock size={18} className="mt-1 shrink-0 text-accent-text" />{t.write.verifyBody}</p>
            <div className="mt-6 grid gap-2" role="radiogroup" aria-label={t.write.verifyQuestion}>
              <RadioCard name="verify_choice" value="yes" checked={v.wantsVerification === 'yes'} onChange={(x) => set('wantsVerification', x)}>{t.write.verifyYes}</RadioCard>
              <RadioCard name="verify_choice" value="no" checked={v.wantsVerification === 'no'} onChange={(x) => set('wantsVerification', x)}>{t.write.verifyNo}</RadioCard>
            </div>
          </fieldset>
        )}

        {current === 'confirm' && (
          <div>
            <h2 ref={heading} tabIndex={-1} className="text-2xl font-semibold focus:outline-none">{t.write.confirmTitle}</h2>
            <dl className="mt-6 divide-y divide-line rounded-[var(--radius-md)] border border-line text-sm">
              {[
                [t.write.steps.office, office?.name ?? '—'],
                [t.write.steps.service, v.service ? t.services[v.service as keyof typeof t.services] : '—'],
                [t.write.visitMonth, months.find((m) => m.value === v.visitMonth)?.label ?? '—'],
                [t.write.steps.ratings, RATING_DIMENSIONS.map((d) => `${t.ratings.short[d]} ${v.ratings[d] ?? '—'}`).join(' · ')],
              ].map(([k, val]) => (
                <div key={k} className="grid gap-1 px-4 py-3 sm:grid-cols-[180px_1fr]"><dt className="text-muted-text">{k}</dt><dd>{val}</dd></div>
              ))}
              <div className="px-4 py-3" lang={v.language}>
                {v.title && <p className="font-semibold">{v.title}</p>}
                <p className="mt-1 line-clamp-6 whitespace-pre-line text-muted-text">{v.body}</p>
              </div>
            </dl>
            <p className="mt-6 flex gap-2 text-sm text-muted-text"><Alert size={16} className="mt-0.5 shrink-0" />{editing ? t.account.editNote : t.write.confirmNote}</p>
            {!editing && (
              <div className="mt-5">
                <Checkbox name="agree" required error={errors.agree} label={<>{t.write.agree} <Link href={href('/legal/guidelines')} target="_blank" className="text-accent-text underline">{t.legal.guidelines}</Link></>} />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        {step > 0 ? (
          <button type="button" onClick={back} className={buttonClass('ghost')}><ChevronLeft size={16} />{t.common.back}</button>
        ) : <span />}
        {current === 'confirm' ? (
          <SubmitButton pendingLabel={t.write.submitting}>{editing ? t.common.save : t.write.submit}</SubmitButton>
        ) : (
          <button type="button" onClick={next} className={buttonClass('primary')}>{t.common.continue}<ChevronRight size={16} /></button>
        )}
      </div>
    </form>
  );
}
