import { notFound } from 'next/navigation';
import { ActionForm } from '@/components/admin/action-form';
import { AdminHeader, Panel, inputCls } from '@/components/admin/ui';
import { OfficeForm } from '@/components/admin/office-form';
import { Badge, Notice } from '@/components/ui/primitives';
import { requireAdmin } from '@/lib/admin-guard';
import { adminDict } from '@/lib/admin-i18n';
import { appDb } from '@/lib/db';
import { addOfficeSourceAction, deleteOfficeSourceAction, officeStatusAction } from '@/lib/actions/admin';

export default async function EditOffice({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  await requireAdmin('offices');
  const { t } = await adminDict();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const office = (await appDb.query('SELECT * FROM public.offices WHERE id = $1', [id])).rows[0];
  if (!office) notFound();
  const tr = (await appDb.query('SELECT locale, name, address FROM public.office_translations WHERE office_id = $1', [id])).rows;
  const names = Object.fromEntries(tr.map((r) => [r.locale, { name: r.name, address: r.address }]));
  const sources = (await appDb.query('SELECT * FROM public.office_sources WHERE office_id = $1 ORDER BY created_at', [id])).rows;
  const history = (await appDb.query('SELECT change_type, created_at FROM private.office_updates WHERE office_id = $1 ORDER BY created_at DESC LIMIT 20', [id])).rows;
  const statusBtn = (op: string, label: string, danger = false) => (
    <ActionForm action={officeStatusAction}><input type="hidden" name="id" value={id} /><input type="hidden" name="op" value={op} /><button className={`h-9 rounded-[var(--radius-md)] px-3 text-sm ${danger ? 'border border-danger text-danger' : 'border border-line-strong'}`}>{label}</button></ActionForm>
  );
  return (
    <>
      <AdminHeader title={names.en?.name ?? office.slug}>
        <div className="flex gap-2"><Badge tone={office.data_status === 'verified' ? 'verified' : 'warning'}>{office.data_status}</Badge>{!office.is_active && <Badge>archived</Badge>}</div>
      </AdminHeader>
      {(await searchParams).created && <Notice tone="success" className="mb-6">{t.common.saved}</Notice>}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel><OfficeForm t={t} office={office} names={names} /></Panel>
        <div className="space-y-6">
          <Panel title={t.admin.actions}>
            <div className="flex flex-wrap gap-2">
              {statusBtn('verify', t.admin.markVerified)}
              {statusBtn('outdated', t.admin.markOutdated)}
              {office.is_active ? statusBtn('archive', t.admin.archive, true) : statusBtn('unarchive', t.admin.unarchive)}
            </div>
            <p className="mt-3 text-xs text-muted-text">Marking verified requires an official source with an access date.</p>
          </Panel>
          <Panel title={t.office.sources}>
            <ul className="space-y-3 text-sm">
              {sources.map((s) => (
                <li key={s.id} className="flex items-start justify-between gap-2">
                  <span><a href={s.url} target="_blank" rel="noopener noreferrer" className="text-accent-text hover:underline">{s.title}</a><span className="block text-xs text-muted-text">{s.source_type} · {s.accessed_at ? new Date(s.accessed_at).toISOString().slice(0, 10) : 'no access date'}</span></span>
                  <ActionForm action={deleteOfficeSourceAction}><input type="hidden" name="sourceId" value={s.id} /><button className="text-xs text-danger" aria-label={`${t.common.delete} ${s.title}`}>{t.common.delete}</button></ActionForm>
                </li>
              ))}
            </ul>
            <ActionForm action={addOfficeSourceAction} className="mt-4 space-y-2 border-t border-line pt-4" resetOnSuccess>
              <input type="hidden" name="officeId" value={id} />
              <input name="title" placeholder="Title" className={inputCls} />
              <input name="url" type="url" placeholder="https://" className={inputCls} />
              <div className="grid grid-cols-2 gap-2">
                <select name="sourceType" className={inputCls}><option value="official">official</option><option value="other">other</option></select>
                <input name="accessedAt" type="date" className={inputCls} aria-label="Accessed" />
              </div>
              <button className="h-9 rounded-[var(--radius-md)] bg-ink px-3 text-sm text-white">+ {t.office.sources}</button>
            </ActionForm>
          </Panel>
          <Panel title={t.admin.history}>
            <ul className="space-y-1 text-xs text-muted-text">{history.map((h, i) => <li key={i}>{new Date(h.created_at).toISOString().slice(0, 16)} · {h.change_type}</li>)}</ul>
          </Panel>
        </div>
      </div>
    </>
  );
}
