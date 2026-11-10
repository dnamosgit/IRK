import Link from 'next/link';
import { ActionForm } from '@/components/admin/action-form';
import { AdminHeader, Tabs, inputCls, textareaCls } from '@/components/admin/ui';
import { Badge } from '@/components/ui/primitives';
import { requireAdmin } from '@/lib/admin-guard';
import { adminDict } from '@/lib/admin-i18n';
import { appDb } from '@/lib/db';
import { decideAppealAction, resolveReportAction, updateLegalRequestAction } from '@/lib/actions/admin';

const d = (x: Date | string) => new Date(x).toISOString().slice(0, 10);

export default async function AdminReports({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireAdmin('reports');
  const { t } = await adminDict();
  const tab = ['reports', 'appeals', 'legal', 'messages'].includes((await searchParams).tab ?? '') ? (await searchParams).tab! : 'reports';
  const card = 'rounded-[var(--radius-lg)] border border-line bg-white p-5';
  let content: React.ReactNode = null;

  if (tab === 'reports') {
    const rows = (await appDb.query(`SELECT rr.*, r.body, r.status AS review_status FROM private.review_reports rr JOIN public.reviews r ON r.id = rr.review_id ORDER BY (rr.status = 'open') DESC, rr.created_at ASC LIMIT 100`)).rows;
    content = rows.map((x) => (
      <li key={x.id} className={card}>
        <div className="flex flex-wrap items-center gap-2 text-sm"><span className="font-mono text-xs">{x.reference_code}</span><Badge tone={x.status === 'open' ? 'warning' : 'neutral'}>{x.status}</Badge><span className="font-medium">{t.report.reasons[x.reason as keyof typeof t.report.reasons]}</span><span className="text-xs text-muted-text">{d(x.created_at)}</span></div>
        {x.details && <p className="mt-2 text-sm">{x.details}</p>}
        <p className="mt-2 line-clamp-2 text-xs text-muted-text">{x.body}</p>
        <Link href={`/admin/reviews/${x.review_id}`} className="mt-2 inline-block text-sm text-accent-text hover:underline">{t.admin.reviews} → ({x.review_status})</Link>
        {x.status === 'open' ? (
          <ActionForm action={resolveReportAction} className="mt-3 flex flex-wrap gap-2">
            <input type="hidden" name="reportId" value={x.id} />
            <input name="note" placeholder={t.admin.reason} className={`${inputCls} max-w-md flex-1`} />
            <button name="status" value="actioned" className="h-10 rounded-[var(--radius-md)] bg-ink px-4 text-sm text-white">{t.admin.action}</button>
            <button name="status" value="dismissed" className="h-10 rounded-[var(--radius-md)] border border-line-strong px-4 text-sm">{t.admin.dismiss}</button>
          </ActionForm>
        ) : x.resolution_note && <p className="mt-2 text-xs text-muted-text">✓ {x.resolution_note}</p>}
      </li>
    ));
  } else if (tab === 'appeals') {
    const rows = (await appDb.query(`SELECT * FROM private.appeals ORDER BY (status = 'open') DESC, created_at ASC LIMIT 100`)).rows;
    content = rows.map((x) => (
      <li key={x.id} className={card}>
        <div className="flex flex-wrap items-center gap-2 text-sm"><span className="font-mono text-xs">{x.reference_code}</span><Badge tone={x.status === 'open' ? 'warning' : 'neutral'}>{x.status}</Badge><span className="font-medium">{t.appeal.types[x.appeal_type as keyof typeof t.appeal.types]}</span><span className="text-xs text-muted-text">{d(x.created_at)}</span>{x.related_reference && <span className="font-mono text-xs">↳ {x.related_reference}</span>}</div>
        <p className="mt-2 whitespace-pre-line text-sm">{x.message}</p>
        {x.review_id && <Link href={`/admin/reviews/${x.review_id}`} className="mt-2 inline-block text-sm text-accent-text hover:underline">{t.admin.reviews} →</Link>}
        {x.status === 'open' ? (
          <ActionForm action={decideAppealAction} className="mt-3 flex flex-wrap gap-2">
            <input type="hidden" name="appealId" value={x.id} />
            <input name="note" placeholder={t.admin.reason} className={`${inputCls} max-w-md flex-1`} />
            <button name="status" value="upheld" className="h-10 rounded-[var(--radius-md)] border border-line-strong px-4 text-sm">{t.admin.uphold}</button>
            <button name="status" value="overturned" className="h-10 rounded-[var(--radius-md)] bg-ink px-4 text-sm text-white">{t.admin.overturn}</button>
          </ActionForm>
        ) : <p className="mt-2 text-xs text-muted-text">✓ {x.decision_note}</p>}
      </li>
    ));
  } else if (tab === 'legal') {
    const rows = (await appDb.query(`SELECT * FROM private.legal_requests ORDER BY (status IN ('open','in_review')) DESC, deadline_at ASC NULLS LAST LIMIT 100`)).rows;
    content = rows.map((x) => {
      const overdue = x.deadline_at && new Date(x.deadline_at) < new Date() && ['open', 'in_review'].includes(x.status);
      return (
        <li key={x.id} className={card}>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-mono text-xs">{x.reference_code}</span><Badge tone="accent">{t.legalRequest.kinds[x.kind as keyof typeof t.legalRequest.kinds]}</Badge><Badge tone={x.status === 'resolved' ? 'verified' : 'warning'}>{x.status}</Badge>
            {x.deadline_at && <Badge tone={overdue ? 'danger' : 'neutral'}>{t.admin.deadline}: {d(x.deadline_at)}</Badge>}
          </div>
          <p className="mt-2 text-sm"><span className="font-medium">{x.requester_name}</span>{x.requester_organization && ` · ${x.requester_organization}`} · {x.requester_email}</p>
          {x.legal_basis && <p className="mt-1 text-xs text-muted-text">{x.legal_basis}</p>}
          <p className="mt-2 whitespace-pre-line text-sm">{x.message}</p>
          {x.review_id && <Link href={`/admin/reviews/${x.review_id}`} className="mt-2 inline-block text-sm text-accent-text hover:underline">{t.admin.reviews} →</Link>}
          <ActionForm action={updateLegalRequestAction} className="mt-3 grid gap-2 md:grid-cols-[160px_160px_1fr_auto]">
            <input type="hidden" name="requestId" value={x.id} />
            <select name="status" defaultValue={x.status} className={inputCls}>{['open', 'in_review', 'resolved', 'declined'].map((s) => <option key={s}>{s}</option>)}</select>
            <input type="date" name="deadline" defaultValue={x.deadline_at ? d(x.deadline_at) : ''} className={inputCls} aria-label={t.admin.deadline} />
            <textarea name="note" rows={1} defaultValue={x.resolution_note ?? ''} placeholder={t.admin.reason} className={textareaCls} />
            <button className="h-10 rounded-[var(--radius-md)] bg-ink px-4 text-sm text-white">{t.common.save}</button>
          </ActionForm>
        </li>
      );
    });
  } else {
    const rows = (await appDb.query(`SELECT * FROM private.contact_messages ORDER BY created_at DESC LIMIT 100`)).rows;
    content = rows.map((x) => (
      <li key={x.id} className={card}>
        <div className="flex flex-wrap items-center gap-2 text-sm"><span className="font-mono text-xs">{x.reference_code}</span><Badge>{x.kind}</Badge><span className="text-xs text-muted-text">{d(x.created_at)} · {x.email ?? '—'}</span></div>
        <p className="mt-2 whitespace-pre-line text-sm">{x.message}</p>
        {x.page_url && <p className="mt-1 text-xs text-muted-text">{x.page_url}</p>}
      </li>
    ));
  }

  return (
    <>
      <AdminHeader title={t.admin.reports} />
      <Tabs current={tab} items={[
        { key: 'reports', href: '/admin/reports', label: t.reviews.report },
        { key: 'appeals', href: '/admin/reports?tab=appeals', label: t.footer.appeals },
        { key: 'legal', href: '/admin/reports?tab=legal', label: t.footer.legalRequests },
        { key: 'messages', href: '/admin/reports?tab=messages', label: t.footer.contact },
      ]} />
      <ul className="space-y-4">{content}</ul>
      {Array.isArray(content) && content.length === 0 && <p className="text-sm text-muted-text">{t.admin.noItems}</p>}
    </>
  );
}
