import Link from 'next/link';
import { AdminHeader, Table, Tabs, Td } from '@/components/admin/ui';
import { requireAdmin } from '@/lib/admin-guard';
import { adminDict } from '@/lib/admin-i18n';
import { appDb } from '@/lib/db';

const STATUSES = ['submitted', 'approved', 'rejected', 'withdrawn'] as const;

export default async function AdminVerifications({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin('verifications');
  const { t } = await adminDict();
  const s = (await searchParams).status;
  const status = (STATUSES as readonly string[]).includes(s ?? '') ? s! : 'submitted';
  const rows = (await appDb.query(
    `SELECT v.id, v.method, v.status, v.created_at, v.retention_until, v.evidence_deleted_at,
            (SELECT count(*) FROM private.private_verification_files f WHERE f.verification_event_id = v.id AND f.deleted_at IS NULL)::int AS files,
            coalesce(tl.name, o.official_name_ko) AS office, r.visit_month
       FROM private.verification_events v JOIN public.reviews r ON r.id = v.review_id JOIN public.offices o ON o.id = r.office_id
       LEFT JOIN public.office_translations tl ON tl.office_id = o.id AND tl.locale = 'en'
      WHERE v.status = $1 ORDER BY v.created_at ASC LIMIT 200`, [status])).rows;
  return (
    <>
      <AdminHeader title={t.admin.verifications} />
      <Tabs current={status} items={STATUSES.map((k) => ({ key: k, href: `/admin/verifications?status=${k}`, label: t.verify.status[k] }))} />
      {rows.length === 0 ? <p className="text-sm text-muted-text">{t.admin.noItems}</p> : (
        <Table head={[t.office.breadcrumb, t.verify.title, t.admin.evidence, 'Retention', '']}>
          {rows.map((r) => (
            <tr key={r.id}>
              <Td><span className="font-medium">{r.office}</span><span className="block text-xs text-muted-text">{new Date(r.visit_month).toISOString().slice(0, 7)} · {new Date(r.created_at).toISOString().slice(0, 10)}</span></Td>
              <Td>{t.verify.methods[r.method as keyof typeof t.verify.methods]}</Td>
              <Td>{r.evidence_deleted_at ? 'deleted' : r.files}</Td>
              <Td className="text-xs">{new Date(r.retention_until).toISOString().slice(0, 10)}</Td>
              <Td><Link href={`/admin/verifications/${r.id}`} className="font-medium text-accent-text hover:underline">{t.common.view}</Link></Td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
