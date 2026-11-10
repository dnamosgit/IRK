import { notFound } from 'next/navigation';
import { ActionForm } from '@/components/admin/action-form';
import { AdminHeader, Panel, textareaCls } from '@/components/admin/ui';
import { Badge, Notice } from '@/components/ui/primitives';
import { requireAdmin } from '@/lib/admin-guard';
import { adminDict } from '@/lib/admin-i18n';
import { appDb } from '@/lib/db';
import { adminDeleteEvidenceAction, decideVerificationAction } from '@/lib/actions/admin';

export default async function AdminVerificationDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin('verifications');
  const { t } = await adminDict();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  // Verification reviewers see the visit context, not the review text or author identity.
  const v = (await appDb.query(
    `SELECT v.*, coalesce(tl.name, o.official_name_ko) AS office, o.official_name_ko, r.visit_month, r.service_category
       FROM private.verification_events v JOIN public.reviews r ON r.id = v.review_id JOIN public.offices o ON o.id = r.office_id
       LEFT JOIN public.office_translations tl ON tl.office_id = o.id AND tl.locale = 'en' WHERE v.id = $1`, [id])).rows[0];
  if (!v) notFound();
  const files = (await appDb.query(`SELECT id, content_type, byte_size FROM private.private_verification_files WHERE verification_event_id = $1 AND deleted_at IS NULL`, [id])).rows;
  const access = (await appDb.query(`SELECT action, actor_user_id, created_at FROM private.audit_logs WHERE target_type = 'verification' AND target_id = $1 ORDER BY created_at DESC LIMIT 50`, [id])).rows;
  return (
    <>
      <AdminHeader title={`${t.verify.title}: ${v.office}`}><Badge tone="accent">{t.verify.status[v.status as keyof typeof t.verify.status]}</Badge></AdminHeader>
      <Notice tone="info" className="mb-6">{t.reviews.verifiedTooltip}</Notice>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <Panel title={t.admin.evidence}>
            <p className="text-sm">{t.verify.methods[v.method as keyof typeof t.verify.methods]} · <span lang="ko">{v.official_name_ko}</span> · {new Date(v.visit_month).toISOString().slice(0, 7)} · {t.services[v.service_category as keyof typeof t.services]}</p>
            {v.user_note && <p className="mt-3 whitespace-pre-line rounded-[var(--radius-md)] bg-paper p-3 text-sm">{v.user_note}</p>}
            {v.evidence_deleted_at ? <p className="mt-4 text-sm text-muted-text">Evidence deleted {new Date(v.evidence_deleted_at).toISOString().slice(0, 16)}</p> : (
              <ul className="mt-4 space-y-4">
                {files.map((f) => (
                  <li key={f.id}>
                    <details>
                      <summary className="cursor-pointer text-sm font-medium text-accent-text">{t.admin.viewEvidence} ({Math.round(f.byte_size / 1024)} KB)</summary>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/api/admin/evidence/${f.id}`} alt={t.admin.evidence} loading="lazy" className="mt-3 max-h-[70vh] rounded-[var(--radius-md)] border border-line" />
                    </details>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title={t.admin.accessHistory}>
            <ul className="space-y-1 text-xs text-muted-text">
              {access.map((a, i) => <li key={i}>{new Date(a.created_at).toISOString().replace('T', ' ').slice(0, 19)} · {a.action} · {a.actor_user_id ? a.actor_user_id.slice(0, 8) : 'system'}</li>)}
            </ul>
          </Panel>
        </div>
        <div className="space-y-6">
          {v.status === 'submitted' && (
            <Panel title={t.admin.actions}>
              <ActionForm action={decideVerificationAction} className="space-y-3">
                <input type="hidden" name="eventId" value={id} />
                <label className="block text-xs font-medium text-muted-text">{t.admin.reason}<textarea name="reason" rows={3} className={`${textareaCls} mt-1`} /></label>
                <div className="grid grid-cols-2 gap-2">
                  <button name="decision" value="approve" className="h-10 rounded-[var(--radius-md)] bg-verified text-sm font-medium text-white">{t.admin.approveVerification}</button>
                  <button name="decision" value="reject" className="h-10 rounded-[var(--radius-md)] border border-line-strong text-sm font-medium">{t.admin.rejectVerification}</button>
                </div>
              </ActionForm>
            </Panel>
          )}
          {v.status !== 'submitted' && (
            <Panel title={t.admin.actions}>
              <p className="text-sm"><span className="font-semibold">{t.verify.status[v.status as keyof typeof t.verify.status]}</span>{v.decided_at && <span className="text-muted-text"> · {new Date(v.decided_at).toISOString().slice(0, 16).replace('T', ' ')}</span>}</p>
              {v.decision_reason && <p className="mt-2 text-sm text-muted-text">{v.decision_reason}</p>}
            </Panel>
          )}
          {!v.evidence_deleted_at && (
            <Panel title={t.admin.deleteEvidence}>
              <ActionForm action={adminDeleteEvidenceAction}>
                <input type="hidden" name="eventId" value={id} />
                <p className="mb-3 text-xs text-muted-text">Retention until {new Date(v.retention_until).toISOString().slice(0, 10)}</p>
                <button className="h-10 w-full rounded-[var(--radius-md)] bg-danger text-sm font-medium text-white">{t.admin.deleteEvidence}</button>
              </ActionForm>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
