import Link from 'next/link';
import { AdminHeader, Table, Td } from '@/components/admin/ui';
import { Badge, buttonClass } from '@/components/ui/primitives';
import { requireAdmin } from '@/lib/admin-guard';
import { adminDict } from '@/lib/admin-i18n';
import { appDb } from '@/lib/db';

export default async function AdminOffices() {
  await requireAdmin('offices');
  const { t } = await adminDict();
  const rows = (await appDb.query(
    `SELECT o.id, o.slug, o.official_name_ko, o.office_type, o.data_status, o.last_verified_at, o.is_active, ten.name AS name_en,
            (SELECT count(*) FROM public.reviews r WHERE r.office_id = o.id AND r.status = 'approved')::int AS reviews
       FROM public.offices o LEFT JOIN public.office_translations ten ON ten.office_id = o.id AND ten.locale = 'en'
      ORDER BY o.is_active DESC, ten.name`)).rows;
  return (
    <>
      <AdminHeader title={t.admin.offices}><Link href="/admin/offices/new" className={buttonClass('primary', 'sm')}>{t.admin.newOffice}</Link></AdminHeader>
      <Table head={[t.office.breadcrumb, t.office.category, t.office.lastVerified, t.reviews.title, '']}>
        {rows.map((o) => (
          <tr key={o.id} className={o.is_active ? '' : 'opacity-60'}>
            <Td><span className="font-medium">{o.name_en}</span><span className="block text-xs text-muted-text" lang="ko">{o.official_name_ko}</span></Td>
            <Td>{t.officeTypes[o.office_type as keyof typeof t.officeTypes]}</Td>
            <Td><Badge tone={o.data_status === 'verified' ? 'verified' : 'warning'}>{o.data_status}</Badge> <span className="text-xs text-muted-text">{o.last_verified_at ? new Date(o.last_verified_at).toISOString().slice(0, 10) : ''}</span>{!o.is_active && <Badge>archived</Badge>}</Td>
            <Td className="tabular-nums">{o.reviews}</Td>
            <Td><Link href={`/admin/offices/${o.id}`} className="font-medium text-accent-text hover:underline">{t.common.edit}</Link></Td>
          </tr>
        ))}
      </Table>
    </>
  );
}
