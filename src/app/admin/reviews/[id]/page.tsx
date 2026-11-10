import { notFound } from 'next/navigation';
import { ActionForm } from '@/components/admin/action-form';
import { AdminHeader, Panel, inputCls, textareaCls } from '@/components/admin/ui';
import { Badge, Notice } from '@/components/ui/primitives';
import { requireAdmin } from '@/lib/admin-guard';
import { adminDict } from '@/lib/admin-i18n';
import { appDb } from '@/lib/db';
import { can } from '@/lib/rbac';
import { RATING_DIMENSIONS } from '@/lib/config';
import { moderateReviewAction, publishResponseAction, redactReviewAction, reprocessTranslationAction } from '@/lib/actions/admin';

/** Highlight flagged excerpts inside the text for moderators. */
function Highlighted({ text, excerpts }: { text: string; excerpts: string[] }) {
  if (!excerpts.length) return <>{text}</>;
  const esc = excerpts.map((e) => e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  return <>{text.split(new RegExp(`(${esc})`, 'g')).map((part, i) => (excerpts.includes(part) ? <mark key={i} className="rounded bg-[#fde7b0] px-0.5">{part}</mark> : part))}</>;
}

export default async function AdminReviewDetail({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin('reviews');
  const { t } = await adminDict();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const r = (await appDb.query(
    `SELECT r.*, coalesce(tl.name, o.official_name_ko) AS office, o.slug,
            mc.priority, mc.screening_flags, mc.abuse_signals,
            (SELECT json_object_agg(dimension, score) FROM public.review_ratings WHERE review_id = r.id) AS ratings,
            -- moderators see NO identity data: only account age and the author's review count
            (SELECT extract(epoch FROM now() - u.created_at) / 86400 FROM private.users u WHERE u.id = r.user_id)::int AS account_age_days,
            (SELECT count(*) FROM public.reviews x WHERE x.user_id = r.user_id)::int AS author_reviews
       FROM public.reviews r JOIN public.offices o ON o.id = r.office_id
       LEFT JOIN public.office_translations tl ON tl.office_id = o.id AND tl.locale = 'en'
       LEFT JOIN private.moderation_cases mc ON mc.review_id = r.id
      WHERE r.id = $1`,
    [id],
  )).rows[0];
  if (!r) notFound();
  const [revisions, actions, translations, reports] = await Promise.all([
    appDb.query('SELECT kind, title, body, note, created_at FROM private.review_revisions WHERE review_id = $1 ORDER BY created_at', [id]),
    appDb.query('SELECT action, from_status, to_status, note, message_to_author, created_at FROM private.moderation_actions WHERE review_id = $1 ORDER BY created_at DESC', [id]),
    appDb.query('SELECT id, target_language, translated_title, translated_body, engine, status FROM public.review_translations WHERE review_id = $1 ORDER BY target_language', [id]),
    appDb.query('SELECT reference_code, reason, details, status, created_at FROM private.review_reports WHERE review_id = $1 ORDER BY created_at DESC', [id]),
  ]);
  const flags = (r.screening_flags ?? []) as { type: string; severity: string; excerpt: string }[];
  const signals = (r.abuse_signals ?? []) as { type: string; detail?: string }[];
  const original = revisions.rows.find((x) => x.kind === 'submission');
  const hasLegalFlag = flags.some((f) => ['criminal_allegation', 'threat'].includes(f.type));

  return (
    <>
      <AdminHeader title={`${r.office}`}>
        <div className="flex flex-wrap gap-2">
          <Badge tone="accent">{t.account.statuses[r.status as keyof typeof t.account.statuses]}</Badge>
          {r.priority && <Badge tone={r.priority === 'urgent' ? 'danger' : r.priority === 'high' ? 'warning' : 'neutral'}>{r.priority}</Badge>}
          {r.is_sample && <Badge tone="sample">{t.common.sampleBadge}</Badge>}
          {r.verification === 'verified' && <Badge tone="verified">{t.reviews.verified}</Badge>}
        </div>
      </AdminHeader>
      {hasLegalFlag && <Notice tone="warning" className="mb-6">{t.screening.criminal_allegation} → {t.admin.escalate}?</Notice>}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <Panel title={t.admin.current}>
            <p className="text-xs text-muted-text">{t.services[r.service_category as keyof typeof t.services]} · {new Date(r.visit_month).toISOString().slice(0, 7)} · {r.original_language.toUpperCase()} · appt: {r.used_appointment} · outcome: {r.received_service}</p>
            <div lang={r.original_language} className="mt-3">
              {r.title && <p className="font-semibold"><Highlighted text={r.title} excerpts={flags.map((f) => f.excerpt)} /></p>}
              <p className="mt-2 whitespace-pre-line text-[0.95rem] leading-relaxed"><Highlighted text={r.body} excerpts={flags.map((f) => f.excerpt)} /></p>
            </div>
            <dl className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-text">
              {RATING_DIMENSIONS.map((d) => <div key={d}><dt className="inline">{t.ratings.short[d]}: </dt><dd className="inline font-semibold text-ink">{r.ratings?.[d]}</dd></div>)}
            </dl>
          </Panel>

          {original && (original.body !== r.body || original.title !== r.title) && (
            <Panel title={t.admin.original}>
              <div lang={r.original_language}>{original.title && <p className="font-semibold">{original.title}</p>}<p className="mt-2 whitespace-pre-line text-sm">{original.body}</p></div>
            </Panel>
          )}

          <Panel title={t.admin.translations}>
            {translations.rows.length === 0 ? <p className="text-sm text-muted-text">{t.admin.noItems}</p> : (
              <ul className="space-y-4">
                {translations.rows.map((tr) => (
                  <li key={tr.id} lang={tr.target_language} className="text-sm">
                    <p className="text-xs text-muted-text">{tr.target_language.toUpperCase()} · {tr.engine} · {tr.status}</p>
                    {tr.translated_title && <p className="font-medium">{tr.translated_title}</p>}
                    <p className="whitespace-pre-line">{tr.translated_body ?? '—'}</p>
                  </li>
                ))}
              </ul>
            )}
            <ActionForm action={reprocessTranslationAction} className="mt-4"><input type="hidden" name="reviewId" value={id} /><button className="text-sm text-accent-text hover:underline">{t.admin.reprocess}</button></ActionForm>
          </Panel>

          <Panel title={t.admin.history}>
            <ol className="space-y-3 text-sm">
              {actions.rows.map((a, i) => (
                <li key={i} className="border-l-2 border-line pl-3">
                  <p><span className="font-medium">{a.action}</span> {a.from_status && <span className="text-muted-text">{a.from_status} → {a.to_status}</span>}</p>
                  {a.note && <p className="text-muted-text">{a.note}</p>}
                  {a.message_to_author && <p className="text-xs italic text-muted-text">✉ {a.message_to_author}</p>}
                  <p className="text-xs text-muted-text">{new Date(a.created_at).toISOString().replace('T', ' ').slice(0, 16)}</p>
                </li>
              ))}
              {revisions.rows.map((v, i) => <li key={`v${i}`} className="border-l-2 border-line pl-3 text-xs text-muted-text">revision: {v.kind} · {new Date(v.created_at).toISOString().slice(0, 16)}{v.note ? ` · ${v.note}` : ''}</li>)}
            </ol>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title={t.admin.actions}>
            <ActionForm action={moderateReviewAction} className="space-y-3">
              <input type="hidden" name="reviewId" value={id} />
              <select name="decision" className={inputCls} defaultValue="approve" aria-label={t.admin.actions}>
                {(['approve', 'clarify', 'escalate', 'hide', 'reject', 'remove', 'restore'] as const).map((d) => <option key={d} value={d}>{t.admin[d]}</option>)}
              </select>
              <label className="block text-xs font-medium text-muted-text">{t.admin.reason}<textarea name="reason" rows={2} className={`${textareaCls} mt-1`} /></label>
              <label className="block text-xs font-medium text-muted-text">{t.admin.messageToAuthor}<textarea name="message" rows={3} className={`${textareaCls} mt-1`} /></label>
              <button type="submit" className="h-10 w-full rounded-[var(--radius-md)] bg-ink text-sm font-medium text-white">{t.common.submit}</button>
            </ActionForm>
          </Panel>

          <Panel title={t.admin.flags}>
            {flags.length === 0 ? <p className="text-sm text-muted-text">—</p> : (
              <ul className="space-y-2 text-sm">{flags.map((f, i) => <li key={i}><Badge tone={f.severity === 'high' ? 'danger' : f.severity === 'medium' ? 'warning' : 'neutral'}>{f.type}</Badge> <span className="text-muted-text">“{f.excerpt}”</span></li>)}</ul>
            )}
            <h3 className="mt-5 text-xs font-semibold uppercase text-muted-text">{t.admin.signals}</h3>
            {signals.length === 0 ? <p className="text-sm text-muted-text">—</p> : <ul className="mt-2 space-y-1 text-sm">{signals.map((s, i) => <li key={i}><span className="font-medium">{s.type}</span> <span className="text-muted-text">{s.detail}</span></li>)}</ul>}
            <p className="mt-4 text-xs text-muted-text">Author: account {r.account_age_days ?? '—'} days old · {r.author_reviews ?? 0} review(s). Identity is not shown to moderators.</p>
          </Panel>

          <Panel title={t.admin.redact}>
            <ActionForm action={redactReviewAction} className="space-y-3">
              <input type="hidden" name="reviewId" value={id} />
              <p className="text-xs text-muted-text">{t.admin.redactHint}</p>
              <label className="block text-xs font-medium text-muted-text">{t.admin.passage}<textarea name="passage" rows={2} className={`${textareaCls} mt-1`} /></label>
              <label className="block text-xs font-medium text-muted-text">{t.admin.reason}<input name="reason" className={`${inputCls} mt-1`} /></label>
              <button type="submit" className="h-10 w-full rounded-[var(--radius-md)] border border-line-strong text-sm font-medium">{t.admin.redact}</button>
            </ActionForm>
          </Panel>

          <Panel title={t.report.title}>
            {reports.rows.length === 0 ? <p className="text-sm text-muted-text">—</p> : (
              <ul className="space-y-2 text-sm">{reports.rows.map((x) => <li key={x.reference_code}><span className="font-mono text-xs">{x.reference_code}</span> · {t.report.reasons[x.reason as keyof typeof t.report.reasons]} · {x.status}{x.details && <span className="block text-muted-text">{x.details}</span>}</li>)}</ul>
            )}
          </Panel>

          {can(admin.roles, 'legal') && r.status === 'approved' && (
            <Panel title={t.legalRequest.kinds.right_of_reply}>
              <ActionForm action={publishResponseAction} className="space-y-3">
                <input type="hidden" name="reviewId" value={id} />
                <input name="organization" placeholder={t.legalRequest.organization} className={inputCls} />
                <select name="language" className={inputCls} defaultValue="ko">{['en', 'es', 'ko'].map((l) => <option key={l} value={l}>{l.toUpperCase()}</option>)}</select>
                <textarea name="body" rows={4} className={textareaCls} aria-label={t.admin.publishResponse} />
                <button type="submit" className="h-10 w-full rounded-[var(--radius-md)] border border-line-strong text-sm font-medium">{t.admin.publishResponse}</button>
              </ActionForm>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
